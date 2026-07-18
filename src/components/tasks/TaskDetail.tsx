import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Check, CheckCircle2, Hash, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Priority, TaskPendingReason, WeeklyTask } from "@/hooks/useWeeklyTasks";
import { cn } from "@/lib/utils";

interface TaskDetailProps {
  task: WeeklyTask;
  pinned?: boolean;
  onTogglePinned?: () => void;
  onUpdate: (updates: Partial<WeeklyTask>) => void;
  onDelete: () => void;
  onAddSubtask: (title: string) => void;
  onUpdateSubtask: (id: string, updates: Partial<TaskPendingReason>) => void;
  onDeleteSubtask: (id: string) => void;
}

export function TaskDetail({ task, pinned, onTogglePinned, onUpdate, onDelete, onAddSubtask, onUpdateSubtask, onDeleteSubtask }: TaskDetailProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [quantity, setQuantity] = useState(task.progress_target === null ? "" : String(task.progress_target));
  const [progress, setProgress] = useState(String(task.progress_current || 0));
  const [subtaskTitle, setSubtaskTitle] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setQuantity(task.progress_target === null ? "" : String(task.progress_target));
    setProgress(String(task.progress_current || 0));
  }, [task]);

  const saveTitle = () => {
    const next = title.trim();
    if (next && next !== task.title) onUpdate({ title: next });
    else setTitle(task.title);
    setEditingTitle(false);
  };

  const saveDescription = () => {
    const next = description.trim();
    if (next !== (task.description || "")) onUpdate({ description: next || null });
  };

  const saveQuantity = () => {
    const nextTarget = quantity ? Math.max(1, Number(quantity) || 1) : null;
    const nextProgress = Math.max(0, Number(progress) || 0);
    onUpdate({
      progress_target: nextTarget,
      progress_current: nextProgress,
      ...(nextTarget && nextProgress >= nextTarget ? { status: "completed" as const } : {}),
    });
  };

  const addSubtask = () => {
    const next = subtaskTitle.trim();
    if (!next) return;
    onAddSubtask(next);
    setSubtaskTitle("");
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-3 sm:p-5 lg:p-7">
      <section className="overflow-hidden rounded-lg border border-border/65 bg-card/80 shadow-sm">
        <div className={cn("h-1", task.status === "completed" ? "bg-success" : task.priority === "high" ? "bg-destructive" : "bg-warning")} />
        <div className="space-y-5 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {editingTitle ? (
                <Input
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveTitle();
                    if (event.key === "Escape") { setTitle(task.title); setEditingTitle(false); }
                  }}
                  className="h-auto border-0 bg-transparent px-0 text-xl font-bold shadow-none focus-visible:ring-0 sm:text-2xl"
                />
              ) : (
                <button type="button" onClick={() => setEditingTitle(true)} className="group/title flex max-w-full items-start gap-2 text-left" title="Clique para alterar o título">
                  <h1 className={cn("break-words text-xl font-bold leading-tight sm:text-2xl", task.status === "completed" && "text-muted-foreground line-through")}>{task.title}</h1>
                  <Pencil className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100 group-focus-visible/title:opacity-100" />
                </button>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{task.status === "completed" ? "Concluída" : "Pendente"}</Badge>
                <Badge variant="secondary">{task.priority === "high" ? "Alta" : task.priority === "low" ? "Baixa" : "Média"}</Badge>
                {task.source_note_title && <Badge variant="outline">Anotação: {task.source_note_title}</Badge>}
              </div>
            </div>
            {onTogglePinned && <Button variant="ghost" size="icon" onClick={onTogglePinned} title={pinned ? "Desafixar tarefa" : "Fixar tarefa"}><Pin className={cn("h-4 w-4", pinned && "fill-warning text-warning")} /></Button>}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Data"><Input type="date" value={task.task_date} onChange={(event) => onUpdate({ task_date: event.target.value })} /></Field>
            <Field label="Prioridade"><Select value={task.priority} onValueChange={(value) => onUpdate({ priority: value as Priority })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="high">Alta</SelectItem></SelectContent></Select></Field>
            <Field label="Status"><Select value={task.status} onValueChange={(value) => onUpdate({ status: value as WeeklyTask["status"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendente</SelectItem><SelectItem value="completed">Concluída</SelectItem></SelectContent></Select></Field>
            <Field label="Responsável"><Input defaultValue={task.assignee || ""} onBlur={(event) => onUpdate({ assignee: event.target.value.trim() || null })} placeholder="Opcional" /></Field>
          </div>

          <Field label="Descrição">
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} onBlur={saveDescription} placeholder="Contexto opcional" className="min-h-24 resize-y" />
          </Field>

          <div className="grid gap-3 rounded-md border border-border/55 bg-background/35 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Quantidade"><Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Opcional" /></Field>
            <Field label="Concluído"><Input type="number" min={0} value={progress} onChange={(event) => setProgress(event.target.value)} /></Field>
            <Button variant="outline" className="h-10" onClick={saveQuantity}><Hash className="mr-2 h-4 w-4" />Atualizar</Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border/65 bg-card/70 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Subtarefas</h2>
          <Badge variant="secondary">{task.pending_reasons.filter((item) => !item.completed_at).length} abertas</Badge>
        </div>
        <div className="space-y-2">
          {task.pending_reasons.map((subtask) => <SubtaskRow key={subtask.id} subtask={subtask} onUpdate={(updates) => onUpdateSubtask(subtask.id, updates)} onDelete={() => onDeleteSubtask(subtask.id)} />)}
          {task.pending_reasons.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma subtarefa.</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <Input value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSubtask()} placeholder="Nova subtarefa" />
          <Button size="icon" onClick={addSubtask} disabled={!subtaskTitle.trim()} title="Adicionar subtarefa"><Plus className="h-4 w-4" /></Button>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Criada em {format(parseISO(task.created_at), "dd/MM/yyyy")}</span>
        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => window.confirm(`Excluir a tarefa "${task.title}"?`) && onDelete()}><Trash2 className="mr-2 h-4 w-4" />Excluir tarefa</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0 space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

function SubtaskRow({ subtask, onUpdate, onDelete }: { subtask: TaskPendingReason; onUpdate: (updates: Partial<TaskPendingReason>) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(subtask.reason);
  const save = () => { const next = title.trim(); if (next && next !== subtask.reason) onUpdate({ reason: next }); else setTitle(subtask.reason); setEditing(false); };
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-md border border-border/50 bg-background/35 px-2 py-1.5">
      <button type="button" onClick={() => onUpdate({ completed_at: subtask.completed_at ? null : new Date().toISOString() })} className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted" title={subtask.completed_at ? "Reabrir" : "Concluir"}>{subtask.completed_at ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Check className="h-4 w-4" />}</button>
      {editing ? <Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onBlur={save} onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") { setTitle(subtask.reason); setEditing(false); } }} className="h-8" /> : <button type="button" onClick={() => setEditing(true)} className={cn("min-w-0 flex-1 break-words text-left text-sm", subtask.completed_at && "text-muted-foreground line-through")}>{subtask.reason}</button>}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="Excluir subtarefa"><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
  );
}
