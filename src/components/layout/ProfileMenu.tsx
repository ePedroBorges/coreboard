import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { BarChart3, GraduationCap, LogOut, Settings, Sparkles, Trophy, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

interface ProfileMenuProps {
  onOpenSettings: () => void;
  mobileNav?: boolean;
  sidebar?: boolean;
  collapsed?: boolean;
}

export function ProfileMenu({ onOpenSettings, mobileNav = false, sidebar = false, collapsed = false }: ProfileMenuProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initials = user?.email?.slice(0, 2).toUpperCase() || "?";
  const profileSectionActive = ["/dashboard", "/configuracoes", "/planos", "/conquistas", "/curso"].includes(location.pathname);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {mobileNav ? (
          <button
            type="button"
            aria-label="Abrir perfil"
            aria-current={profileSectionActive ? "page" : undefined}
            title="Perfil"
            className={cn(
              "flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded text-[10px] font-medium transition-colors",
              profileSectionActive
                ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <UserRound className={cn("h-4 w-4 shrink-0", profileSectionActive && "text-primary")} />
            <span className="max-w-full truncate">Perfil</span>
          </button>
        ) : sidebar ? (
          <button type="button" className={cn("flex h-10 w-full items-center gap-2 rounded px-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent", collapsed && "w-10 justify-center px-0")} title="Perfil e configurações" aria-label="Abrir perfil e configurações">
            <Avatar className="h-7 w-7 shrink-0 rounded-md">
              <AvatarFallback className="rounded-md bg-primary/10 text-xs text-primary">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">Perfil</span><span className="block truncate text-[10px] text-muted-foreground">{user?.email}</span></span>}
          </button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Perfil" aria-label="Abrir perfil">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={sidebar ? "start" : "end"} side={mobileNav ? "top" : sidebar ? "right" : "bottom"} sideOffset={8} className="w-60">
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
        <DropdownMenuItem onClick={() => navigate("/conquistas")}>
          <Trophy className="mr-2 h-4 w-4" />
          Níveis e conquistas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/curso")}>
          <GraduationCap className="mr-2 h-4 w-4" />
          Aprenda a usar
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
