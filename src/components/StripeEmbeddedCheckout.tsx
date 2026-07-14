import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  priceId: string;
  quantity?: number;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({ priceId, quantity, returnUrl }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setClientSecret(null);
    setErrorMessage(null);

    const createSession = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionError || !sessionData.session) {
        setErrorMessage("Sua sessao expirou. Entre novamente para continuar com a assinatura.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, quantity, returnUrl, environment: getStripeEnvironment() },
      });
      if (!active) return;

      if (error || !data?.clientSecret) {
        let message = data?.error || error?.message || "Falha ao iniciar checkout";
        const context = (error as { context?: Response } | null)?.context;
        try {
          const payload = await context?.clone().json();
          if (payload?.error) message = payload.error;
        } catch {
          // Keep the SDK error when the response body is not JSON.
        }
        if (/unauthorized|jwt|refresh token/i.test(message)) {
          message = "Sua sessao expirou. Entre novamente para continuar com a assinatura.";
        }
        setErrorMessage(message);
        return;
      }

      setClientSecret(data.clientSecret);
    };

    void createSession();
    return () => { active = false; };
  }, [attempt, priceId, quantity, returnUrl]);

  if (errorMessage) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 rounded-md border border-destructive/30 bg-destructive/5 px-5 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </span>
        <div>
          <p className="font-medium text-foreground">Não foi possível abrir o pagamento.</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{errorMessage}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setAttempt((value) => value + 1)}>
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Preparando pagamento seguro...
      </div>
    );
  }

  return (
    <div id="checkout" className="min-h-[540px] overflow-hidden rounded-md bg-background">
      <EmbeddedCheckoutProvider key={`${priceId}-${attempt}`} stripe={getStripe()} options={{ clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
