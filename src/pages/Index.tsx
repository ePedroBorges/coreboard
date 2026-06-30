import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";
import { BookOpen, CheckCircle2, Clock3, Link2, Linkedin, ListChecks, Loader2, MoveRight, NotebookPen, Pencil, Pin, Plus, Search, Star, Tag, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotebooks } from "@/hooks/useNotebooks";
import { usePages, useFavoritePages, useAllPages } from "@/hooks/usePages";
import { Priority, useWeeklyTasks, WeeklyTask } from "@/hooks/useWeeklyTasks";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QuickCaptureModal } from "@/components/notes/QuickCaptureModal";
import { Notebook, Page } from "@/types/notes";
import {
  blocksToText,
  DEFAULT_NOTEBOOK_NAME,
  getNotePreview,
  getNoteTags,
  getNoteTitle,
  makeNoteBlocks,
  noteMatchesQueryWithNotebook,
  pageHasChecklist,
  pageHasLink,
  taskTitleFromNote,
} from "@/lib/noteUtils";
import { cn } from "@/lib/utils";
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
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [quickCaptureNotebookId, setQuickCaptureNotebookId] = useState<string | undefined>();
  const [quickCapturePending, setQuickCapturePending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notesFilter, setNotesFilter] = useState<NotesFilter>("all");
  const [taskSourcePage, setTaskSourcePage] = useState<Page | null>(null);

  const notebooks = useNotebooks();
  const pages = usePages(selectedNotebookId || undefined);
  const favorites = useFavoritePages();
  const allPages = useAllPages();
  const tasks = useWeeklyTasks();

  const generalNotebook = useMemo(
    () => notebooks.data?.find((notebook) => notebook.title.trim().toLowerCase() === DEFAULT_NOTEBOOK_NAME.toLowerCase()) || notebooks.data?.[0],
    [notebooks.data]
  );
  const defaultNotebookId = generalNotebook?.id;
  const selectedPage = pages.data?.find((p) => p.id === selectedPageId) || allPages.data?.find((p) => p.id === selectedPageId);
  const sidebarOpen = !focusMode && sidebarPinned;
  const notebookTitleById = useMemo(() => {
    const map = new Map<string, string>();
    (notebooks.data || []).forEach((notebook) => map.set(notebook.id, notebook.title));
    return map;
  }, [notebooks.data]);
  const notebookTitleForPage = useCallback((page: Page) => {
    return notebookTitleById.get(page.notebook_id) || DEFAULT_NOTEBOOK_NAME;
  }, [notebookTitleById]);

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

  const getNotebookIdForNotesFilter = useCallback(() => {
    return notesFilter !== "all" && notesFilter !== "favorites" ? notesFilter : undefined;
  }, [notesFilter]);

  const openQuickCapture = useCallback((notebookId?: string) => {
    setQuickCaptureNotebookId(notebookId || getNotebookIdForNotesFilter() || selectedNotebookId || defaultNotebookId);
    setQuickCaptureOpen(true);
  }, [defaultNotebookId, getNotebookIdForNotesFilter, selectedNotebookId]);

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
    setTaskSourcePage(page);
  }, []);

  const ensureNotebookId = useCallback(async () => {
    if (selectedNotebookId) return selectedNotebookId;
    if (defaultNotebookId) return defaultNotebookId;
    if (notebooks.data?.[0]?.id) return notebooks.data[0].id;
    const notebook = await notebooks.createNotebook.mutateAsync(DEFAULT_NOTEBOOK_NAME);
    return notebook.id;
  }, [defaultNotebookId, notebooks.createNotebook, notebooks.data, selectedNotebookId]);

  const handleQuickCaptureSave = useCallback(async ({
    title,
    content,
    notebookId,
    pinned,
    createTask,
  }: {
    title: string;
    content: Page["content"];
    notebookId?: string;
    pinned: boolean;
    createTask: boolean;
  }) => {
    const targetNotebookId = notebookId || await ensureNotebookId();
    const fallbackTitle = title || blocksToText(content).split("\n").find((line) => line.trim())?.slice(0, 80) || "Nova anotação";
    const page = await pages.createPage.mutateAsync({ title: fallbackTitle, content, notebookId: targetNotebookId });
    if (pinned) pages.updatePage.mutate({ id: page.id, is_favorite: true });
    setActiveView("diary");
    setSelectedNotebookId(targetNotebookId);
    setSelectedPageId(page.id);

    if (createTask) {
      const sourceNotebookTitle = notebookTitleById.get(targetNotebookId) || DEFAULT_NOTEBOOK_NAME;
      tasks.createTask.mutate({
        title: fallbackTitle,
        assignee: sourceNotebookTitle,
        priority: "medium",
        progress_target: null,
        task_date: format(new Date(), "yyyy-MM-dd"),
        source_note_id: page.id,
        source_note_title: fallbackTitle,
        source_notebook_title: sourceNotebookTitle,
      });
    } else {
      toast.success("Nota salva.");
    }
  }, [ensureNotebookId, notebookTitleById, pages.createPage, pages.updatePage, tasks.createTask]);

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

  const handleDeleteNotebook = useCallback((id: string, targetNotebookId?: string) => {
    const fallbackNotebookId = targetNotebookId || defaultNotebookId || notebooks.data?.find((notebook) => notebook.id !== id)?.id;
    notebooks.deleteNotebook.mutate({ id, targetNotebookId }, {
      onSuccess: () => {
        if (selectedNotebookId === id) {
          setSelectedNotebookId(fallbackNotebookId || null);
          setSelectedPageId(null);
        }
        setNotesFilter((current) => current === id ? "all" : current);
      },
    });
  }, [defaultNotebookId, notebooks.data, notebooks.deleteNotebook, selectedNotebookId]);

  const handleMovePage = useCallback((page: Page, notebookId: string) => {
    if (!notebookId || page.notebook_id === notebookId) return;
    const targetTitle = notebookTitleById.get(notebookId) || DEFAULT_NOTEBOOK_NAME;
    pages.updatePage.mutate({ id: page.id, notebook_id: notebookId }, {
      onSuccess: () => toast.success(`Anotacao movida para ${targetTitle}.`),
    });
  }, [notebookTitleById, pages.updatePage]);

  const handleConfirmTaskFromPage = useCallback((input: {
    page: Page;
    title: string;
    taskDate: string;
    priority: Priority;
    project: string;
    keepLink: boolean;
  }) => {
    const sourceNotebookTitle = notebookTitleForPage(input.page);
    tasks.createTask.mutate({
      title: input.title,
      assignee: input.project,
      priority: input.priority,
      progress_target: null,
      task_date: input.taskDate,
      source_note_id: input.keepLink ? input.page.id : undefined,
      source_note_title: input.keepLink ? getNoteTitle(input.page) : undefined,
      source_notebook_title: input.keepLink ? sourceNotebookTitle : undefined,
    }, {
      onSuccess: () => setTaskSourcePage(null),
    });
  }, [notebookTitleForPage, tasks.createTask]);

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const notebookResults = normalizedSearch
    ? (notebooks.data || []).filter((notebook) => notebook.title.toLowerCase().includes(normalizedSearch)).slice(0, 8)
    : [];
  const noteResults = normalizedSearch
    ? (allPages.data || []).filter((page) => noteMatchesQueryWithNotebook(page, normalizedSearch, notebookTitleById.get(page.notebook_id) || DEFAULT_NOTEBOOK_NAME)).slice(0, 12)
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
    <SidebarProvider defaultOpen>

      <div className="min-h-screen flex w-full">
        {!focusMode && (
          <AppSidebar
            activeView={activeView}
            sidebarPinned={sidebarPinned}
            onToggleSidebarPinned={() => setSidebarPinned((current) => !current)}
            onMouseLeave={() => undefined}
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
            onCreateNotebook={(title) => notebooks.createNotebook.mutate(title)}
            onDeleteNotebook={handleDeleteNotebook}
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
                <Button className="h-11 gap-2" onClick={() => openQuickCapture()}>
                  <Plus className="h-4 w-4" />
                  Capturar ideia
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
            {normalizedSearch ? (
              <GlobalSearchResults
                query={searchQuery}
                notebooks={notebookResults}
                notes={noteResults}
                tasks={taskResults}
                notebookTitleById={notebookTitleById}
                onOpenNotebook={(notebookId) => {
                  setSearchQuery("");
                  setActiveView("notes");
                  setNotesFilter(notebookId);
                }}
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
                onOpenAdvancedCapture={() => openQuickCapture()}
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
                notebooks={notebooks.data || []}
                activeFilter={notesFilter}
                defaultNotebookId={defaultNotebookId}
                loading={allPages.isLoading}
                notebookTitleById={notebookTitleById}
                onFilterChange={setNotesFilter}
                onCreateNote={(notebookId) => openQuickCapture(notebookId)}
                onCreateNotebook={async (title) => {
                  const notebook = await notebooks.createNotebook.mutateAsync(title);
                  setNotesFilter(notebook.id);
                  return notebook;
                }}
                onRenameNotebook={(id, title) => notebooks.updateNotebook.mutate({ id, title })}
                onDeleteNotebook={handleDeleteNotebook}
                onOpenNote={openPage}
                onMoveNote={handleMovePage}
                onCreateTaskFromPage={createTaskFromPage}
              />
            ) : selectedPage ? (
              <PageEditor
                page={selectedPage}
                notebooks={notebooks.data || []}
                onUpdate={(updates) => pages.updatePage.mutate({ id: selectedPage.id, ...updates })}
                onNotebookChange={(notebookId) => {
                  setSelectedNotebookId(notebookId);
                  toast.success(`Anotacao movida para ${notebookTitleById.get(notebookId) || DEFAULT_NOTEBOOK_NAME}.`);
                }}
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
      <QuickCaptureModal
        open={quickCaptureOpen}
        onOpenChange={setQuickCaptureOpen}
        notebooks={notebooks.data || []}
        defaultNotebookId={quickCaptureNotebookId || defaultNotebookId}
        onSave={handleQuickCaptureSave}
      />
      <CreateTaskFromNoteDialog
        page={taskSourcePage}
        notebookTitle={taskSourcePage ? notebookTitleForPage(taskSourcePage) : DEFAULT_NOTEBOOK_NAME}
        creating={tasks.createTask.isPending}
        onOpenChange={(open) => {
          if (!open) setTaskSourcePage(null);
        }}
        onConfirm={handleConfirmTaskFromPage}
      />
    </SidebarProvider>
  );
};

type NotesFilter = "all" | "favorites" | string;

function CreateTaskFromNoteDialog({
  page,
  notebookTitle,
  creating,
  onOpenChange,
  onConfirm,
}: {
  page: Page | null;
  notebookTitle: string;
  creating: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: { page: Page; title: string; taskDate: string; priority: Priority; project: string; keepLink: boolean }) => void;
}) {
  const [title, setTitle] = useState("");
  const [taskDate, setTaskDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [priority, setPriority] = useState<Priority>("medium");
  const [project, setProject] = useState("");
  const [keepLink, setKeepLink] = useState(true);

  useEffect(() => {
    if (!page) return;
    const firstTag = getNoteTags(page)[0];
    setTitle(taskTitleFromNote(page));
    setTaskDate(format(new Date(), "yyyy-MM-dd"));
    setPriority("medium");
    setProject(firstTag || notebookTitle || DEFAULT_NOTEBOOK_NAME);
    setKeepLink(true);
  }, [notebookTitle, page]);

  const canCreate = !!page && !!title.trim() && !!taskDate && !creating;

  return (
    <Dialog open={!!page} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar tarefa a partir da anotacao</DialogTitle>
          <DialogDescription>
            Ajuste a acao antes de enviar para Hoje ou Calendario.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-from-note-title">Titulo da tarefa</Label>
            <Input
              id="task-from-note-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titulo da tarefa"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-from-note-date">Data</Label>
              <Input
                id="task-from-note-date"
                type="date"
                value={taskDate}
                onChange={(event) => setTaskDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-from-note-project">Projeto/meta</Label>
            <Input
              id="task-from-note-project"
              value={project}
              onChange={(event) => setProject(event.target.value)}
              placeholder="Projeto, meta ou caderno"
            />
          </div>
          <div className="rounded-md border border-border/60 bg-background/35 p-3 text-sm text-muted-foreground">
            Origem: {page ? getNoteTitle(page) : "Anotacao"} · Caderno: {notebookTitle}
          </div>
          <button
            type="button"
            onClick={() => setKeepLink((current) => !current)}
            className={cn(
              "flex min-h-10 w-full items-center justify-between rounded-md border px-3 text-sm transition-colors",
              keepLink ? "border-primary/35 bg-primary/10 text-primary" : "border-border/60 bg-background/35 text-muted-foreground"
            )}
          >
            <span>Manter vinculo com a anotacao</span>
            <span>{keepLink ? "Sim" : "Nao"}</span>
          </button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!canCreate}
            onClick={() => {
              if (!page || !title.trim()) return;
              onConfirm({ page, title: title.trim(), taskDate, priority, project: project.trim(), keepLink });
            }}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotesLibrary({
  notes,
  notebooks,
  activeFilter,
  defaultNotebookId,
  loading,
  notebookTitleById,
  onFilterChange,
  onCreateNote,
  onCreateNotebook,
  onRenameNotebook,
  onDeleteNotebook,
  onOpenNote,
  onMoveNote,
  onCreateTaskFromPage,
}: {
  notes: Page[];
  notebooks: Notebook[];
  activeFilter: NotesFilter;
  defaultNotebookId?: string;
  loading: boolean;
  notebookTitleById: Map<string, string>;
  onFilterChange: (filter: NotesFilter) => void;
  onCreateNote: (notebookId?: string) => void;
  onCreateNotebook: (title: string) => Promise<Notebook>;
  onRenameNotebook: (id: string, title: string) => void;
  onDeleteNotebook: (id: string, targetNotebookId?: string) => void;
  onOpenNote: (page: Page) => void;
  onMoveNote: (page: Page, notebookId: string) => void;
  onCreateTaskFromPage: (page: Page) => void;
}) {
  const [newNotebookName, setNewNotebookName] = useState("");
  const [showNotebookCreator, setShowNotebookCreator] = useState(false);
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [renameNotebookId, setRenameNotebookId] = useState<string | null>(null);
  const [renameNotebookName, setRenameNotebookName] = useState("");
  const [deleteNotebookId, setDeleteNotebookId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const getNotebookId = useCallback((page: Page) => {
    const exists = notebooks.some((notebook) => notebook.id === page.notebook_id);
    return exists ? page.notebook_id : defaultNotebookId || "";
  }, [defaultNotebookId, notebooks]);

  const notebookCounts = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((page) => {
      const notebookId = getNotebookId(page);
      if (notebookId) counts.set(notebookId, (counts.get(notebookId) || 0) + 1);
    });
    return counts;
  }, [getNotebookId, notes]);

  const favoriteCount = notes.filter((page) => page.is_favorite).length;
  const selectedNotebook = notebooks.find((notebook) => notebook.id === activeFilter);
  const generalNotebook = notebooks.find((notebook) => notebook.title.trim().toLowerCase() === DEFAULT_NOTEBOOK_NAME.toLowerCase());
  const notebookToDelete = deleteNotebookId ? notebooks.find((notebook) => notebook.id === deleteNotebookId) : undefined;
  const deletePageCount = deleteNotebookId ? notes.filter((page) => getNotebookId(page) === deleteNotebookId).length : 0;
  const deleteTargets = notebooks.filter((notebook) => notebook.id !== deleteNotebookId);
  const filteredNotes = notes.filter((page) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "favorites") return page.is_favorite;
    return getNotebookId(page) === activeFilter;
  });
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  const activeNotebookId = activeFilter !== "all" && activeFilter !== "favorites" ? activeFilter : defaultNotebookId;
  const activeTitle = activeFilter === "all"
    ? "Todas as anotações"
    : activeFilter === "favorites"
      ? "Fixadas"
      : `Caderno: ${selectedNotebook?.title || DEFAULT_NOTEBOOK_NAME}`;

  const handleCreateNotebook = async () => {
    const title = newNotebookName.trim();
    if (!title) {
      toast.error("Informe o nome do caderno.");
      return;
    }
    if (notebooks.some((notebook) => notebook.title.trim().toLowerCase() === title.toLowerCase())) {
      toast.error("Já existe um caderno com esse nome.");
      return;
    }
    setCreatingNotebook(true);
    try {
      await onCreateNotebook(title);
      setNewNotebookName("");
      setShowNotebookCreator(false);
    } finally {
      setCreatingNotebook(false);
    }
  };

  const handleStartRenameNotebook = (notebook: Notebook) => {
    if (notebook.title.trim().toLowerCase() === DEFAULT_NOTEBOOK_NAME.toLowerCase()) return;
    setRenameNotebookId(notebook.id);
    setRenameNotebookName(notebook.title);
  };

  const handleRenameNotebook = () => {
    const title = renameNotebookName.trim();
    if (!renameNotebookId || !title) {
      toast.error("Informe o nome do caderno.");
      return;
    }
    if (notebooks.some((notebook) => notebook.id !== renameNotebookId && notebook.title.trim().toLowerCase() === title.toLowerCase())) {
      toast.error("Ja existe um caderno com esse nome.");
      return;
    }
    onRenameNotebook(renameNotebookId, title);
    setRenameNotebookId(null);
    setRenameNotebookName("");
  };

  const handleStartDeleteNotebook = (notebook: Notebook) => {
    if (notebook.title.trim().toLowerCase() === DEFAULT_NOTEBOOK_NAME.toLowerCase()) {
      toast.error("O caderno Geral nao pode ser excluido.");
      return;
    }
    setDeleteNotebookId(notebook.id);
    setDeleteTargetId(
      generalNotebook?.id && generalNotebook.id !== notebook.id
        ? generalNotebook.id
        : notebooks.find((current) => current.id !== notebook.id)?.id || ""
    );
  };

  return (
    <>
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Anotações</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Guarde textos, links, checklists e ideias em cadernos organizados.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="h-10 gap-2" onClick={() => onCreateNote(activeNotebookId)}>
            <Plus className="h-4 w-4" />
            Nova anotação
          </Button>
          <Button variant="outline" className="h-10 gap-2" onClick={() => setShowNotebookCreator(true)} disabled={creatingNotebook}>
            <BookOpen className="h-4 w-4" />
            Novo caderno
          </Button>
        </div>
      </div>

      {showNotebookCreator && (
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/60 p-3 sm:flex-row">
          <Input
            value={newNotebookName}
            onChange={(event) => setNewNotebookName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleCreateNotebook();
              if (event.key === "Escape") setShowNotebookCreator(false);
            }}
            placeholder="Nome do caderno"
            className="h-10"
            autoFocus
          />
          <div className="flex gap-2">
            <Button className="h-10 gap-2" onClick={handleCreateNotebook} disabled={creatingNotebook}>
              {creatingNotebook ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar
            </Button>
            <Button variant="outline" className="h-10" onClick={() => setShowNotebookCreator(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2 lg:hidden">
        <Select value={activeFilter} onValueChange={(value) => onFilterChange(value as NotesFilter)}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Caderno" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({notes.length})</SelectItem>
            <SelectItem value="favorites">Fixadas ({favoriteCount})</SelectItem>
            {notebooks.map((notebook) => (
              <SelectItem key={notebook.id} value={notebook.id}>
                {notebook.title} ({notebookCounts.get(notebook.id) || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden space-y-3 lg:block">
          <div className="rounded-lg border border-border/60 bg-card/60 p-2">
            <NotebookFilterButton active={activeFilter === "all"} icon={BookOpen} label="Todos" count={notes.length} onClick={() => onFilterChange("all")} />
            <NotebookFilterButton active={activeFilter === "favorites"} icon={Star} label="Fixadas" count={favoriteCount} onClick={() => onFilterChange("favorites")} />
            <div className="my-2 h-px bg-border/60" />
            {notebooks.map((notebook) => (
              <NotebookFilterButton
                key={notebook.id}
                active={activeFilter === notebook.id}
                icon={NotebookPen}
                label={notebook.title}
                count={notebookCounts.get(notebook.id) || 0}
                onClick={() => onFilterChange(notebook.id)}
                locked={notebook.title.trim().toLowerCase() === DEFAULT_NOTEBOOK_NAME.toLowerCase()}
                onRename={() => handleStartRenameNotebook(notebook)}
                onDelete={() => handleStartDeleteNotebook(notebook)}
              />
            ))}
          </div>
          <div className="rounded-lg border border-border/60 bg-card/60 p-2">
            <div className="flex gap-2">
              <Input
                value={newNotebookName}
                onChange={(event) => setNewNotebookName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleCreateNotebook();
                }}
                placeholder="Nome do caderno"
                className="h-9"
              />
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleCreateNotebook} disabled={creatingNotebook} title="Novo caderno">
                {creatingNotebook ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">{activeTitle}</h2>
              <p className="text-sm text-muted-foreground">
                {sortedNotes.length} {sortedNotes.length === 1 ? "anotação" : "anotações"}
              </p>
            </div>
            <Button variant="outline" className="h-9 gap-2" onClick={() => onCreateNote(activeNotebookId)}>
              <Plus className="h-4 w-4" />
              Nova anotação
            </Button>
          </div>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center rounded-lg border border-border/60 bg-card/70">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : sortedNotes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
              <NotebookPen className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma anotação neste caderno ainda.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {sortedNotes.map((page) => (
                <NoteCard
                  key={page.id}
                  page={page}
                  notebookTitle={notebookTitleById.get(getNotebookId(page)) || DEFAULT_NOTEBOOK_NAME}
                  notebooks={notebooks}
                  onOpenNote={onOpenNote}
                  onMoveNote={onMoveNote}
                  onCreateTaskFromPage={onCreateTaskFromPage}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    <Dialog open={!!renameNotebookId} onOpenChange={(open) => {
      if (!open) {
        setRenameNotebookId(null);
        setRenameNotebookName("");
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Renomear caderno</DialogTitle>
          <DialogDescription>Escolha um nome claro para manter suas anotacoes organizadas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rename-notebook">Nome do caderno</Label>
          <Input
            id="rename-notebook"
            value={renameNotebookName}
            onChange={(event) => setRenameNotebookName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleRenameNotebook();
            }}
            placeholder="Nome do caderno"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRenameNotebookId(null)}>Cancelar</Button>
          <Button onClick={handleRenameNotebook}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!deleteNotebookId} onOpenChange={(open) => {
      if (!open) {
        setDeleteNotebookId(null);
        setDeleteTargetId("");
      }
    }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir caderno?</DialogTitle>
          <DialogDescription>
            {deletePageCount > 0
              ? `Este caderno possui ${deletePageCount} ${deletePageCount === 1 ? "anotacao" : "anotacoes"}. Para evitar perda de dados, escolha para onde elas serao movidas.`
              : "Este caderno nao possui anotacoes. Voce pode exclui-lo com seguranca."}
          </DialogDescription>
        </DialogHeader>
        {deletePageCount > 0 && (
          <div className="space-y-2">
            <Label htmlFor="delete-target">Mover anotacoes para</Label>
            <Select value={deleteTargetId} onValueChange={setDeleteTargetId}>
              <SelectTrigger id="delete-target" className="h-10">
                <SelectValue placeholder="Escolha um caderno" />
              </SelectTrigger>
              <SelectContent>
                {deleteTargets.map((notebook) => (
                  <SelectItem key={notebook.id} value={notebook.id}>
                    {notebook.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteNotebookId(null)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={deletePageCount > 0 && !deleteTargetId}
            onClick={() => {
              if (deleteNotebookId) onDeleteNotebook(deleteNotebookId, deletePageCount > 0 ? deleteTargetId : undefined);
              setDeleteNotebookId(null);
              setDeleteTargetId("");
            }}
          >
            {deletePageCount > 0 ? "Mover e excluir" : "Excluir caderno vazio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function NotebookFilterButton({
  active,
  icon: Icon,
  label,
  count,
  onClick,
  locked,
  onRename,
  onDelete,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  count: number;
  onClick: () => void;
  locked?: boolean;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={cn(
      "group flex min-h-10 items-center rounded-md transition-colors",
      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
    )}>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs text-muted-foreground">{count}</span>
      </button>
      {!locked && (
        <div className="flex shrink-0 items-center pr-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRename} title="Renomear caderno">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="Excluir caderno">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function NoteCard({
  page,
  notebookTitle,
  notebooks,
  onOpenNote,
  onMoveNote,
  onCreateTaskFromPage,
}: {
  page: Page;
  notebookTitle: string;
  notebooks: Notebook[];
  onOpenNote: (page: Page) => void;
  onMoveNote: (page: Page, notebookId: string) => void;
  onCreateTaskFromPage: (page: Page) => void;
}) {
  const selectedNotebookId = notebooks.some((notebook) => notebook.id === page.notebook_id)
    ? page.notebook_id
    : notebooks.find((notebook) => notebook.title.trim().toLowerCase() === DEFAULT_NOTEBOOK_NAME.toLowerCase())?.id || notebooks[0]?.id || "";

  return (
    <article className="rounded-lg border border-border/60 bg-card/70 p-4">
      <button className="block w-full text-left" onClick={() => onOpenNote(page)}>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-sm font-semibold">{getNoteTitle(page)}</h2>
          {page.is_favorite && <Pin className="h-4 w-4 shrink-0 fill-warning text-warning" />}
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{getNotePreview(page, 180)}</p>
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="gap-1 rounded-full">
          <BookOpen className="h-3 w-3" />
          {notebookTitle}
        </Badge>
        {getNoteTags(page).slice(0, 4).map((tag) => (
          <Badge key={tag} variant="secondary" className="rounded-full">
            <Tag className="mr-1 h-3 w-3" />
            {tag}
          </Badge>
        ))}
        {pageHasChecklist(page) && <Badge variant="outline" className="gap-1 rounded-full"><ListChecks className="h-3 w-3" />Checklist</Badge>}
        {pageHasLink(page) && <Badge variant="outline" className="gap-1 rounded-full"><Link2 className="h-3 w-3" />Link</Badge>}
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => onCreateTaskFromPage(page)}>
          <ListChecks className="h-3.5 w-3.5" />
          Criar tarefa
        </Button>
        {notebooks.length > 0 && (
          <Select value={selectedNotebookId} onValueChange={(notebookId) => onMoveNote(page, notebookId)}>
            <SelectTrigger className="h-9 sm:w-44">
              <MoveRight className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Mover" />
            </SelectTrigger>
            <SelectContent>
              {notebooks.map((notebook) => (
                <SelectItem key={notebook.id} value={notebook.id}>
                  {notebook.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </article>
  );
}

function LegacyNotesLibrary({
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
    task.source_note_title || "",
    task.source_notebook_title || "",
    task.priority,
    task.status,
    task.pending_reasons.map((reason) => reason.reason).join(" "),
  ].join(" ").toLowerCase().includes(query);
}

function GlobalSearchResults({
  query,
  notebooks,
  notes,
  tasks,
  notebookTitleById,
  onOpenNotebook,
  onOpenNote,
  onCreateTaskFromPage,
}: {
  query: string;
  notebooks: Notebook[];
  notes: Page[];
  tasks: WeeklyTask[];
  notebookTitleById: Map<string, string>;
  onOpenNotebook: (notebookId: string) => void;
  onOpenNote: (page: Page) => void;
  onCreateTaskFromPage: (page: Page) => void;
}) {
  const hasResults = notebooks.length > 0 || notes.length > 0 || tasks.length > 0;

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
              <BookOpen className="h-4 w-4 text-primary" />
              Cadernos
            </div>
            {notebooks.length === 0 ? (
              <p className="rounded-md border border-border/50 bg-card/40 p-4 text-sm text-muted-foreground">Nenhum caderno encontrado.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {notebooks.map((notebook) => (
                  <button
                    key={notebook.id}
                    type="button"
                    onClick={() => onOpenNotebook(notebook.id)}
                    className="rounded-lg border border-border/60 bg-card/70 p-4 text-left transition-colors hover:border-primary/45"
                  >
                    <div className="text-sm font-semibold">{notebook.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {notebook.page_count || 0} {(notebook.page_count || 0) === 1 ? "anotação" : "anotações"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

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
                      <Badge variant="outline" className="gap-1 rounded-full">
                        <BookOpen className="h-3 w-3" />
                        {notebookTitleById.get(page.notebook_id) || DEFAULT_NOTEBOOK_NAME}
                      </Badge>
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
                        {task.source_note_title && <span>Origem: {task.source_note_title}</span>}
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
