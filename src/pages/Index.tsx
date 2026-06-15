import { useCallback, useState } from "react";
import { format } from "date-fns";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotebooks } from "@/hooks/useNotebooks";
import { usePages, useFavoritePages } from "@/hooks/usePages";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageEditor } from "@/components/editor/PageEditor";
import { EmptyState } from "@/components/layout/EmptyState";
import { WeeklyTaskManager } from "@/components/tasks/WeeklyTaskManager";
import { SidebarProvider } from "@/components/ui/sidebar";

const defaultDiaryName = () => `${format(new Date(), "MM/yyyy")} - Diario`;

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState<"tasks" | "diary">("tasks");
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);

  const notebooks = useNotebooks();
  const pages = usePages(selectedNotebookId || undefined);
  const favorites = useFavoritePages();

  const selectedPage = pages.data?.find((p) => p.id === selectedPageId);
  const sidebarOpen = !focusMode && (sidebarPinned || sidebarHover);

  const handleSelectNotebook = useCallback((id: string) => {
    setActiveView("diary");
    setSelectedNotebookId(id);
    setSelectedPageId(null);
  }, []);

  const handleSelectPage = useCallback((id: string) => {
    setActiveView("diary");
    setSelectedPageId(id);
  }, []);

  const handleSelectTasks = useCallback(() => {
    setActiveView("tasks");
    setSelectedNotebookId(null);
    setSelectedPageId(null);
  }, []);

  const handleToggleFocus = useCallback(() => {
    setFocusMode((current) => !current);
  }, []);

  const handleCreatePage = useCallback(() => {
    if (!selectedNotebookId) return;
    pages.createPage.mutate("Nova entrada", {
      onSuccess: (page) => {
        setActiveView("diary");
        setSelectedPageId(page.id);
      },
    });
  }, [pages.createPage, selectedNotebookId]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider
      defaultOpen={false}
      open={sidebarOpen}
      onOpenChange={(open) => {
        setSidebarPinned(open);
        if (!open) setSidebarHover(false);
      }}
    >
      <div className="min-h-screen flex w-full">
        {!focusMode && !sidebarPinned && (
          <div
            className="fixed inset-y-0 left-0 z-30 hidden w-3 md:block"
            onMouseEnter={() => setSidebarHover(true)}
          />
        )}

        {!focusMode && (
          <AppSidebar
            activeView={activeView}
            sidebarPinned={sidebarPinned}
            onToggleSidebarPinned={() => setSidebarPinned((current) => !current)}
            onMouseLeave={() => {
              if (!sidebarPinned) setSidebarHover(false);
            }}
            onSelectTasks={handleSelectTasks}
            notebooks={notebooks.data || []}
            pages={pages.data || []}
            favorites={favorites.data || []}
            selectedNotebookId={selectedNotebookId}
            selectedPageId={selectedPageId}
            onSelectNotebook={handleSelectNotebook}
            onSelectPage={handleSelectPage}
            onCreateNotebook={(title) => notebooks.createNotebook.mutate(title || defaultDiaryName())}
            onDeleteNotebook={(id) => notebooks.deleteNotebook.mutate(id)}
            onRenameNotebook={(id, title) => notebooks.updateNotebook.mutate({ id, title })}
            onCreatePage={handleCreatePage}
            onRenamePage={(id, title) => pages.updatePage.mutate({ id, title })}
            onDeletePage={(id) => {
              if (selectedPageId === id) setSelectedPageId(null);
              pages.deletePage.mutate(id);
            }}
            onToggleFavorite={(id, fav) => pages.toggleFavorite.mutate({ id, is_favorite: fav })}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader onToggleFocus={handleToggleFocus} focusMode={focusMode} />

          <main className="flex-1 overflow-auto">
            {activeView === "tasks" ? (
              <WeeklyTaskManager />
            ) : selectedPage ? (
              <PageEditor
                page={selectedPage}
                onUpdate={(updates) => pages.updatePage.mutate({ id: selectedPage.id, ...updates })}
                focusMode={focusMode}
                onExitFocus={() => setFocusMode(false)}
              />
            ) : (
              <div className="flex h-full flex-col">
                {!selectedNotebookId && (
                  <EmptyState
                    hasNotebooks={(notebooks.data?.length || 0) > 0}
                    hasSelectedNotebook={false}
                    onCreateNotebook={() => notebooks.createNotebook.mutate(defaultDiaryName())}
                    onCreatePage={handleCreatePage}
                  />
                )}
                {selectedNotebookId && !selectedPageId && (
                  <EmptyState
                    hasNotebooks
                    hasSelectedNotebook
                    onCreateNotebook={() => notebooks.createNotebook.mutate(defaultDiaryName())}
                    onCreatePage={handleCreatePage}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
