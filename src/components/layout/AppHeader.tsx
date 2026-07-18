import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, ClipboardList, Search } from "lucide-react";

interface AppHeaderProps {
  canGoBack: boolean;
  showSearch?: boolean;
  onBack: () => void;
  onOpenSearch?: () => void;
  onOpenSettings: () => void;
}

export function AppHeader({ canGoBack, showSearch = true, onBack, onOpenSearch, onOpenSettings }: AppHeaderProps) {
  return (
    <header
      className="z-20 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-2 backdrop-blur"
      style={{
        minHeight: "calc(3.5rem + env(safe-area-inset-top, 0px))",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="flex min-w-0 items-center gap-1">
        <SidebarTrigger
          className="h-10 w-auto max-w-[14rem] shrink-0 gap-2 px-2 md:hidden"
          title="Abrir menu do VISTA"
          aria-label="Abrir menu do VISTA"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
            <ClipboardList className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-semibold text-foreground">VISTA Tasks Control</span>
        </SidebarTrigger>

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
      </div>

      <div className="flex items-center gap-1">
        {showSearch && onOpenSearch && <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={onOpenSearch}
          title="Busca global"
          aria-label="Abrir busca global"
        >
          <Search className="h-4 w-4" />
        </Button>}
        <div className="hidden lg:block">
          <ProfileMenu onOpenSettings={onOpenSettings} />
        </div>
      </div>
    </header>
  );
}
