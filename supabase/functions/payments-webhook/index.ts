import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function resolvePriceId(price: any): string {
  if (price?.recurring?.interval === "month") return "pro_monthly";
  if (price?.recurring?.interval === "year") return "pro_yearly";
  return price?.lookup_key || price?.metadata?.lovable_external_id || price?.id || "pro_lifetime";
}

function resolveProductId(product: any): string {
  return typeof product === "string" ? product : product?.id || "unknown";
}

async function assertCheckoutIdentity(session: any): Promise<string> {
  const userId = session.client_reference_id || session.metadata?.userId;
  if (typeof userId !== "string" || !USER_ID_PATTERN.test(userId)) {
    throw new Error("Checkout is missing a valid VISTA user reference");
  }

  const checkoutEmail = session.customer_details?.email || session.customer_email;
  if (typeof checkoutEmail !== "string" || !checkoutEmail.trim()) {
    throw new Error("Checkout is missing the customer email");
  }

  const { data, error } = await getSupabase().auth.admin.getUserById(userId);
  const accountEmail = data.user?.email;
  if (error || !accountEmail) throw new Error("VISTA user was not found for this checkout");
  if (accountEmail.trim().toLowerCase() !== checkoutEmail.trim().toLowerCase()) {
    throw new Error("Checkout email does not match the VISTA account email");
  }

  return userId;
}

async function handleSubscriptionCreated(subscription: any, env: StripeEnv, checkoutUserId?: string) {
  const userId = checkoutUserId || subscription.metadata?.userId;
  if (!userId) return;
  const item = subscription.items?.data?.[0];
  const priceId = resolvePriceId(item?.price);
  const productId = resolveProductId(item?.price?.product);
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const { error } = await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw error;
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = resolvePriceId(item?.price);
  const productId = resolveProductId(item?.price?.product);
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  const { error } = await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
  if (error) throw error;
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const { error } = await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
  if (error) throw error;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const userId = await assertCheckoutIdentity(session);
  const stripe = createStripeClient(env);

  if (session.mode === "subscription") {
    const subscriptionId = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
    if (!subscriptionId) throw new Error("Checkout is missing its Stripe subscription");

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
    await handleSubscriptionCreated(subscription, env, userId);
    return;
  }

  // For one-time payments (lifetime), synthesize a subscription row so gating works uniformly.
  if (session.mode !== "payment" || !["paid", "no_payment_required"].includes(session.payment_status)) return;
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 1,
    expand: ["data.price"],
  });
  const priceObj: any = lineItems?.data?.[0]?.price;
  const productId = resolveProductId(priceObj?.product);

  const { error } = await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: `lifetime_${session.id}`,
      stripe_customer_id: session.customer || `guest_${session.id}`,
      product_id: productId,
      price_id: "pro_lifetime",
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;
  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object, env);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutCompleted(event.data.object, env);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
