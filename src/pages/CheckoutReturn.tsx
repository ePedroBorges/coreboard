import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

const CheckoutReturn = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { isPro, loading, refresh } = useSubscription();

  useEffect(() => {
    if (!sessionId || isPro) return;
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      void refresh();
      if (attempts >= 12) window.clearInterval(interval);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [isPro, refresh, sessionId]);

  const title = isPro
    ? "Acesso Pro ativado"
    : sessionId
      ? "Confirmando seu pagamento"
      : "Retorno do pagamento";

  const description = isPro
    ? "Seu plano está ativo e os recursos Pro já foram liberados nesta conta."
    : sessionId
      ? "O Stripe está processando a confirmação. Esta tela será atualizada automaticamente."
      : "Não encontramos uma sessão de pagamento para confirmar. Volte aos planos e tente novamente.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${isPro ? "bg-success/15" : "bg-primary/10"}`}>
          {loading ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          ) : isPro ? (
            <CheckCircle2 className="h-7 w-7 text-success" />
          ) : (
            <Clock3 className="h-7 w-7 text-primary" />
          )}
        </div>
        <h1 className="text-2xl font-bold">{loading ? "Verificando seu plano" : title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {isPro && (
            <Button asChild>
              <Link to="/">Ir para o app</Link>
            </Button>
          )}
          {!isPro && sessionId && (
            <Button onClick={() => void refresh()} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar novamente
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/planos">Voltar aos planos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutReturn;
