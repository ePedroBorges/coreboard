import { useCallback, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";
import { CheckCircle2, Clock3, Link2, Linkedin, ListChecks, Loader2, NotebookPen, Pin, Plus, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotebooks } from "@/hooks/useNotebooks";
import { usePages, useFavoritePages, useAllPages } from "@/hooks/usePages";
import { useWeeklyTasks, WeeklyTask } from "@/hooks/useWeeklyTasks";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageEditor } from "@/components/editor/PageEditor";
import { EmptyState } from "@/components/layout/EmptyState";
import { WeeklyTaskManager } from "@/components/tasks/WeeklyTaskManager";
import { TodayView } from "@/components/today/TodayView";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuickCaptureModal } from "@/components/notes/QuickCaptureModal";
import { Page } from "@/types/notes";
import {
  blocksToText,
  getFirstTag,
  getNotePreview,
  getNoteTags,
  getNoteTitle,
  makeNoteBlocks,
  noteMatchesQuery,
  pageHasChecklist,
  pageHasLink,
  taskTitleFromNote,
} from "@/lib/noteUtils";
import { toast } from "sonner";

const defaultDiaryName = () => {
  const monthName = format(new Date(), "MMMM", { locale: ptBR });
  const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  return `${capitalized} ${format(new Date(), "yyyy")} - Diário`;
};

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState<"today" | "tasks" | "calendar" | "notes" | "diary">("today");
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [quickCapturePending, setQuickCapturePending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const notebooks = useNotebooks();
  const pages = usePages(selectedNotebookId || undefined);
  const favorites = useFavoritePages();
  const allPages = useAllPages();
  const tasks = useWeeklyTasks();

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

  const handleSelectToday = useCallback(() => {
    setActiveView("today");
    setSelectedNotebookId(null);
    setSelectedPageId(null);
  }, []);

  const handleSelectTasks = useCallback(() => {
    setActiveView("tasks");
    setSelectedNotebookId(null);
    setSelectedPageId(null);
  }, []);

  const handleSelectCalendar = useCallback(() => {
    setActiveView("calendar");
    setSelectedNotebookId(null);
    setSelectedPageId(null);
  }, []);

  const handleSelectNotes = useCallback(() => {
    setActiveView("notes");
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

  const createTaskFromPage = useCallback((page: Page) => {
    const title = taskTitleFromNote(page);
    if (!title.trim()) return;
    tasks.createTask.mutate({
      title,
      assignee: "",
      priority: "medium",
      progress_target: null,
      task_date: format(new Date(), "yyyy-MM-dd"),
    }, {
      onSuccess: () => toast.success("Tarefa criada a partir da nota."),
    });
  }, [tasks.createTask]);

  const ensureNotebookId = useCallback(async () => {
    if (selectedNotebookId) return selectedNotebookId;
    if (notebooks.data?.[0]?.id) return notebooks.data[0].id;
    const notebook = await notebooks.createNotebook.mutateAsync(defaultDiaryName());
    return notebook.id;
  }, [notebooks.createNotebook, notebooks.data, selectedNotebookId]);

  const handleQuickCaptureSave = useCallback(async ({
    title,
    content,
    pinned,
    createTask,
  }: {
    title: string;
    content: Page["content"];
    pinned: boolean;
    createTask: boolean;
  }) => {
    const notebookId = await ensureNotebookId();
    const fallbackTitle = title || blocksToText(content).split("\n").find((line) => line.trim())?.slice(0, 80) || "Nova anotação";
    const page = await pages.createPage.mutateAsync({ title: fallbackTitle, content, notebookId });
    if (pinned) pages.updatePage.mutate({ id: page.id, is_favorite: true });
    setActiveView("diary");
    setSelectedNotebookId(notebookId);
    setSelectedPageId(page.id);

    if (createTask) {
      tasks.createTask.mutate({
        title: fallbackTitle,
        assignee: "",
        priority: "medium",
        progress_target: null,
        task_date: format(new Date(), "yyyy-MM-dd"),
      }, {
        onSuccess: () => toast.success("Nota salva e tarefa criada."),
      });
    } else {
      toast.success("Nota salva.");
    }
  }, [ensureNotebookId, pages.createPage, pages.updatePage, tasks.createTask]);

  const handleTodayQuickCapture = useCallback(async ({
    mode,
    text,
  }: {
    mode: "note" | "checklist" | "task";
    text: string;
  }) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    setQuickCapturePending(true);
    try {
      if (mode === "task") {
        await tasks.createTask.mutateAsync({
          title: cleanText.slice(0, 140),
          assignee: "",
          priority: "medium",
          progress_target: null,
          task_date: format(new Date(), "yyyy-MM-dd"),
        });
        return;
      }

      const notebookId = await ensureNotebookId();
      const checklistItems = mode === "checklist"
        ? cleanText.split(/\n+/).map((line) => ({ text: line.trim() })).filter((item) => item.text)
        : [];
      const content = mode === "checklist"
        ? makeNoteBlocks("", checklistItems, [])
        : makeNoteBlocks(cleanText, [], []);
      const title = cleanText.split(/\n/).find((line) => line.trim())?.slice(0, 80) || "Nova anotação";

      await pages.createPage.mutateAsync({ title, content, notebookId });
      toast.success(mode === "checklist" ? "Checklist salvo." : "Nota salva.");
    } finally {
      setQuickCapturePending(false);
    }
  }, [ensureNotebookId, pages.createPage, tasks.createTask]);

  const openPage = useCallback((page: Page) => {
    setSearchQuery("");
    setActiveView("diary");
    setSelectedNotebookId(page.notebook_id);
    setSelectedPageId(page.id);
  }, []);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const noteResults = normalizedSearch
    ? (allPages.data || []).filter((page) => noteMatchesQuery(page, normalizedSearch)).slice(0, 12)
    : [];
  const taskResults = normalizedSearch
    ? (tasks.data || []).filter((task) => taskMatchesQuery(task, normalizedSearch)).slice(0, 12)
    : [];

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
            onSelectToday={handleSelectToday}
            onSelectNotes={handleSelectNotes}
            onSelectCalendar={handleSelectCalendar}
            notebooks={notebooks.data || []}
            pages={pages.data || []}
            allPages={allPages.data || []}
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
            onSelectTag={(tag) => {
              setSearchQuery(tag);
              setActiveView("today");
            }}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader onToggleFocus={handleToggleFocus} focusMode={focusMode} />

          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-border/60 bg-background/80 px-3 py-3 backdrop-blur sm:px-4">
              <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Buscar tarefas, notas, links ou tags..."
                    className="h-11 pl-9"
                  />
                </div>
                <Button className="h-11 gap-2" onClick={() => setQuickCaptureOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Capturar ideia
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
            {normalizedSearch ? (
              <GlobalSearchResults
                query={searchQuery}
                notes={noteResults}
                tasks={taskResults}
                onOpenNote={openPage}
                onCreateTaskFromPage={createTaskFromPage}
              />
            ) : activeView === "today" ? (
              <TodayView
                tasks={tasks.data || []}
                notes={allPages.data || []}
                tasksLoading={tasks.isLoading}
                notesLoading={allPages.isLoading}
                quickCapturePending={quickCapturePending}
                onQuickCapture={handleTodayQuickCapture}
                onOpenAdvancedCapture={() => setQuickCaptureOpen(true)}
                onOpenTasks={handleSelectTasks}
                onOpenNotes={handleSelectNotes}
                onOpenCalendar={handleSelectCalendar}
                onOpenNote={openPage}
                onToggleTaskStatus={(task) => tasks.updateTask.mutate({
                  id: task.id,
                  status: task.status === "completed" ? "pending" : "completed",
                })}
                onCreateTaskFromPage={createTaskFromPage}
              />
            ) : activeView === "tasks" || activeView === "calendar" ? (
              <WeeklyTaskManager />
            ) : activeView === "notes" ? (
              <NotesLibrary
                notes={allPages.data || []}
                loading={allPages.isLoading}
                onOpenNote={openPage}
                onCreateTaskFromPage={createTaskFromPage}
              />
            ) : selectedPage ? (
              <PageEditor
                page={selectedPage}
                onUpdate={(updates) => pages.updatePage.mutate({ id: selectedPage.id, ...updates })}
                focusMode={focusMode}
                onExitFocus={() => setFocusMode(false)}
                onCreateTaskFromPage={createTaskFromPage}
                onDelete={() => {
                  const pageId = selectedPage.id;
                  setSelectedPageId(null);
                  setActiveView("notes");
                  pages.deletePage.mutate(pageId);
                }}
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
            </div>
          </main>

          <footer className="shrink-0 border-t border-border bg-background/60 backdrop-blur px-4 py-2">
            <a
              href="https://www.linkedin.com/company/anchorlab"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 font-mono-accent text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <Linkedin className="h-3.5 w-3.5" />
              <span>Desenvolvido por AnchorLab · {new Date().getFullYear()}</span>
            </a>
          </footer>
        </div>
      </div>
      <QuickCaptureModal open={quickCaptureOpen} onOpenChange={setQuickCaptureOpen} onSave={handleQuickCaptureSave} />
    </SidebarProvider>
  );
};

function NotesLibrary({
  notes,
  loading,
  onOpenNote,
  onCreateTaskFromPage,
}: {
  notes: Page[];
  loading: boolean;
  onOpenNote: (page: Page) => void;
  onCreateTaskFromPage: (page: Page) => void;
}) {
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold">Notas</h1>
        <p className="text-sm text-muted-foreground">Todas as suas ideias, links e checklists em ordem recente.</p>
      </div>

      {loading ? (
        <div className="flex min-h-52 items-center justify-center rounded-lg border border-border/60 bg-card/70">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : sortedNotes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <NotebookPen className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma nota ainda. Capture uma ideia, link ou checklist para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sortedNotes.map((page) => (
            <article key={page.id} className="rounded-lg border border-border/60 bg-card/70 p-4">
              <button className="block w-full text-left" onClick={() => onOpenNote(page)}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h2 className="min-w-0 break-words text-sm font-semibold">{getNoteTitle(page)}</h2>
                  {page.is_favorite && <Pin className="h-4 w-4 shrink-0 fill-warning text-warning" />}
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{getNotePreview(page, 180)}</p>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {getNoteTags(page).slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full">{tag}</Badge>
                ))}
                {pageHasChecklist(page) && <Badge variant="outline" className="gap-1 rounded-full"><ListChecks className="h-3 w-3" />Checklist</Badge>}
                {pageHasLink(page) && <Badge variant="outline" className="gap-1 rounded-full"><Link2 className="h-3 w-3" />Link</Badge>}
              </div>
              <Button variant="outline" size="sm" className="mt-3 h-9 gap-1" onClick={() => onCreateTaskFromPage(page)}>
                <ListChecks className="h-3.5 w-3.5" />
                Criar tarefa
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function taskMatchesQuery(task: WeeklyTask, query: string) {
  return [
    task.title,
    task.assignee || "",
    task.priority,
    task.status,
    task.pending_reasons.map((reason) => reason.reason).join(" "),
  ].join(" ").toLowerCase().includes(query);
}

function GlobalSearchResults({
  query,
  notes,
  tasks,
  onOpenNote,
  onCreateTaskFromPage,
}: {
  query: string;
  notes: Page[];
  tasks: WeeklyTask[];
  onOpenNote: (page: Page) => void;
  onCreateTaskFromPage: (page: Page) => void;
}) {
  const hasResults = notes.length > 0 || tasks.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold">Busca global</h1>
        <p className="text-sm text-muted-foreground">Resultados para “{query}”.</p>
      </div>

      {!hasResults ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <Search className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nada encontrado. Tente buscar por uma palavra da nota, tarefa, link ou tag.
          </p>
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <NotebookPen className="h-4 w-4 text-primary" />
              Notas
            </div>
            {notes.length === 0 ? (
              <p className="rounded-md border border-border/50 bg-card/40 p-4 text-sm text-muted-foreground">Nenhuma nota encontrada.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {notes.map((page) => (
                  <article key={page.id} className="rounded-lg border border-border/60 bg-card/70 p-4">
                    <button className="block w-full text-left" onClick={() => onOpenNote(page)}>
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <h2 className="min-w-0 break-words text-sm font-semibold">{getNoteTitle(page)}</h2>
                        {page.is_favorite && <Pin className="h-4 w-4 shrink-0 fill-warning text-warning" />}
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{getNotePreview(page, 180)}</p>
                    </button>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {getNoteTags(page).map((tag) => <Badge key={tag} variant="secondary" className="rounded-full">{tag}</Badge>)}
                      {pageHasChecklist(page) && <Badge variant="outline" className="gap-1 rounded-full"><ListChecks className="h-3 w-3" />Checklist</Badge>}
                      {pageHasLink(page) && <Badge variant="outline" className="gap-1 rounded-full"><Link2 className="h-3 w-3" />Link</Badge>}
                    </div>
                    <Button variant="outline" size="sm" className="mt-3 h-9 gap-1" onClick={() => onCreateTaskFromPage(page)}>
                      <ListChecks className="h-3.5 w-3.5" />
                      Criar tarefa
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-primary" />
              Tarefas
            </div>
            {tasks.length === 0 ? (
              <p className="rounded-md border border-border/50 bg-card/40 p-4 text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
            ) : (
              <div className="grid gap-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{task.assignee || "Sem responsável"}</span>
                        <span>{task.priority}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="w-fit gap-1 rounded-full">
                      {task.status === "completed" ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Clock3 className="h-3 w-3 text-warning" />}
                      {task.status === "completed" ? "Concluída" : "Pendente"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Index;
