import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

export type SubscriptionRow = {
  id: string;
  user_id: string;
  price_id: string;
  product_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
};

const PRO_PRICE_IDS = new Set(["pro_monthly", "pro_yearly", "pro_lifetime"]);

function computeIsActive(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  const notExpired = !sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now();
  if (["active", "trialing", "past_due"].includes(sub.status) && notExpired) return true;
  if (sub.status === "canceled" && sub.current_period_end && new Date(sub.current_period_end).getTime() > Date.now()) return true;
  return false;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    if (!isPaymentsConfigured()) {
      setLoading(false);
      return;
    }
    const env = getStripeEnvironment();
    let cancelled = false;

    const fetchSub = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setSubscription((data as SubscriptionRow | null) ?? null);
        setLoading(false);
      }
    };
    fetchSub();

    const channel = supabase
      .channel(`subscriptions-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => fetchSub(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isActive = computeIsActive(subscription);
  const isPro = isActive && PRO_PRICE_IDS.has(subscription?.price_id || "");
  const isLifetime = isPro && subscription?.price_id === "pro_lifetime";
  const plan: "free" | "pro" = isPro ? "pro" : "free";

  return { subscription, loading, isActive, isPro, isLifetime, plan };
}
