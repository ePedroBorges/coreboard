import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider, PRO_THEME_VARIANTS, useTheme } from "@/hooks/useTheme";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Pricing = lazy(() => import("./pages/Pricing"));
const CheckoutReturn = lazy(() => import("./pages/CheckoutReturn"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Course = lazy(() => import("./pages/Course"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Carregando" />
  </div>
);

function ProThemeGuard() {
  const { isPro, loading } = useSubscription();
  const { variant, setVariant } = useTheme();

  useEffect(() => {
    if (!loading && !isPro && PRO_THEME_VARIANTS.includes(variant)) setVariant("default");
  }, [isPro, loading, setVariant, variant]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const App = () => {
  const runsFromLocalPackage = window.location.protocol === "file:";
  const Router = Capacitor.isNativePlatform() || runsFromLocalPackage ? HashRouter : BrowserRouter;

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("Ocorreu um erro. Tente novamente.");
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <ProThemeGuard />
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <Router>
              <Suspense fallback={<RouteLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/hoje" element={<Index />} />
                  <Route path="/anotacoes" element={<Index />} />
                  <Route path="/tarefas" element={<Index />} />
                  <Route path="/configuracoes" element={<Index />} />
                  <Route path="/planos" element={<Pricing />} />
                  <Route path="/checkout/return" element={<CheckoutReturn />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/conquistas" element={<Achievements />} />
                  <Route path="/curso" element={<Course />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Router>
            </TooltipProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
