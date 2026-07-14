import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Check, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { isPaymentsConfigured } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

type PriceId = "pro_monthly" | "pro_yearly" | "pro_lifetime";

const FREE_FEATURES = [
  "Anotações e cadernos",
  "Tarefas e planejamento",
  "Links e checklists",
  "Backup básico",
  "Uso pessoal",
];

const PRO_FEATURES = [
  "Sincronização avançada",
  "IA para transformar anotação em tarefa",
  "Templates prontos",
  "Lembretes e recorrência",
  "Anexos e histórico de versões",
  "Exportações avançadas (PDF, JSON)",
  "Automações avançadas",
  "Suporte prioritário",
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
        body: { returnUrl: window.location.origin + "/planos", environment: getStripeEnvironment() },
      });
      if (error || !data?.url) throw new Error(error?.message || "Falha ao abrir portal");
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          {isPro && subscription?.price_id !== "pro_lifetime" && (
            <Button variant="outline" size="sm" onClick={openPortal} disabled={portalLoading}>
              {portalLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Gerenciar assinatura
            </Button>
          )}
        </div>

        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3 w-3" /> Planos VISTA Tasks
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Escolha o plano ideal</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Comece grátis. Faça upgrade quando quiser desbloquear IA, templates, recorrências e mais.
          </p>
          {isPro && (
            <Badge variant="outline" className="mt-4 border-success/40 bg-success/10 text-success">
              Você já é Pro
            </Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Free</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">R$ 0</span>
                <span className="text-sm text-muted-foreground">/sempre</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" disabled>
                Plano atual
              </Button>
            </CardContent>
          </Card>

          {PLANS.map((plan) => {
            const disabled = !isPaymentsConfigured() || isPro;
            return (
              <Card key={plan.id} className={`relative border-primary/40 ${plan.id === "pro_lifetime" ? "shadow-lg shadow-primary/10" : ""}`}>
                {plan.badge && (
                  <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground">{plan.badge}</Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.label}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    {PRO_FEATURES.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" disabled={disabled} onClick={() => setCheckoutPriceId(plan.id)}>
                    {isPro ? "Voc? j? ? Pro" : "Assinar"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Precisa de ajuda? <Link to="/" className="text-primary hover:underline">Voltar ao app</Link>
        </p>
      </div>

      <Dialog open={!!checkoutPriceId} onOpenChange={(o) => !o && setCheckoutPriceId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Finalizar assinatura</DialogTitle>
          </DialogHeader>
          {checkoutPriceId && (
            <StripeEmbeddedCheckout
              priceId={checkoutPriceId}
              customerEmail={user.email || undefined}
              userId={user.id}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;
