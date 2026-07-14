import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useState } from "react";
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
  if (["active", "trialing"].includes(sub.status) && notExpired) return true;
  if (sub.status === "canceled" && sub.current_period_end && new Date(sub.current_period_end).getTime() > Date.now()) return true;
  return false;
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionState>;
const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

function useSubscriptionState() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [hasEntitlement, setHasEntitlement] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setHasEntitlement(false);
      setLoading(false);
      return;
    }

    const env = isPaymentsConfigured() ? getStripeEnvironment() : "sandbox";
    try {
      const [subscriptionResult, entitlementResult] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("environment", env)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.rpc("has_active_subscription", { user_uuid: user.id, check_env: env }),
      ]);

      if (subscriptionResult.error) throw subscriptionResult.error;
      if (entitlementResult.error) throw entitlementResult.error;
      setSubscription((subscriptionResult.data as SubscriptionRow | null) ?? null);
      setHasEntitlement(!!entitlementResult.data);
    } catch (error) {
      console.error("Failed to refresh subscription:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    if (!user) return;

    const channel = supabase
      .channel(`subscriptions-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, user]);

  const isActive = computeIsActive(subscription) || hasEntitlement;
  const isPro = hasEntitlement || (isActive && PRO_PRICE_IDS.has(subscription?.price_id || ""));
  const isLifetime = isPro && (!subscription || subscription.price_id === "pro_lifetime");
  const plan: "free" | "pro" = isPro ? "pro" : "free";

  return { subscription, loading, isActive, isPro, isLifetime, plan, refresh };
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const value = useSubscriptionState();
  return createElement(SubscriptionContext.Provider, { value }, children);
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within SubscriptionProvider");
  return context;
}
