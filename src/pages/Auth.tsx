import { useState } from "react";
import { Navigate } from "react-router-dom";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "signup";

const humanizeAuthError = (message: string) => {
  if (/email not confirmed/i.test(message)) {
    return "Este projeto ainda esta exigindo confirmacao de email no Supabase. Desative Confirm Email em Authentication > Providers > Email.";
  }
  if (/invalid login credentials/i.test(message)) return "Email ou senha incorretos.";
  if (/user already registered/i.test(message)) return "Este email ja esta cadastrado. Faca login.";
  if (/rate limit/i.test(message)) return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  if (/pwned/i.test(message)) return "Esta senha foi encontrada em vazamentos de dados. Escolha outra mais forte.";
  return message;
};

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email.trim(), password);
        if (error) throw error;
        toast.success("Bem-vindo de volta.");
      } else {
        const { error, needsEmailConfirmation } = await signUp(email.trim(), password);
        if (error) throw error;

        if (needsEmailConfirmation) {
          toast.info("Conta criada. Confirme seu email para liberar o acesso ou desative Confirm Email no Supabase.");
          setMode("login");
          return;
        }

        const login = await signIn(email.trim(), password);
        if (login.error) throw login.error;
        toast.success("Conta criada. Acesso liberado.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      toast.error(humanizeAuthError(message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 glow-sm">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">VISTA Tasks Control</h1>
            <p className="font-mono-accent text-xs text-muted-foreground">Controle total em suas atividades e ideias</p>
          </div>
        </div>

        <Card className="border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">{mode === "login" ? "Entrar" : "Criar conta"}</CardTitle>
            <CardDescription>
              Use apenas email e senha. Nenhum codigo e solicitado no app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              <Button type="submit" className="w-full glow-sm" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <Alert className="mt-4">
              <AlertDescription className="text-xs">
                Para criar conta e entrar direto, desative Confirm Email em Authentication &gt; Providers &gt; Email no Supabase. Se a confirmacao estiver ativa, confirme o email antes de entrar.
              </AlertDescription>
            </Alert>

            <div className="mt-4 text-center text-sm">
              {mode === "login" ? (
                <p className="text-muted-foreground">
                  Nao tem conta?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-primary hover:underline">
                    Criar conta
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Ja tem conta?{" "}
                  <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline">
                    Entrar
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
