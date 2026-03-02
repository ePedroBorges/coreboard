import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useNotebooks } from "@/hooks/useNotebooks";
import { usePages, useFavoritePages } from "@/hooks/usePages";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageEditor } from "@/components/editor/PageEditor";
import { EmptyState } from "@/components/layout/EmptyState";
import { WeeklyTaskManager } from "@/components/tasks/WeeklyTaskManager";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);

  const notebooks = useNotebooks();
  const pages = usePages(selectedNotebookId || undefined);
  const favorites = useFavoritePages();

  const selectedPage = pages.data?.find((p) => p.id === selectedPageId);

  const handleSelectNotebook = useCallback((id: string) => {
    setSelectedNotebookId(id);
    setSelectedPageId(null);
  }, []);

  const handleSelectPage = useCallback((id: string) => {
    setSelectedPageId(id);
  }, []);

  const handleToggleFocus = useCallback(() => {
    setFocusMode((f) => !f);
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {!focusMode && (
          <AppSidebar
            notebooks={notebooks.data || []}
            pages={pages.data || []}
            favorites={favorites.data || []}
            selectedNotebookId={selectedNotebookId}
            selectedPageId={selectedPageId}
            onSelectNotebook={handleSelectNotebook}
            onSelectPage={handleSelectPage}
            onCreateNotebook={(title) => notebooks.createNotebook.mutate(title)}
            onDeleteNotebook={(id) => notebooks.deleteNotebook.mutate(id)}
            onRenameNotebook={(id, title) => notebooks.updateNotebook.mutate({ id, title })}
            onCreatePage={() => pages.createPage.mutate("Nova Página")}
            onToggleFavorite={(id, fav) => pages.toggleFavorite.mutate({ id, is_favorite: fav })}
          />
        )}
        <div className="flex-1 flex flex-col min-w-0">
          {!focusMode && (
            <AppHeader
              onToggleFocus={handleToggleFocus}
              focusMode={focusMode}
            />
          )}
          <main className="flex-1 overflow-auto">
            {selectedPage ? (
              <PageEditor
                page={selectedPage}
                onUpdate={(updates) => pages.updatePage.mutate({ id: selectedPage.id, ...updates })}
                focusMode={focusMode}
                onExitFocus={() => setFocusMode(false)}
              />
            ) : (
              <div className="flex flex-col h-full">
                {/* Weekly Task Manager as home screen */}
                <WeeklyTaskManager />

                {/* Empty state below if no page selected */}
                {!selectedNotebookId && (
                  <div className="border-t border-border/30">
                    <EmptyState
                      hasNotebooks={(notebooks.data?.length || 0) > 0}
                      hasSelectedNotebook={!!selectedNotebookId}
                      onCreateNotebook={() => notebooks.createNotebook.mutate("Novo Caderno")}
                      onCreatePage={() => pages.createPage.mutate("Nova Página")}
                    />
                  </div>
                )}
                {selectedNotebookId && !selectedPageId && (
                  <div className="border-t border-border/30">
                    <EmptyState
                      hasNotebooks={true}
                      hasSelectedNotebook={true}
                      onCreateNotebook={() => notebooks.createNotebook.mutate("Novo Caderno")}
                      onCreatePage={() => pages.createPage.mutate("Nova Página")}
                    />
                  </div>
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
