import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { buildPaymentLinkUrl, type PaymentPlanId } from "@/lib/paymentLinks";
import { getPaymentsReturnUrl, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FREE_FEATURES = [
  "Anotações e pastas",
  "Tarefas e planejamento",
  "Links e checklists",
  "Busca global",
  "Backup JSON básico",
];

const PRO_FEATURES = [
  "Biblioteca completa de temas premium",
  "RGB dinâmico, efeitos luminosos e sons Arcade",
  "Lembretes locais de tarefas",
  "Anexos de PDF e imagem",
  "Exportação e compartilhamento em PDF",
  "Todos os próximos recursos Pro",
];

const PLANS: { id: PaymentPlanId; label: string; price: string; period: string; badge?: string }[] = [
  { id: "pro_monthly", label: "Pro Mensal", price: "R$ 9,90", period: "/mês" },
  { id: "pro_yearly", label: "Pro Anual", price: "R$ 69,90", period: "/ano", badge: "Economize 41%" },
  { id: "pro_lifetime", label: "Pro Vitalício", price: "R$ 89,90", period: "único", badge: "Pagamento único" },
];

const Pricing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isPro, subscription } = useSubscription();
  const [checkoutPriceId, setCheckoutPriceId] = useState<PaymentPlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const activePlanId = subscription?.price_id || (isPro && !subscription ? "pro_lifetime" : null);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const openPortal = async () => {
    if (!subscription) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { returnUrl: getPaymentsReturnUrl("/planos"), environment: getStripeEnvironment() },
      });
      if (error || !data?.url) throw new Error(error?.message || "Falha ao abrir portal");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao abrir portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const startCheckout = (priceId: PaymentPlanId) => {
    setCheckoutPriceId(priceId);
    try {
      window.location.assign(buildPaymentLinkUrl(priceId, user.id, user.email || ""));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao abrir pagamento");
      setCheckoutPriceId(null);
    }
  };

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-y-contain bg-background">
      <PaymentTestModeBanner />
      <div className="mx-auto w-full max-w-7xl px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-6">
        <div className="mb-4 flex min-h-9 items-center justify-end gap-3 lg:justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hidden h-9 w-9 lg:inline-flex" title="Voltar" aria-label="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {isPro && subscription?.price_id !== "pro_lifetime" && subscription && (
            <Button variant="outline" size="sm" onClick={openPortal} disabled={portalLoading}>
              {portalLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Gerenciar assinatura
            </Button>
          )}
        </div>

        <div className="mb-5 max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" /> Planos CoreBoard
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">Escolha como quer evoluir</h1>
          {isPro && (
            <Badge variant="outline" className="mt-4 border-success/40 bg-success/10 text-success">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Seu acesso Pro está ativo
            </Badge>
          )}
        </div>

        {!isPro && (
          <div className="mb-4 flex items-start gap-2 border-l-2 border-primary/60 bg-primary/5 px-3 py-2 text-xs text-muted-foreground sm:text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              O plano será vinculado à conta <strong className="font-medium text-foreground">{user.email}</strong>.
              Use este mesmo e-mail durante toda a assinatura.
            </span>
          </div>
        )}

        <div className="grid items-stretch gap-3 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              title={plan.label}
              price={plan.price}
              period={plan.period}
              badge={plan.badge}
              featured={plan.id === "pro_yearly"}
              features={PRO_FEATURES}
            >
              <Button
                className="w-full gap-2"
                disabled={isPro || checkoutPriceId !== null}
                onClick={() => startCheckout(plan.id)}
              >
                {checkoutPriceId === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPro ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {isPro
                  ? activePlanId === plan.id ? "Seu plano" : "Incluído no seu Pro"
                  : checkoutPriceId === plan.id
                    ? "Abrindo pagamento..."
                    : plan.id === "pro_lifetime"
                      ? "Comprar acesso vitalício"
                      : "Assinar com Stripe"}
              </Button>
            </PlanCard>
          ))}
        </div>

        <section className="mt-4 grid gap-4 rounded-lg border border-border/60 bg-card/45 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <div className="flex items-baseline gap-2"><h2 className="text-sm font-semibold">Plano Free</h2><span className="text-sm text-muted-foreground">R$ 0 para sempre</span></div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {FREE_FEATURES.map((feature) => <span key={feature} className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" />{feature}</span>)}
            </div>
          </div>
          <Badge variant="outline" className="w-fit">Essencial completo</Badge>
        </section>

        <p className="mt-5 text-center text-xs text-muted-foreground">Pagamento seguro pelo Stripe e vinculado ao e-mail da sua conta.</p>
      </div>

    </div>
  );
};

function PlanCard({
  title,
  price,
  period,
  features,
  badge,
  featured,
  children,
}: {
  title: string;
  price: string;
  period: string;
  features: string[];
  badge?: string;
  featured?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={`relative flex min-h-0 flex-col bg-card/75 transition-colors hover:border-primary/55 ${featured ? "border-primary/55 shadow-md shadow-primary/10" : "border-border/60"}`}>
      {badge && <Badge className="absolute right-3 top-3 max-w-[55%] truncate bg-primary text-primary-foreground">{badge}</Badge>}
      <CardHeader className="p-4 pb-3">
        <CardTitle className={`text-base ${badge ? "pr-28" : ""}`}>{title}</CardTitle>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{price}</span>
          <span className="text-xs text-muted-foreground">{period}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ul className="flex-1 space-y-1.5 text-xs sm:text-sm">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {children}
      </CardContent>
    </Card>
  );
}

export default Pricing;
