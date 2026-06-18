import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  BookOpen,
  ClipboardList,
  Plus,
  Star,
  FileText,
  Trash2,
  MoreHorizontal,
  ChevronRight,
  Pencil,
  Pin,
  PinOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Notebook, Page } from "@/types/notes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  notebooks: Notebook[];
  pages: Page[];
  favorites: Page[];
  activeView: "tasks" | "diary";
  sidebarPinned: boolean;
  selectedNotebookId: string | null;
  selectedPageId: string | null;
  onToggleSidebarPinned: () => void;
  onMouseLeave: () => void;
  onSelectTasks: () => void;
  onSelectNotebook: (id: string) => void;
  onSelectPage: (id: string) => void;
  onCreateNotebook: (title: string) => void;
  onDeleteNotebook: (id: string) => void;
  onRenameNotebook: (id: string, title: string) => void;
  onCreatePage: () => void;
  onRenamePage: (id: string, title: string) => void;
  onDeletePage: (id: string) => void;
  onToggleFavorite: (id: string, fav: boolean) => void;
}

export function AppSidebar({
  notebooks,
  pages,
  favorites,
  activeView,
  sidebarPinned,
  selectedNotebookId,
  selectedPageId,
  onToggleSidebarPinned,
  onMouseLeave,
  onSelectTasks,
  onSelectNotebook,
  onSelectPage,
  onCreateNotebook,
  onDeleteNotebook,
  onRenameNotebook,
  onCreatePage,
  onRenamePage,
  onDeletePage,
  onToggleFavorite,
}: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePageId, setRenamePageId] = useState<string | null>(null);
  const [renamePageValue, setRenamePageValue] = useState("");
  const [newNotebookMode, setNewNotebookMode] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleRenamePage = () => {
    if (renamePageId && renamePageValue.trim()) {
      onRenamePage(renamePageId, renamePageValue.trim());
      setRenamePageId(null);
      setRenamePageValue("");
    }
  };

  const handleCreateNotebook = () => {
    // Empty title => parent will use default (mês ano - Diario)
    onCreateNotebook(newTitle.trim());
    setNewTitle("");
    setNewNotebookMode(false);
  };

  const handleRename = () => {
    if (renameId && renameValue.trim()) {
      onRenameNotebook(renameId, renameValue.trim());
      setRenameId(null);
      setRenameValue("");
    }
  };

  return (
    <>
      <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border shadow-xl md:shadow-none" onMouseLeave={onMouseLeave}>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded bg-primary/10">
              <ClipboardList className="h-5 w-5 sm:h-4 sm:w-4 text-primary" />
            </div>
            {!collapsed && (
              <span className="text-base sm:text-sm font-semibold tracking-tight">VISTA Task Control</span>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8"
                onClick={onToggleSidebarPinned}
                title={sidebarPinned ? "Desafixar menu" : "Fixar menu"}
              >
                {sidebarPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <ScrollArea className="flex-1">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={onSelectTasks}
                      className={cn(
                        "text-sm sm:text-xs min-h-[44px] sm:min-h-0",
                        activeView === "tasks" && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <ClipboardList className="h-4 w-4 sm:h-3 sm:w-3" />
                      {!collapsed && <span>Task Manager</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Favorites */}
            {favorites.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="font-mono-accent text-[11px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Star className="mr-1 h-3.5 w-3.5 sm:h-3 sm:w-3" />
                  {!collapsed && "Favoritos"}
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
                            "text-sm sm:text-xs min-h-[44px] sm:min-h-0",
                            selectedPageId === page.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                          )}
                        >
                          <Star className="h-4 w-4 sm:h-3 sm:w-3 text-warning fill-warning" />
                          {!collapsed && <span className="truncate">{page.title}</span>}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Notebooks */}
            <SidebarGroup>
              <div className="flex items-center justify-between px-2">
                <SidebarGroupLabel className="font-mono-accent text-[11px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">
                  {!collapsed && "Diario"}
                </SidebarGroupLabel>
                {!collapsed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 sm:h-6 sm:w-6"
                    onClick={() => setNewNotebookMode(true)}
                  >
                    <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </Button>
                )}
              </div>
              <SidebarGroupContent>
                <SidebarMenu>
                  {newNotebookMode && (
                    <SidebarMenuItem>
                      <div className="px-2 py-1">
                        <Input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateNotebook();
                            if (e.key === "Escape") setNewNotebookMode(false);
                          }}
                          onBlur={handleCreateNotebook}
                          placeholder="Nome (vazio = mês atual)"
                          className="h-10 sm:h-7 text-sm sm:text-xs"
                          autoFocus
                        />
                      </div>
                    </SidebarMenuItem>
                  )}
                  {notebooks.map((notebook) => (
                    <Collapsible
                      key={notebook.id}
                      open={selectedNotebookId === notebook.id}
                      onOpenChange={() => onSelectNotebook(notebook.id)}
                    >
                      <SidebarMenuItem>
                        <div className="relative flex items-center">
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              className={cn(
                                "group/nb justify-between min-h-[44px] sm:min-h-0 pr-16",
                                selectedNotebookId === notebook.id && "bg-sidebar-accent"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ChevronRight
                                  className={cn(
                                    "h-4 w-4 sm:h-3 sm:w-3 transition-transform shrink-0",
                                    selectedNotebookId === notebook.id && "rotate-90"
                                  )}
                                />
                                {renameId === notebook.id ? (
                                  <Input
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleRename();
                                      if (e.key === "Escape") setRenameId(null);
                                    }}
                                    onBlur={handleRename}
                                    className="h-7 text-xs py-0 px-1"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span className="truncate text-sm sm:text-xs">{notebook.title}</span>
                                )}
                              </div>
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          {!collapsed && (
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <span className="font-mono-accent text-[11px] sm:text-[10px] text-muted-foreground">
                                {notebook.page_count}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="p-1.5 sm:p-1 rounded hover:bg-background/50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                    }}
                                  >
                                    <MoreHorizontal className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36">
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setRenameId(notebook.id);
                                      setRenameValue(notebook.title);
                                    }}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Renomear
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setDeleteId(notebook.id);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>


                        <CollapsibleContent>
                          {selectedNotebookId === notebook.id && (
                            <div className="ml-4 border-l border-sidebar-border pl-2 py-1 space-y-0.5">
                              {groupPagesByDate(pages).map((group) => (
                                <div key={group.key} className="space-y-0.5">
                                  <div className="px-2 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    {group.label}
                                  </div>
                                  {group.pages.map((page) => (
                                    <div key={page.id} className="group/page flex items-center gap-1">
                                      {renamePageId === page.id ? (
                                        <Input
                                          autoFocus
                                          value={renamePageValue}
                                          onChange={(e) => setRenamePageValue(e.target.value)}
                                          onBlur={handleRenamePage}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleRenamePage();
                                            if (e.key === "Escape") setRenamePageId(null);
                                          }}
                                          className="h-8 text-xs"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => onSelectPage(page.id)}
                                            className={cn(
                                              "flex items-center gap-2 flex-1 min-w-0 rounded px-2 py-2.5 sm:py-1 text-sm sm:text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors min-h-[44px] sm:min-h-0",
                                              selectedPageId === page.id && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                            )}
                                          >
                                            <FileText className="h-4 w-4 sm:h-3 sm:w-3 shrink-0" />
                                            <span className="truncate">{formatDiaryEntryTitle(page)}</span>
                                            {page.is_favorite && (
                                              <Star className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5 text-warning fill-warning ml-auto shrink-0" />
                                            )}
                                          </button>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button
                                                className="p-1 rounded hover:bg-background/50 opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                }}
                                              >
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-36">
                                              <DropdownMenuItem
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setRenamePageId(page.id);
                                                  setRenamePageValue(page.title);
                                                }}
                                              >
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Renomear
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeletePageId(page.id);
                                                }}
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Excluir
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ))}
                              <button
                                onClick={onCreatePage}
                                className="flex items-center gap-2 w-full rounded px-2 py-2.5 sm:py-1 text-sm sm:text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors min-h-[44px] sm:min-h-0"
                              >
                                <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
                                Nova entrada
                              </button>
                            </div>
                          )}
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </ScrollArea>
        </SidebarContent>

        <SidebarFooter className="p-2">
          <div className="font-mono-accent text-[9px] text-muted-foreground/50 text-center">
            VISTA Task Control v1.0
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir diario?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as entradas deste diario serao excluidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) onDeleteNotebook(deleteId);
                setDeleteId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePageId} onOpenChange={() => setDeletePageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir página?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta página será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletePageId) onDeletePage(deletePageId);
                setDeletePageId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function groupPagesByDate(pages: Page[]) {
  const groups = new Map<string, { key: string; label: string; pages: Page[] }>();

  [...pages]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .forEach((page) => {
      const date = new Date(page.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      const group = groups.get(key) || { key, label, pages: [] };
      group.pages.push(page);
      groups.set(key, group);
    });

  return Array.from(groups.values());
}

function formatDiaryEntryTitle(page: Page) {
  const date = new Date(page.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return `${date} - ${page.title}`;
}
