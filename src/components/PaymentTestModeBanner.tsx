const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
        Pagamentos em produção ainda não configurados. Complete o go-live para aceitar pagamentos reais.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-warning/40 bg-warning/10 px-4 py-2 text-center text-xs text-warning-foreground">
        Todos os pagamentos no preview estão em modo de teste.
      </div>
    );
  }
  return null;
}
