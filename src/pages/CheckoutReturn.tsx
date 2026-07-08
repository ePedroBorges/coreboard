import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const CheckoutReturn = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <h1 className="text-2xl font-bold">Pagamento concluído!</h1>
        <p className="text-sm text-muted-foreground">
          {sessionId
            ? "Sua assinatura está sendo ativada. Você já pode voltar e usar todos os recursos Pro."
            : "Obrigado! Retorne ao app para continuar."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to="/">Ir para o app</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/planos">Ver plano</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutReturn;
