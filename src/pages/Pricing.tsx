import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { getPaymentsReturnBaseUrl, getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PriceId = "pro_monthly" | "pro_yearly" | "pro_lifetime";

const FREE_FEATURES = [
  "Anotações e cadernos",
  "Tarefas e planejamento",
  "Links e checklists",
  "Busca global",
  "Backup JSON básico",
];

const PRO_FEATURES = [
  "4 temas premium",
  "Lembretes locais de tarefas",
  "Anexos de PDF e imagem",
  "Exportação e compartilhamento em PDF",
  "Acesso aos próximos recursos Pro",
];

const PLANS: { id: PriceId; label: string; price: string; period: string; badge?: string }[] = [
  { id: "pro_monthly", label: "Pro Mensal", price: "R$ 9,90", period: "/mês" },
  { id: "pro_yearly", label: "Pro Anual", price: "R$ 89,90", period: "/ano", badge: "Economize 25%" },
  { id: "pro_lifetime", label: "Pro Vitalício", price: "R$ 79,90", period: "único", badge: "Melhor oferta" },
];

const Pricing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isPro, subscription } = useSubscription();
  const [checkoutPriceId, setCheckoutPriceId] = useState<PriceId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const openPortal = async () => {
    if (!subscription) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { returnUrl: getPaymentsReturnBaseUrl() + "/planos", environment: getStripeEnvironment() },
      });
      if (error || !data?.url) throw new Error(error?.message || "Falha ao abrir portal");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao abrir portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-10">
        <div className="mb-7 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          {isPro && subscription?.price_id !== "pro_lifetime" && subscription && (
            <Button variant="outline" size="sm" onClick={openPortal} disabled={portalLoading}>
              {portalLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Gerenciar assinatura
            </Button>
          )}
        </div>

        <div className="mb-8 max-w-2xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" /> Planos VISTA Tasks Control
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Escolha como quer evoluir</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            O plano gratuito mantém sua rotina essencial. O Pro libera personalização, anexos, lembretes e exportações avançadas.
          </p>
          {isPro && (
            <Badge variant="outline" className="mt-4 border-success/40 bg-success/10 text-success">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Seu acesso Pro está ativo
            </Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <PlanCard title="Free" price="R$ 0" period="/sempre" features={FREE_FEATURES}>
            <Button variant="outline" className="w-full" disabled>Plano inicial</Button>
          </PlanCard>

          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              title={plan.label}
              price={plan.price}
              period={plan.period}
              badge={plan.badge}
              featured={plan.id === "pro_lifetime"}
              features={PRO_FEATURES}
            >
              <Button
                className="w-full gap-2"
                disabled={!isPaymentsConfigured() || isPro}
                onClick={() => setCheckoutPriceId(plan.id)}
              >
                {isPro ? <ShieldCheck className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                {isPro ? "Pro ativo" : "Assinar com Stripe"}
              </Button>
            </PlanCard>
          ))}
        </div>

        <p className="mt-7 text-center text-xs text-muted-foreground">
          Pagamento seguro pelo Stripe. <Link to="/" className="text-primary hover:underline">Voltar ao app</Link>
        </p>
      </div>

      <Dialog open={!!checkoutPriceId} onOpenChange={(open) => !open && setCheckoutPriceId(null)}>
        <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto p-3 sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>Finalizar assinatura</DialogTitle>
            <DialogDescription>
              Pagamento processado com segurança pelo Stripe. Nenhum dado de cartão fica armazenado no VISTA.
            </DialogDescription>
          </DialogHeader>
          {checkoutPriceId && (
            <StripeEmbeddedCheckout
              priceId={checkoutPriceId}
              returnUrl={`${getPaymentsReturnBaseUrl()}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          )}
        </DialogContent>
      </Dialog>
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
    <Card className={`relative bg-card/75 transition-colors hover:border-primary/55 ${featured ? "border-primary/55 shadow-lg shadow-primary/10" : "border-border/60"}`}>
      {badge && <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground">{badge}</Badge>}
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{price}</span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-5">
        <ul className="flex-1 space-y-2 text-sm">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
