import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarDays, ClipboardList, FileText, Home, PanelLeftClose, Star } from "lucide-react";
import { Notebook, Page } from "@/types/notes";
import { getNoteTitle } from "@/lib/noteUtils";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  notebooks: Notebook[];
  favorites: Page[];
  activeView: "today" | "tasks" | "calendar" | "notes" | "diary";
  sidebarPinned: boolean;
  selectedPageId: string | null;
  onToggleSidebarPinned: () => void;
  onMouseLeave: () => void;
  onSelectToday?: () => void;
  onSelectNotes?: () => void;
  onSelectCalendar?: () => void;
  onSelectNotebook: (id: string) => void;
  onSelectPage: (id: string) => void;
}

export function AppSidebar({
  notebooks,
  favorites,
  activeView,
  sidebarPinned,
  selectedPageId,
  onToggleSidebarPinned,
  onMouseLeave,
  onSelectToday,
  onSelectNotes,
  onSelectCalendar,
  onSelectNotebook,
  onSelectPage,
}: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const notebookTitleById = new Map(notebooks.map((notebook) => [notebook.id, notebook.title]));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border shadow-xl md:shadow-none" onMouseLeave={onMouseLeave}>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10 sm:h-8 sm:w-8">
            <ClipboardList className="h-5 w-5 text-primary sm:h-4 sm:w-4" />
          </div>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:text-sm">
                VISTA Task Control
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onToggleSidebarPinned}
                title={sidebarPinned ? "Ocultar menu" : "Mostrar menu"}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono-accent text-[10px] uppercase tracking-wider text-muted-foreground">
            {!collapsed && "Navegação"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem
                active={activeView === "today"}
                icon={Home}
                label="Hoje"
                onClick={onSelectToday}
                collapsed={collapsed}
              />
              <NavItem
                active={activeView === "notes" || activeView === "diary"}
                icon={BookOpen}
                label="Caderno"
                onClick={onSelectNotes}
                collapsed={collapsed}
              />
              <NavItem
                active={activeView === "calendar" || activeView === "tasks"}
                icon={CalendarDays}
                label="Calendário"
                onClick={onSelectCalendar}
                collapsed={collapsed}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {favorites.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono-accent text-[10px] uppercase tracking-wider text-muted-foreground">
              <Star className="mr-1 h-3 w-3" />
              {!collapsed && "Fixados"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {favorites.map((page) => (
                  <SidebarMenuItem key={page.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        onSelectNotebook(page.notebook_id);
                        onSelectPage(page.id);
                      }}
                      className={cn(
                        "min-h-[44px] items-start gap-2 text-sm sm:min-h-0 sm:text-xs",
                        selectedPageId === page.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-warning sm:h-3.5 sm:w-3.5" />
                      {!collapsed && (
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{getNoteTitle(page)}</span>
                          <span className="mt-1 flex min-w-0 items-center gap-1">
                            <Badge variant="outline" className="h-5 rounded px-1.5 text-[10px]">
                              Página
                            </Badge>
                            <span className="truncate text-[10px] text-muted-foreground">
                              {notebookTitleById.get(page.notebook_id) || "Caderno"}
                            </span>
                          </span>
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        {!collapsed && (
          <div className="text-center font-mono-accent text-[9px] text-muted-foreground/50">
            VISTA Task Control v1.0
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function NavItem({
  active,
  icon: Icon,
  label,
  onClick,
  collapsed,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  collapsed: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={onClick}
        className={cn(
          "min-h-[44px] text-sm sm:min-h-0 sm:text-xs",
          active && "bg-sidebar-accent text-sidebar-accent-foreground"
        )}
      >
        <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        {!collapsed && <span>{label}</span>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
