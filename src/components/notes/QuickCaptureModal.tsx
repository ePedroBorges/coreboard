import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckSquare, Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TagSelector } from "./TagSelector";
import { makeFreeformNoteBlocks } from "@/lib/noteUtils";
import { Block, Notebook } from "@/types/notes";
import { Priority } from "@/hooks/useWeeklyTasks";

interface QuickCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "note" | "task";
  notebooks: Notebook[];
  defaultNotebookId?: string;
  onSave: (input: { title: string; content: Block[]; notebookId?: string; pinned: boolean; createTask: boolean }) => Promise<void>;
  onSaveTask: (input: { title: string; description?: string; assignee?: string; priority: Priority; progress_target: number | null; task_date: string; notebook_id?: string | null; source_notebook_title?: string }) => Promise<void>;
}

type ChecklistDraft = { id: string; text: string; checked?: boolean };

const createDraftItem = (): ChecklistDraft => ({
  id: Math.random().toString(36).slice(2, 10),
  text: "",
});

export function QuickCaptureModal({ open, onOpenChange, mode, notebooks, defaultNotebookId, onSave, onSaveTask }: QuickCaptureModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState(defaultNotebookId || "");
  const [pinned, setPinned] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistDraft[]>([]);
  const [savingMode, setSavingMode] = useState<"note" | "task" | null>(null);
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [taskDate, setTaskDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [priority, setPriority] = useState<Priority>("medium");
  const [target, setTarget] = useState("");

  useEffect(() => {
    if (open) setSelectedNotebookId(defaultNotebookId || notebooks[0]?.id || "");
  }, [defaultNotebookId, notebooks, open]);

  const canSave = useMemo(
    () => mode === "task" ? !!title.trim() : !!title.trim() || !!content.trim() || checklistItems.some((item) => item.text.trim()),
    [checklistItems, content, mode, title]
  );

  const reset = () => {
    setTitle("");
    setContent("");
    setTags([]);
    setSelectedNotebookId(defaultNotebookId || notebooks[0]?.id || "");
    setPinned(false);
    setChecklistItems([]);
    setSavingMode(null);
    setDescription("");
    setAssignee("");
    setTaskDate(format(new Date(), "yyyy-MM-dd"));
    setPriority("medium");
    setTarget("");
  };

  const saveTask = async () => {
    if (!title.trim()) return;
    setSavingMode("task");
    const folder = notebooks.find((notebook) => notebook.id === selectedNotebookId);
    try {
      await onSaveTask({
        title: title.trim(),
        description: description.trim() || undefined,
        assignee: assignee.trim() || undefined,
        priority,
        progress_target: target ? Number(target) : null,
        task_date: taskDate,
        notebook_id: selectedNotebookId || null,
        source_notebook_title: folder?.title,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSavingMode(null);
    }
  };

  const save = async (createTask: boolean) => {
    if (!canSave) return;
    setSavingMode(createTask ? "task" : "note");
    const blocks = makeFreeformNoteBlocks(content, checklistItems, tags);
    try {
      await onSave({
        title: title.trim(),
        content: blocks,
        notebookId: selectedNotebookId || defaultNotebookId,
        pinned,
        createTask,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSavingMode(null);
    }
  };

  const updateChecklistItem = (id: string, text: string) => {
    setChecklistItems((items) => items.map((item) => item.id === id ? { ...item, text } : item));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-7rem)] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border-border/70 bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>{mode === "task" ? "Nova tarefa" : "Nova anotação"}</DialogTitle>
          <DialogDescription>
            {mode === "task" ? "Defina os detalhes necessários para executar esta tarefa." : "Escreva livremente e organize a anotação na pasta certa."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={mode === "task" ? "Título da tarefa" : "Título opcional"} />
          <div className="space-y-2">
            <Label htmlFor="quick-capture-notebook">Pasta</Label>
            <Select value={selectedNotebookId} onValueChange={setSelectedNotebookId}>
              <SelectTrigger id="quick-capture-notebook">
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
          {mode === "note" ? <><Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Escreva livremente..."
            className="min-h-64 resize-y leading-7"
          />

          <div className="rounded-md border border-border/60 bg-background/35 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckSquare className="h-4 w-4 text-primary" />
                Checklist
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => setChecklistItems((items) => [...items, createDraftItem()])}>
                <Plus className="h-3.5 w-3.5" />
                Item
              </Button>
            </div>
            <div className="space-y-2">
              {checklistItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">Adicione itens quando a ideia já vier com próximos passos.</p>
              ) : checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox checked={false} disabled className="h-4 w-4" />
                  <Input
                    value={item.text}
                    onChange={(event) => updateChecklistItem(item.id, event.target.value)}
                    placeholder="Item do checklist"
                    className="h-9"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setChecklistItems((items) => items.filter((current) => current.id !== item.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</div>
            <TagSelector value={tags} onChange={setTags} />
          </div>

          <button
            type="button"
            onClick={() => setPinned((current) => !current)}
            className="flex min-h-10 items-center gap-2 rounded-md border border-border/60 bg-background/35 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pin className="h-4 w-4" />
            {pinned ? "Anotação fixada" : "Fixar anotação"}
          </button>
          </> : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="quick-task-description">Descrição</Label>
                <Textarea id="quick-task-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contexto ou resultado esperado (opcional)" className="min-h-20" />
              </div>
              <div className="space-y-2"><Label htmlFor="quick-task-date">Data</Label><Input id="quick-task-date" type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} /></div>
              <div className="space-y-2"><Label>Prioridade</Label><Select value={priority} onValueChange={(value) => setPriority(value as Priority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="high">Alta</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="quick-task-assignee">Responsável</Label><Input id="quick-task-assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-2"><Label htmlFor="quick-task-target">Meta</Label><Input id="quick-task-target" type="number" min={1} value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Opcional" /></div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="h-10 w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {mode === "task" ? (
            <Button type="button" className="h-10 w-full sm:w-auto" onClick={saveTask} disabled={!canSave || !!savingMode}>{savingMode === "task" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar tarefa</Button>
          ) : (
            <Button type="button" className="h-10 w-full sm:w-auto" onClick={() => save(false)} disabled={!canSave || !!savingMode}>{savingMode === "note" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar anotação</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
