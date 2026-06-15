import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  LogOut,
  BarChart3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useLocation } from "react-router-dom";

interface AppHeaderProps {
  onToggleFocus: () => void;
  focusMode: boolean;
}

export function AppHeader({ onToggleFocus, focusMode }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <header className="h-14 sm:h-12 flex items-center justify-between border-b border-border px-3 sm:px-2 shrink-0">
      <div className="flex items-center gap-2 sm:gap-1">
        <SidebarTrigger className="h-10 w-10 sm:h-8 sm:w-8" />
      </div>

      <div className="flex items-center gap-2 sm:gap-1">
        <Button
          variant={location.pathname === "/dashboard" ? "secondary" : "ghost"}
          size="icon"
          className="h-10 w-10 sm:h-8 sm:w-8"
          onClick={() => navigate(location.pathname === "/dashboard" ? "/" : "/dashboard")}
          title="Dashboard"
        >
          <BarChart3 className="h-5 w-5 sm:h-4 sm:w-4" />
        </Button>
        <Button
          variant={focusMode ? "secondary" : "ghost"}
          size="icon"
          className="h-10 w-10 sm:h-8 sm:w-8"
          onClick={onToggleFocus}
          title={focusMode ? "Sair do modo foco" : "Modo foco (Ctrl+Shift+F)"}
        >
          {focusMode ? (
            <Minimize2 className="h-5 w-5 sm:h-4 sm:w-4" />
          ) : (
            <Maximize2 className="h-5 w-5 sm:h-4 sm:w-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-5 w-5 sm:h-4 sm:w-4" /> : <Moon className="h-5 w-5 sm:h-4 sm:w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8">
              <Avatar className="h-8 w-8 sm:h-6 sm:w-6">
                <AvatarFallback className="text-xs sm:text-[10px] bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="font-mono-accent text-xs text-muted-foreground" disabled>
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
