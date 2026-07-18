import { useState, useCallback, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Pencil,
  Plus,
  ListChecks,
  Mail,
  Maximize2,
  Minimize2,
  Pin,
  Share2,
  Save,
  Target,
  Trash2,
} from "lucide-react";
import { Page, Block, Notebook } from "@/types/notes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BlockEditor } from "./BlockEditor";
import { TagSelector } from "@/components/notes/TagSelector";
import { cn } from "@/lib/utils";
import { generatePagePdf } from "@/lib/pdfExport";
import { blocksToText, getNoteTags, setNoteTags } from "@/lib/noteUtils";
import { Json } from "@/integrations/supabase/types";
import { useSubscription } from "@/hooks/useSubscription";
import { Priority, TaskPendingReason, WeeklyTask } from "@/hooks/useWeeklyTasks";

interface PageEditorProps {
  page: Page;
  onUpdate: (updates: Partial<Page>) => void;
  focusMode: boolean;
  onEnterFocus: () => void;
  onExitFocus: () => void;
  onCreateTaskFromPage?: (page: Page) => void;
  linkedTasks?: WeeklyTask[];
  onOpenTask?: (task: WeeklyTask) => void;
  onUpdateTask?: (id: string, updates: Partial<WeeklyTask>) => void;
  onDeleteTask?: (id: string) => void;
  onAddSubtask?: (taskId: string, title: string) => void;
  onUpdateSubtask?: (id: string, updates: Partial<TaskPendingReason>) => void;
  onDeleteSubtask?: (id: string) => void;
  onDelete?: () => void;
  notebooks?: Notebook[];
  onNotebookChange?: (notebookId: string) => void;
}

export function PageEditor({ page, onUpdate, focusMode, onEnterFocus, onExitFocus, onCreateTaskFromPage, linkedTasks = [], onOpenTask, onUpdateTask, onDeleteTask, onAddSubtask, onUpdateSubtask, onDeleteSubtask, onDelete, notebooks = [], onNotebookChange }: PageEditorProps) {
  const draftKey = `vistaPageDraft:${page.user_id}:${page.id}`;
  const readDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const draft = JSON.parse(raw) as { title: string; blocks: Block[] };
      if (draft.title === page.title && JSON.stringify(draft.blocks) === JSON.stringify(page.content || [])) {
        localStorage.removeItem(draftKey);
        return null;
      }
      return draft;
    } catch { return null; }
  };
  const initialDraft = readDraft();
  const { isPro } = useSubscription();
  const [title, setTitle] = useState(initialDraft?.title || page.title);
  const [blocks, setBlocks] = useState<Block[]>(initialDraft?.blocks || page.content || []);
  const [dirty, setDirty] = useState(Boolean(initialDraft));
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const pageIdRef = useRef(page.id);
  const pendingRef = useRef<{ title: string; blocks: Block[] } | null>(null);

  useEffect(() => {
    if (pageIdRef.current !== page.id && pendingRef.current) {
      const prevId = pageIdRef.current;
      const { title: pendingTitle, blocks: pendingBlocks } = pendingRef.current;
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase.from("pages").update({ title: pendingTitle, content: pendingBlocks as unknown as Json }).eq("id", prevId);
      });
      pendingRef.current = null;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    }

    pageIdRef.current = page.id;
    const recovered = readDraft();
    setTitle(recovered?.title || page.title);
    setBlocks(recovered?.blocks || page.content || []);
    setDirty(Boolean(recovered));
    if (recovered) onUpdate({ title: recovered.title, content: recovered.blocks });
    // Only reset local editor state when switching notes; autosave invalidations should not steal the cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  const scheduleAutoSave = useCallback(
    (newTitle: string, newBlocks: Block[]) => {
      setDirty(true);
      pendingRef.current = { title: newTitle, blocks: newBlocks };
      localStorage.setItem(draftKey, JSON.stringify({ title: newTitle, blocks: newBlocks, savedAt: Date.now() }));
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onUpdate({ title: newTitle, content: newBlocks });
        pendingRef.current = null;
        setDirty(false);
      }, 800);
    },
    [draftKey, onUpdate]
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    scheduleAutoSave(newTitle, blocks);
  };

  const handleBlocksChange = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    scheduleAutoSave(title, newBlocks);
  };

  const handleTagsChange = (tags: string[]) => {
    const nextBlocks = setNoteTags(blocks, tags);
    setBlocks(nextBlocks);
    scheduleAutoSave(title, nextBlocks);
  };

  const handleNotebookChange = (notebookId: string) => {
    onUpdate({ notebook_id: notebookId });
    onNotebookChange?.(notebookId);
  };

  const handleForceSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    onUpdate({ title, content: blocks });
    pendingRef.current = null;
    setDirty(false);
    toast.success("Salvo");
  }, [blocks, onUpdate, title]);

  const currentPage = { ...page, title, content: blocks };
  const tags = getNoteTags(blocks);

  const handleDownloadPdf = async () => {
    if (!isPro) {
      toast.error("Exportação em PDF é um recurso Pro. Acesse Planos para desbloquear.");
      return;
    }
    try {
      const doc = generatePagePdf(title, blocks, page.created_at, page.updated_at);
      doc.save(`${title || "anotacao"}.pdf`);
      toast.success("PDF baixado");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleSharePdf = async (method: "email" | "social") => {
    if (!isPro) {
      toast.error("Compartilhamento em PDF é um recurso Pro. Acesse Planos para desbloquear.");
      return;
    }
    try {
      const doc = generatePagePdf(title, blocks, page.created_at, page.updated_at);
      const blob = doc.output("blob");
      const file = new File([blob], `${title || "anotacao"}.pdf`, { type: "application/pdf" });

      if (navigator.share) {
        await navigator.share({ title, text: `Confira: ${title}`, files: [file] });
        return;
      }

      if (method === "email") {
        const anchor = document.createElement("a");
        anchor.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Segue a anotação: " + title)}`;
        anchor.click();
        toast.info("Abra seu cliente de e-mail e anexe o PDF baixado.");
      } else {
        toast.info("Compartilhamento não suportado neste navegador. O PDF será baixado.");
      }
      doc.save(`${title || "anotacao"}.pdf`);
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Erro ao compartilhar");
    }
  };

  const handleCopyNote = async () => {
    await navigator.clipboard.writeText([title, blocksToText(blocks)].filter(Boolean).join("\n\n"));
    toast.success("Anotação copiada");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        handleForceSave();
      }
      if (event.ctrlKey && event.shiftKey && event.key === "F") {
        event.preventDefault();
        if (focusMode) onExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleForceSave, onExitFocus]);

  return (
    <div className={cn("min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0", focusMode && "mx-auto w-full max-w-6xl")}>
      <div className="sticky top-0 z-20 border-b border-border bg-background/90 px-3 py-2.5 backdrop-blur-xl sm:px-6 sm:py-3">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex shrink-0 items-center gap-1">
              {dirty ? (
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-warning sm:h-2 sm:w-2" title="Salvando..." />
              ) : (
                <Check className="h-4 w-4 text-success sm:h-3.5 sm:w-3.5" />
              )}
              <span className="font-mono-accent text-[11px] text-muted-foreground sm:text-[10px]">
                {dirty ? "Salvando..." : "Salvo"}
              </span>
            </div>

            <span className="hidden font-mono-accent text-[11px] text-muted-foreground sm:block sm:text-[10px]">
              <Clock className="mr-0.5 inline h-3 w-3" />
              Editado às {format(new Date(page.updated_at), "HH:mm")}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button variant={dirty ? "default" : "ghost"} size="icon" className="h-10 w-10 sm:h-7 sm:w-7" onClick={handleForceSave} title="Salvar agora">
              <Save className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 sm:h-7 sm:w-7"
              onClick={() => onUpdate({ is_favorite: !page.is_favorite })}
              title={page.is_favorite ? "Desafixar" : "Fixar"}
            >
              <Pin className={cn("h-5 w-5 sm:h-3.5 sm:w-3.5", page.is_favorite && "fill-warning text-warning")} />
            </Button>

            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-7 sm:w-7" onClick={handleCopyNote} title="Copiar anotação">
              <Copy className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
            </Button>

            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-destructive hover:text-destructive sm:h-7 sm:w-7"
                onClick={() => {
                  if (window.confirm("Excluir esta anotação permanentemente?")) onDelete();
                }}
                title="Excluir anotação"
              >
                <Trash2 className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-7 sm:w-7">
                  <Share2 className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleDownloadPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSharePdf("email")}>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar por e-mail
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSharePdf("social")}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {focusMode ? (
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-7 sm:w-7" onClick={onExitFocus}>
                <Minimize2 className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-7 sm:w-7" onClick={onEnterFocus} title="Modo foco">
                <Maximize2 className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-3 pt-6 sm:px-8 sm:pt-10">
        <input
          value={title}
          onChange={(event) => handleTitleChange(event.target.value)}
          className="w-full border-none bg-transparent text-3xl font-bold leading-tight outline-none placeholder:text-muted-foreground/30 sm:text-4xl"
          placeholder="Título da anotação"
        />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-[minmax(180px,260px)_minmax(0,1fr)]">
          {notebooks.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="page-notebook" className="text-xs text-muted-foreground">Pasta</Label>
              <Select value={page.notebook_id} onValueChange={handleNotebookChange}>
                <SelectTrigger id="page-notebook" className="h-11 sm:h-9">
                  <SelectValue placeholder="Selecione uma pasta" />
                </SelectTrigger>
                <SelectContent>
                  {notebooks.map((notebook) => (
                    <SelectItem key={notebook.id} value={notebook.id}>
                      {notebook.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <div className="mb-2 text-xs text-muted-foreground">Tags</div>
            <TagSelector value={tags} onChange={handleTagsChange} compact />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-8">
        <div className="min-w-0 border-t border-border/60 pt-5 sm:pt-7">
          <BlockEditor blocks={blocks} onChange={handleBlocksChange} canUseAttachments={isPro} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-8 lg:pb-16">
        <LinkedTasksPanel
          tasks={linkedTasks}
          onOpen={onOpenTask}
          onCreate={onCreateTaskFromPage ? () => onCreateTaskFromPage(currentPage) : undefined}
          onUpdate={onUpdateTask}
          onDelete={onDeleteTask}
          onAddSubtask={onAddSubtask}
          onUpdateSubtask={onUpdateSubtask}
          onDeleteSubtask={onDeleteSubtask}
        />
      </div>
    </div>
  );
}

function LinkedTasksPanel({
  tasks,
  onOpen,
  onCreate,
  onUpdate,
  onDelete,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}: {
  tasks: WeeklyTask[];
  onOpen?: (task: WeeklyTask) => void;
  onCreate?: () => void;
  onUpdate?: (id: string, updates: Partial<WeeklyTask>) => void;
  onDelete?: (id: string) => void;
  onAddSubtask?: (taskId: string, title: string) => void;
  onUpdateSubtask?: (id: string, updates: Partial<TaskPendingReason>) => void;
  onDeleteSubtask?: (id: string) => void;
}) {
  const [editingTask, setEditingTask] = useState<WeeklyTask | null>(null);

  return (
    <section className="border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Tarefas desta anotação</h2>
            <Badge variant="secondary" className="rounded-full">{tasks.length}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Acompanhe e ajuste a execução sem sair da anotação.</p>
        </div>
        {onCreate && <Button size="sm" className="h-10 w-full gap-2 sm:w-auto" onClick={onCreate}><Plus className="h-4 w-4" />Nova tarefa</Button>}
      </div>

      {tasks.length === 0 ? (
        <div className="mt-4 border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma tarefa vinculada a esta anotação.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {tasks.map((task) => (
            <LinkedTaskRow
              key={task.id}
              task={task}
              onToggle={() => onUpdate?.(task.id, { status: task.status === "completed" ? "pending" : "completed" })}
              onEdit={() => onOpen?.(task)}
              onDelete={() => {
                if (window.confirm(`Excluir a tarefa "${task.title}"?`)) onDelete?.(task.id);
              }}
              onAddSubtask={onAddSubtask}
              onUpdateSubtask={onUpdateSubtask}
              onDeleteSubtask={onDeleteSubtask}
            />
          ))}
        </div>
      )}

      <TaskEditDialog
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        onSave={(updates) => {
          if (!editingTask) return;
          onUpdate?.(editingTask.id, updates);
          setEditingTask(null);
        }}
      />
    </section>
  );
}

function LinkedTaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
  onAddSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}: {
  task: WeeklyTask;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSubtask?: (taskId: string, title: string) => void;
  onUpdateSubtask?: (id: string, updates: Partial<TaskPendingReason>) => void;
  onDeleteSubtask?: (id: string) => void;
}) {
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const submitSubtask = () => {
    const title = subtaskTitle.trim();
    if (!title || !onAddSubtask) return;
    onAddSubtask(task.id, title);
    setSubtaskTitle("");
  };

  return (
    <article className="rounded-md border border-border/60 bg-card/45 p-3">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onToggle} className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border/70 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary" title={task.status === "completed" ? "Reabrir tarefa" : "Concluir tarefa"}>
          {task.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Check className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" className="block w-full text-left" onClick={onEdit} aria-label={`Abrir tarefa ${task.title}`}>
            <h3 className={cn("break-words text-sm font-semibold", task.status === "completed" && "text-muted-foreground line-through")}>{task.title}</h3>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{format(parseISO(task.task_date), "dd/MM/yyyy")}</span>
            <span>{task.priority === "high" ? "Alta" : task.priority === "low" ? "Baixa" : "Média"}</span>
            {task.assignee && <span>{task.assignee}</span>}
          </div>
          {task.description && <p className="mt-2 break-words text-sm leading-5 text-muted-foreground">{task.description}</p>}
          {task.progress_target !== null && (
            <div className="mt-3 max-w-sm space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-primary" />Quantidade</span>
                <span className="font-medium text-foreground">{task.progress_current}/{task.progress_target}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, (task.progress_current / Math.max(1, task.progress_target)) * 100)}%` }} />
              </div>
            </div>
          )}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3 sm:ml-12">
        <Button variant="ghost" size="sm" className="h-9 gap-2 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" />Excluir</Button>
      </div>

      <div className="ml-0 mt-3 border-t border-border/50 pt-3 sm:ml-12">
        {task.pending_reasons.length > 0 && (
          <div className="mb-2 space-y-1">
            {task.pending_reasons.map((subtask) => (
              <div key={subtask.id} className="flex min-h-9 items-center gap-2 text-sm">
                <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted" onClick={() => onUpdateSubtask?.(subtask.id, { completed_at: subtask.completed_at ? null : new Date().toISOString() })} title={subtask.completed_at ? "Reabrir subtarefa" : "Concluir subtarefa"}>
                  {subtask.completed_at ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Check className="h-3.5 w-3.5" />}
                </button>
                <span className={cn("min-w-0 flex-1 break-words", subtask.completed_at && "text-muted-foreground line-through")}>{subtask.reason}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDeleteSubtask?.(subtask.id)} title="Excluir subtarefa"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
        {onAddSubtask && (
          <div className="flex gap-2">
            <Input value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitSubtask()} placeholder="Adicionar subtarefa" className="h-9" />
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={submitSubtask} disabled={!subtaskTitle.trim()} title="Adicionar subtarefa"><Plus className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
    </article>
  );
}

function TaskEditDialog({ task, open, onOpenChange, onSave }: { task: WeeklyTask | null; open: boolean; onOpenChange: (open: boolean) => void; onSave: (updates: Partial<WeeklyTask>) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState<WeeklyTask["status"]>("pending");
  const [progressCurrent, setProgressCurrent] = useState("0");
  const [progressTarget, setProgressTarget] = useState("");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || "");
    setTaskDate(task.task_date);
    setPriority(task.priority);
    setAssignee(task.assignee || "");
    setStatus(task.status);
    setProgressCurrent(String(task.progress_current || 0));
    setProgressTarget(task.progress_target === null ? "" : String(task.progress_target));
  }, [task]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Editar tarefa</DialogTitle><DialogDescription>As alterações também aparecem na tela de tarefas.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="linked-task-title">Título</Label><Input id="linked-task-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="linked-task-description">Descrição</Label><Textarea id="linked-task-description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="linked-task-date">Data</Label><Input id="linked-task-date" type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} /></div>
            <div className="space-y-2"><Label>Prioridade</Label><Select value={priority} onValueChange={(value) => setPriority(value as Priority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="high">Alta</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label htmlFor="linked-task-assignee">Responsável</Label><Input id="linked-task-assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="Opcional" /></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={(value) => setStatus(value as WeeklyTask["status"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="completed">Concluída</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="linked-task-progress">Progresso</Label><Input id="linked-task-progress" type="number" min={0} value={progressCurrent} onChange={(event) => setProgressCurrent(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="linked-task-target">Quantidade</Label><Input id="linked-task-target" type="number" min={1} value={progressTarget} onChange={(event) => setProgressTarget(event.target.value)} placeholder="Opcional" /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!title.trim() || !taskDate} onClick={() => onSave({ title: title.trim(), description: description.trim() || null, task_date: taskDate, priority, assignee: assignee.trim() || null, status, progress_current: Math.max(0, Number(progressCurrent) || 0), progress_target: progressTarget ? Math.max(1, Number(progressTarget) || 1) : null })}>Salvar alterações</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
