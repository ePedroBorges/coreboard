import { useAuth } from "@/hooks/useAuth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, ClipboardList, LogOut, Settings, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  canGoBack: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
}

export function AppHeader({ canGoBack, onBack, onOpenSettings }: AppHeaderProps) {
  return (
    <>
      <header
        className="z-20 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-2 backdrop-blur"
        style={{
          minHeight: "calc(3.5rem + env(safe-area-inset-top, 0px))",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="flex min-w-0 items-center gap-1">
          <SidebarTrigger className="h-10 w-10 shrink-0 lg:h-8 lg:w-8" title="Menu" />
          {canGoBack && (
            <Button
              variant="ghost"
              className="h-10 shrink-0 gap-2 px-2 lg:h-8"
              onClick={onBack}
              title="Voltar"
            >
              <ArrowLeft className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="hidden text-sm sm:inline">Voltar</span>
            </Button>
          )}
          <div className="ml-1 flex min-w-0 items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
              <ClipboardList className="h-4 w-4" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground">VISTA Tasks Control</span>
          </div>
        </div>

        <div className="hidden lg:block">
          <ProfileMenu onOpenSettings={onOpenSettings} />
        </div>
      </header>

      <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-3 z-50 lg:hidden">
        <ProfileMenu mobile onOpenSettings={onOpenSettings} />
      </div>
    </>
  );
}

function ProfileMenu({ mobile = false, onOpenSettings }: { mobile?: boolean; onOpenSettings: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initials = user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={mobile ? "secondary" : "ghost"}
          size="icon"
          className={cn(
            "shrink-0",
            mobile
              ? "h-12 w-12 rounded-full border border-primary/35 bg-background shadow-lg shadow-black/30"
              : "h-8 w-8",
          )}
          title="Perfil"
          aria-label="Abrir perfil"
        >
          <Avatar className={mobile ? "h-9 w-9" : "h-6 w-6"}>
            <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={mobile ? "top" : "bottom"} sideOffset={8} className="w-60">
        <DropdownMenuItem className="font-mono-accent text-xs text-muted-foreground" disabled>
          <span className="truncate">{user?.email}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(location.pathname === "/dashboard" && "bg-accent text-accent-foreground")}
          onClick={() => navigate("/dashboard")}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Indicadores
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/planos")}>
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          Planos e assinatura
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
