export type PaymentPlanId = "pro_monthly" | "pro_yearly" | "pro_lifetime";

const PAYMENT_LINKS: Record<PaymentPlanId, string> = {
  pro_monthly: "https://buy.stripe.com/00wdR810cdOYfwC0sl0co00",
  pro_yearly: "https://buy.stripe.com/4gM00i5gs3ak5W22At0co01",
  pro_lifetime: "https://buy.stripe.com/00w6oGfV6dOY1FMejb0co02",
};

export function buildPaymentLinkUrl(planId: PaymentPlanId, userId: string, email: string): string {
  if (!userId || !email) throw new Error("Sua conta precisa ter um e-mail valido para assinar.");

  const url = new URL(PAYMENT_LINKS[planId]);
  url.searchParams.set("client_reference_id", userId);
  url.searchParams.set("locked_prefilled_email", email.trim().toLowerCase());
  url.searchParams.set("locale", "pt-BR");
  return url.toString();
}

