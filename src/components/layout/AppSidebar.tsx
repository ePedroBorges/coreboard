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
import { BookOpen, ClipboardList, FileText, Home, ListChecks, NotebookPen, Search, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Notebook, Page } from "@/types/notes";
import { WeeklyTask } from "@/hooks/useWeeklyTasks";
import { getNoteTitle } from "@/lib/noteUtils";
import { cn } from "@/lib/utils";
import { ProfileMenu } from "@/components/layout/ProfileMenu";

type AppView = "today" | "tasks" | "calendar" | "notes" | "diary" | "settings";

interface AppSidebarProps {
  notebooks: Notebook[];
  pinnedNotebooks: Notebook[];
  pinnedTasks: WeeklyTask[];
  favoritePages: Page[];
  activeView: AppView;
  selectedPageId: string | null;
  onToggleSidebarPinned: () => void;
  onMouseLeave: () => void;
  onSelectToday?: () => void;
  onSelectNotes?: () => void;
  onOpenNotebook: (id: string) => void;
  onOpenPage: (page: Page) => void;
  onOpenTask?: (task: WeeklyTask) => void;
  onOpenSearch?: () => void;
  onSelectTasks: () => void;
  onOpenSettings: () => void;
}

export function AppSidebar({
  notebooks,
  pinnedNotebooks,
  pinnedTasks,
  favoritePages,
  activeView,
  selectedPageId,
  onToggleSidebarPinned,
  onMouseLeave,
  onSelectToday,
  onSelectNotes,
  onOpenNotebook,
  onOpenPage,
  onOpenTask,
  onOpenSearch,
  onSelectTasks,
  onOpenSettings,
}: AppSidebarProps) {
  const { isMobile, state, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";

  const notebookTitleById = new Map(notebooks.map((notebook) => [notebook.id, notebook.title]));
  const hasPinnedItems = pinnedNotebooks.length > 0 || pinnedTasks.length > 0 || favoritePages.length > 0;
  const runAndClose = (action?: () => void) => {
    action?.();
    if (isMobile) setOpenMobile(false);
  };

  return (
    <>
      <MobileBottomNavigation
        activeView={activeView}
        onSelectToday={() => runAndClose(onSelectToday)}
        onSelectNotes={() => runAndClose(onSelectNotes)}
        onSelectTasks={() => runAndClose(onSelectTasks)}
        onOpenSettings={onOpenSettings}
      />

      <Sidebar collapsible="icon" className="border-r border-sidebar-border/80 shadow-xl md:shadow-none" onMouseLeave={onMouseLeave}>
        <SidebarHeader className={cn("border-b border-sidebar-border/70", collapsed ? "p-2" : "p-3")}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (isMobile ? setOpenMobile(false) : onToggleSidebarPinned())}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              title={collapsed ? "Expandir menu" : "Recolher menu"}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              <ClipboardList className="h-5 w-5 text-primary sm:h-4 sm:w-4" />
            </button>
            {!collapsed && (
              <span className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:text-sm">
                VISTA Tasks Control
              </span>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className={collapsed ? "px-2 py-3" : undefined}>
            {!collapsed && <SidebarGroupLabel className="font-mono-accent text-[10px] uppercase tracking-wider text-muted-foreground">
              Navegação
            </SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem active={activeView === "today"} icon={Home} label="Hoje" onClick={() => runAndClose(onSelectToday)} collapsed={collapsed} />
                <NavItem active={activeView === "notes" || activeView === "diary"} icon={BookOpen} label="Pastas" onClick={() => runAndClose(onSelectNotes)} collapsed={collapsed} />
                <NavItem active={activeView === "calendar" || activeView === "tasks"} icon={ListChecks} label="Tarefas" onClick={() => runAndClose(onSelectTasks)} collapsed={collapsed} />
                {onOpenSearch && <NavItem active={false} icon={Search} label="Buscar" onClick={() => runAndClose(onOpenSearch)} collapsed={collapsed} />}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="min-h-[44px] text-sm sm:min-h-0 sm:text-xs">
                    <Link to="/planos" onClick={() => isMobile && setOpenMobile(false)}>
                      <Sparkles className="h-4 w-4 text-primary sm:h-3.5 sm:w-3.5" />
                      {!collapsed && <span>Planos</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {hasPinnedItems && !collapsed && (
            <SidebarGroup>
              <SidebarGroupLabel className="font-mono-accent text-[10px] uppercase tracking-wider text-muted-foreground">
                <Star className="mr-1 h-3 w-3" />
                {!collapsed && "Fixados"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {pinnedNotebooks.map((notebook) => (
                    <SidebarMenuItem key={`notebook-${notebook.id}`}>
                      <SidebarMenuButton onClick={() => runAndClose(() => onOpenNotebook(notebook.id))} className="min-h-[44px] items-start gap-2 text-sm sm:min-h-0 sm:text-xs">
                        <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:h-3.5 sm:w-3.5" />
                        {!collapsed && (
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{notebook.title}</span>
                            <span className="mt-1 flex min-w-0 items-center gap-1">
                              <Badge variant="outline" className="h-5 rounded px-1.5 text-[10px]">
                                Pasta
                              </Badge>
                              <span className="truncate text-[10px] text-muted-foreground">
                                {notebook.page_count || 0} {(notebook.page_count || 0) === 1 ? "anotação" : "anotações"}
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
                        onClick={() => runAndClose(() => onOpenTask ? onOpenTask(task) : onSelectTasks())}
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
                        onClick={() => runAndClose(() => onOpenPage(page))}
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
                                Anotação
                              </Badge>
                              <span className="truncate text-[10px] text-muted-foreground">
                                {notebookTitleById.get(page.notebook_id) || "Pasta"}
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
          <div className={cn("rounded-md border border-sidebar-border/70 bg-sidebar-accent/35", collapsed ? "p-0" : "p-1")}>
            <ProfileMenu onOpenSettings={onOpenSettings} sidebar collapsed={collapsed} />
          </div>
          {!collapsed && (
            <div className="text-center font-mono-accent text-[9px] text-muted-foreground/50">
              VISTA Tasks Control v1.0
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}

function MobileBottomNavigation({
  activeView,
  onSelectToday,
  onSelectNotes,
  onSelectTasks,
  onOpenSettings,
}: {
  activeView: AppView;
  onSelectToday?: () => void;
  onSelectNotes?: () => void;
  onSelectTasks: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 text-sidebar-foreground shadow-[0_-12px_30px_-24px_rgba(0,0,0,0.8)] backdrop-blur lg:hidden">
      <div className="mx-auto max-w-md">
        <div className="grid min-w-0 grid-cols-4 gap-1 rounded-md border border-sidebar-border bg-background/25 p-1">
          <MobileBottomNavButton active={activeView === "today"} icon={Home} label="Hoje" onClick={onSelectToday} />
          <MobileBottomNavButton active={activeView === "notes" || activeView === "diary"} icon={BookOpen} label="Pastas" onClick={onSelectNotes} />
          <MobileBottomNavButton active={activeView === "calendar" || activeView === "tasks"} icon={ListChecks} label="Tarefas" onClick={onSelectTasks} />
          <ProfileMenu mobileNav onOpenSettings={onOpenSettings} />
        </div>
      </div>
    </nav>
  );
}

function MobileBottomNavButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded text-[10px] font-medium transition-colors",
        active
          ?
          "bg-primary/15 text-primary ring-1 ring-primary/40"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
      <span className="max-w-full truncate">{label}</span>
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
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative min-h-[44px] justify-center text-sm group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!p-0 sm:text-xs",
          active && "bg-primary/15 text-primary font-semibold hover:bg-primary/20 hover:text-primary before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-r before:bg-primary"
        )}
      >
        <Icon className={cn("h-4 w-4 sm:h-3.5 sm:w-3.5", active && "text-primary")} />
        {!collapsed && <span>{label}</span>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
