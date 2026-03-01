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
  Plus,
  Star,
  FileText,
  Trash2,
  MoreHorizontal,
  ChevronRight,
  Pencil,
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
  selectedNotebookId: string | null;
  selectedPageId: string | null;
  onSelectNotebook: (id: string) => void;
  onSelectPage: (id: string) => void;
  onCreateNotebook: (title: string) => void;
  onDeleteNotebook: (id: string) => void;
  onRenameNotebook: (id: string, title: string) => void;
  onCreatePage: () => void;
  onToggleFavorite: (id: string, fav: boolean) => void;
}

export function AppSidebar({
  notebooks,
  pages,
  favorites,
  selectedNotebookId,
  selectedPageId,
  onSelectNotebook,
  onSelectPage,
  onCreateNotebook,
  onDeleteNotebook,
  onRenameNotebook,
  onCreatePage,
  onToggleFavorite,
}: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newNotebookMode, setNewNotebookMode] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleCreateNotebook = () => {
    if (newTitle.trim()) {
      onCreateNotebook(newTitle.trim());
      setNewTitle("");
      setNewNotebookMode(false);
    }
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
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold tracking-tight">SmartNotes</span>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <ScrollArea className="flex-1">
            {/* Favorites */}
            {favorites.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="font-mono-accent text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Star className="mr-1 h-3 w-3" />
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
                            "text-xs",
                            selectedPageId === page.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                          )}
                        >
                          <Star className="h-3 w-3 text-warning fill-warning" />
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
                <SidebarGroupLabel className="font-mono-accent text-[10px] uppercase tracking-wider text-muted-foreground">
                  {!collapsed && "Cadernos"}
                </SidebarGroupLabel>
                {!collapsed && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setNewNotebookMode(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
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
                          onBlur={() => {
                            if (newTitle.trim()) handleCreateNotebook();
                            else setNewNotebookMode(false);
                          }}
                          placeholder="Nome do caderno..."
                          className="h-7 text-xs"
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
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={cn(
                              "group/nb justify-between",
                              selectedNotebookId === notebook.id && "bg-sidebar-accent"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <ChevronRight
                                className={cn(
                                  "h-3 w-3 transition-transform shrink-0",
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
                                  className="h-5 text-xs py-0 px-1"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="truncate text-xs">{notebook.title}</span>
                              )}
                            </div>
                            {!collapsed && (
                              <div className="flex items-center gap-1 opacity-0 group-hover/nb:opacity-100 transition-opacity">
                                <span className="font-mono-accent text-[10px] text-muted-foreground">
                                  {notebook.page_count}
                                </span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button className="p-0.5 rounded hover:bg-background/50">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-36">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRenameId(notebook.id);
                                        setRenameValue(notebook.title);
                                      }}
                                    >
                                      <Pencil className="mr-2 h-3 w-3" />
                                      Renomear
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteId(notebook.id);
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-3 w-3" />
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          {selectedNotebookId === notebook.id && (
                            <div className="ml-4 border-l border-sidebar-border pl-2 py-1 space-y-0.5">
                              {pages.map((page) => (
                                <button
                                  key={page.id}
                                  onClick={() => onSelectPage(page.id)}
                                  className={cn(
                                    "flex items-center gap-2 w-full rounded px-2 py-1 text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors",
                                    selectedPageId === page.id && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  )}
                                >
                                  <FileText className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{page.title}</span>
                                  {page.is_favorite && (
                                    <Star className="h-2.5 w-2.5 text-warning fill-warning ml-auto shrink-0" />
                                  )}
                                </button>
                              ))}
                              <button
                                onClick={onCreatePage}
                                className="flex items-center gap-2 w-full rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                                Nova página
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
            SmartNotes v1.0
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir caderno?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as páginas deste caderno serão excluídas permanentemente.
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
    </>
  );
}
