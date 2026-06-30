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
import { BookOpen, CalendarDays, ClipboardList, FileText, Home, ListChecks, NotebookPen, PanelLeftClose, Star } from "lucide-react";
import { Notebook, Page } from "@/types/notes";
import { WeeklyTask } from "@/hooks/useWeeklyTasks";
import { getNoteTitle } from "@/lib/noteUtils";
import { cn } from "@/lib/utils";

type AppView = "today" | "tasks" | "calendar" | "notes" | "diary";

interface AppSidebarProps {
  notebooks: Notebook[];
  pinnedNotebooks: Notebook[];
  pinnedTasks: WeeklyTask[];
  favoritePages: Page[];
  activeView: AppView;
  sidebarPinned: boolean;
  selectedPageId: string | null;
  onToggleSidebarPinned: () => void;
  onMouseLeave: () => void;
  onSelectToday?: () => void;
  onSelectNotes?: () => void;
  onSelectCalendar?: () => void;
  onOpenNotebook: (id: string) => void;
  onOpenPage: (page: Page) => void;
  onSelectTasks: () => void;
}

export function AppSidebar({
  notebooks,
  pinnedNotebooks,
  pinnedTasks,
  favoritePages,
  activeView,
  sidebarPinned,
  selectedPageId,
  onToggleSidebarPinned,
  onMouseLeave,
  onSelectToday,
  onSelectNotes,
  onSelectCalendar,
  onOpenNotebook,
  onOpenPage,
  onSelectTasks,
}: AppSidebarProps) {
  const { isMobile, state, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";

  const notebookTitleById = new Map(notebooks.map((notebook) => [notebook.id, notebook.title]));
  const hasPinnedItems = pinnedNotebooks.length > 0 || pinnedTasks.length > 0 || favoritePages.length > 0;

  return (
    <>
      <MobileSidebarRail
        activeView={activeView}
        hasPinnedItems={hasPinnedItems}
        onOpenMenu={() => setOpenMobile(true)}
        onSelectToday={onSelectToday}
        onSelectNotes={onSelectNotes}
        onSelectCalendar={onSelectCalendar}
      />

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
                  title={sidebarPinned ? "Ocultar textos" : "Mostrar textos"}
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
                <NavItem active={activeView === "today"} icon={Home} label="Hoje" onClick={onSelectToday} collapsed={collapsed} />
                <NavItem active={activeView === "notes" || activeView === "diary"} icon={BookOpen} label="Caderno" onClick={onSelectNotes} collapsed={collapsed} />
                <NavItem active={activeView === "calendar" || activeView === "tasks"} icon={CalendarDays} label="Calendário" onClick={onSelectCalendar} collapsed={collapsed} />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {hasPinnedItems && (
            <SidebarGroup>
              <SidebarGroupLabel className="font-mono-accent text-[10px] uppercase tracking-wider text-muted-foreground">
                <Star className="mr-1 h-3 w-3" />
                {!collapsed && "Fixados"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {pinnedNotebooks.map((notebook) => (
                    <SidebarMenuItem key={`notebook-${notebook.id}`}>
                      <SidebarMenuButton onClick={() => onOpenNotebook(notebook.id)} className="min-h-[44px] items-start gap-2 text-sm sm:min-h-0 sm:text-xs">
                        <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:h-3.5 sm:w-3.5" />
                        {!collapsed && (
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{notebook.title}</span>
                            <span className="mt-1 flex min-w-0 items-center gap-1">
                              <Badge variant="outline" className="h-5 rounded px-1.5 text-[10px]">
                                Caderno
                              </Badge>
                              <span className="truncate text-[10px] text-muted-foreground">
                                {notebook.page_count || 0} {(notebook.page_count || 0) === 1 ? "página" : "páginas"}
                              </span>
                            </span>
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {pinnedTasks.map((task) => (
                    <SidebarMenuItem key={`task-${task.id}`}>
                      <SidebarMenuButton
                        onClick={onSelectTasks}
                        className={cn(
                          "min-h-[44px] items-start gap-2 text-sm sm:min-h-0 sm:text-xs",
                          activeView === "tasks" && "bg-sidebar-accent text-sidebar-accent-foreground"
                        )}
                      >
                        <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-success sm:h-3.5 sm:w-3.5" />
                        {!collapsed && (
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{task.title}</span>
                            <span className="mt-1 flex min-w-0 items-center gap-1">
                              <Badge variant="outline" className="h-5 rounded px-1.5 text-[10px]">
                                Tarefa
                              </Badge>
                              <span className="truncate text-[10px] text-muted-foreground">
                                {task.status === "completed" ? "Concluída" : "Pendente"}
                              </span>
                            </span>
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {favoritePages.map((page) => (
                    <SidebarMenuItem key={`page-${page.id}`}>
                      <SidebarMenuButton
                        onClick={() => onOpenPage(page)}
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
    </>
  );
}

function MobileSidebarRail({
  activeView,
  hasPinnedItems,
  onOpenMenu,
  onSelectToday,
  onSelectNotes,
  onSelectCalendar,
}: {
  activeView: AppView;
  hasPinnedItems: boolean;
  onOpenMenu: () => void;
  onSelectToday?: () => void;
  onSelectNotes?: () => void;
  onSelectCalendar?: () => void;
}) {
  const handleTap = (action?: () => void) => {
    action?.();
    onOpenMenu();
  };

  return (
    <nav className="fixed left-2 top-16 z-30 flex w-11 flex-col items-center gap-1 rounded-md border border-sidebar-border bg-sidebar/95 p-1 text-sidebar-foreground shadow-lg backdrop-blur md:hidden">
      <MobileRailButton active={activeView === "today"} icon={Home} label="Hoje" onClick={() => handleTap(onSelectToday)} />
      <MobileRailButton active={activeView === "notes" || activeView === "diary"} icon={BookOpen} label="Caderno" onClick={() => handleTap(onSelectNotes)} />
      <MobileRailButton active={activeView === "calendar" || activeView === "tasks"} icon={CalendarDays} label="Calendário" onClick={() => handleTap(onSelectCalendar)} />
      {hasPinnedItems && <MobileRailButton active={false} icon={Star} label="Fixados" onClick={onOpenMenu} />}
    </nav>
  );
}

function MobileRailButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active && "bg-sidebar-accent text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
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
