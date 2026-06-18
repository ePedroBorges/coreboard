import { memo, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { useWeeklyTasks, TaskStatus, WeeklyTask, Priority, TaskPendingReason } from "@/hooks/useWeeklyTasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const statusLabel: Record<TaskStatus, string> = {
  pending: "Pendente",
  completed: "Concluída",
};

const priorityLabel: Record<Priority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

const priorityClass: Record<Priority, string> = {
  low: "border-muted-foreground/30 text-muted-foreground",
  medium: "border-warning/40 text-warning",
  high: "border-destructive/50 text-destructive",
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i);
const monthName = (m: number) => format(new Date(2000, m, 1), "LLLL", { locale: ptBR });

export function WeeklyTaskManager() {
  const today = new Date();
  const [view, setView] = useState<"day" | "pending" | "completed" | "all">("day");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  // create-task form
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newTarget, setNewTarget] = useState<string>("");
  const [newDate, setNewDate] = useState<string>(format(today, "yyyy-MM-dd"));

  const {
    data: tasks = [],
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    addPendingReason,
    updatePendingReason,
    deletePendingReason,
    completePendingReason,
  } = useWeeklyTasks();

  const stats = useMemo(() => {
    const pending = tasks.filter((task) => task.status === "pending").length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const openReasons = tasks.reduce(
      (total, task) => total + task.pending_reasons.filter((r) => !r.completed_at).length,
      0
    );
    return { total: tasks.length, pending, completed, openReasons };
  }, [tasks]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(new Date(year, month, 1));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [year, month]);

  /**
   * Day rule:
   * - Completed task → appears ONLY on its completion day.
   * - Pending task → appears on its assigned task_date.
   */
  const tasksOnDay = (day: Date) =>
    tasks.filter((task) => {
      if (task.status === "completed" && task.completed_at) {
        return isSameDay(parseISO(task.completed_at), day);
      }
      if (task.task_date) {
        return isSameDay(parseISO(task.task_date), day);
      }
      return false;
    });

  const tasksForSelectedDay = useMemo(
    () => tasksOnDay(selectedDay),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, selectedDay]
  );

  const handleCreateTask = () => {
    if (!newTitle.trim()) return;
    const target = newTarget.trim() ? Math.max(1, parseInt(newTarget, 10)) : null;
    createTask.mutate({
      title: newTitle.trim(),
      assignee: newAssignee.trim(),
      priority: newPriority,
      progress_target: target,
      task_date: newDate || format(today, "yyyy-MM-dd"),
    });
    setNewTitle("");
    setNewAssignee("");
    setNewPriority("medium");
    setNewTarget("");
    setNewDate(format(selectedDay, "yyyy-MM-dd"));
  };

  const years = Array.from({ length: 7 }, (_, i) => today.getFullYear() - 3 + i);

  const displayedTasks = useMemo(() => {
    if (view === "day") return tasksForSelectedDay;
    if (view === "pending") return tasks.filter((task) => task.status === "pending");
    if (view === "completed") return tasks.filter((task) => task.status === "completed");
    return tasks;
  }, [tasks, tasksForSelectedDay, view]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:p-6">
      {/* Header + KPIs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Manager</h1>
          <p className="text-sm text-muted-foreground">
            Visualize tarefas por dia, controle pendências e prioridades.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Metric label="Total" value={stats.total} />
          <Metric label="Pendentes" value={stats.pending} tone="warning" />
          <Metric label="Concluídas" value={stats.completed} tone="success" />
          <Metric label="Pendências" value={stats.openReasons} tone="warning" />
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { value: "day", label: "Por dia" },
          { value: "pending", label: "Pendentes" },
          { value: "completed", label: "Concluídas" },
          { value: "all", label: "Todas as Tarefas" },
        ].map((item) => (
          <Button
            key={item.value}
            variant={view === item.value ? "secondary" : "outline"}
            size="sm"
            onClick={() => setView(item.value as typeof view)}
            className="shrink-0"
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* Create task */}
      <div className="rounded-md border border-border/60 bg-card p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px_150px_110px_110px_auto]">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
            placeholder="Título da tarefa"
            className="h-11"
          />
          <Input
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            placeholder="Responsável"
            className="h-11"
          />
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="h-11"
            aria-label="Dia da tarefa"
          />
          <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            placeholder="Meta"
            className="h-11"
          />
          <Button onClick={handleCreateTask} className="h-11 gap-2 sm:col-span-2 lg:col-span-1" disabled={!newTitle.trim() || createTask.isPending}>
            {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar
          </Button>
        </div>
      </div>


      {/* Day picker (only for day view) */}
      {view === "day" && (
        <div className="rounded-md border border-border/60 bg-card p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v, 10))}>
              <SelectTrigger className="h-10 w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={String(m)}>{monthName(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v, 10))}>
              <SelectTrigger className="h-10 w-full sm:w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="col-span-2 sm:col-span-1" variant="outline" size="sm" onClick={() => {
              setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today);
            }}>
              Hoje
            </Button>
          </div>

          {/* Calendar grid (7 columns) */}
          <div>
            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mx-auto grid max-w-md grid-cols-7 gap-1">

              {(() => {
                // Pad with blanks so first day-of-month lines up under its weekday (Mon=0)
                const first = monthDays[0];
                const offset = (getDay(first) + 6) % 7; // Mon=0 ... Sun=6
                const blanks = Array.from({ length: offset });
                return (
                  <>
                    {blanks.map((_, i) => <div key={`b-${i}`} />)}
                    {monthDays.map((day) => {
                      const isSelected = isSameDay(day, selectedDay);
                      const isToday = isSameDay(day, today);
                      const dayTasks = tasksOnDay(day);
                      const count = dayTasks.length;
                      const hasPending = dayTasks.some((t) => t.status === "pending");
                      const hasCompleted = dayTasks.some((t) => t.status === "completed");

                      const tone = isToday
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : hasPending
                          ? "border-destructive/60 bg-destructive/10 text-destructive"
                          : hasCompleted
                            ? "border-success/60 bg-success/10 text-success"
                            : "border-border/50 text-foreground hover:border-border";

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDay(day)}
                          className={cn(
                            "relative flex aspect-square min-h-[40px] flex-col items-center justify-center rounded-md border text-xs transition-colors",
                            tone,
                            isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          )}
                        >
                          <span className="text-sm font-semibold leading-none">{format(day, "dd")}</span>
                          {count > 0 && (
                            <span
                              className={cn(
                                "mt-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-background",
                                isToday ? "bg-primary" : hasPending ? "bg-destructive" : "bg-success"
                              )}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </>
                );
              })()}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Hoje</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Pendentes</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Concluídas</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Tarefas de <strong>{format(selectedDay, "dd/MM/yyyy")}</strong>
          </div>

        </div>
      )}

      {/* Task list */}
      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : displayedTasks.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma tarefa para exibir.
        </div>
      ) : (
        <div className="grid gap-2">
          {displayedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={(updates) => updateTask.mutate({ id: task.id, ...updates })}
              onDelete={() => deleteTask.mutate(task.id)}
              onAddReason={(input) => addPendingReason.mutate({ taskId: task.id, ...input })}
              onUpdateReason={(id, updates) => updatePendingReason.mutate({ id, ...updates })}
              onDeleteReason={(id) => deletePendingReason.mutate(id)}
              onCompleteReason={(id) => completePendingReason.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------- Task card (collapsed by default) -------------- */
const TaskCard = memo(function TaskCard({
  task,
  onUpdate,
  onDelete,
  onAddReason,
  onUpdateReason,
  onDeleteReason,
  onCompleteReason,
}: {
  task: WeeklyTask;
  onUpdate: (updates: Partial<WeeklyTask>) => void;
  onDelete: () => void;
  onAddReason: (input: { reason: string; responsible?: string; priority?: Priority; progress_target?: number | null }) => void;
  onUpdateReason: (id: string, updates: Partial<TaskPendingReason>) => void;
  onDeleteReason: (id: string) => void;
  onCompleteReason: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);

  // pending-reason form
  const [reason, setReason] = useState("");
  const [responsible, setResponsible] = useState("");
  const [rPriority, setRPriority] = useState<Priority>("medium");
  const [rTarget, setRTarget] = useState<string>("");

  const openReasons = task.pending_reasons.filter((r) => !r.completed_at).length;
  const statusColor = task.status === "completed" ? "bg-success" : "bg-warning";

  const handleSaveTitle = () => {
    const t = titleDraft.trim();
    if (t && t !== task.title) onUpdate({ title: t });
    setEditingTitle(false);
  };

  const handleAddReason = () => {
    if (!reason.trim()) return;
    onAddReason({
      reason: reason.trim(),
      responsible: responsible.trim(),
      priority: rPriority,
      progress_target: rTarget.trim() ? Math.max(1, parseInt(rTarget, 10)) : null,
    });
    setReason(""); setResponsible(""); setRPriority("medium"); setRTarget("");
  };

  const handleTaskProgressCommit = (value: number) => {
    const reachedTarget = !!task.progress_target && value >= task.progress_target;
    onUpdate({
      progress_current: value,
      status: reachedTarget ? "completed" : "pending",
    });
  };

  return (
    <article className="overflow-hidden rounded-md border border-border/60 bg-card shadow-sm">
      {/* Collapsed header */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 p-3 sm:flex sm:items-center sm:p-4">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 rounded p-1 hover:bg-accent"
          aria-label="Expandir"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            <h2 className={cn(
              "w-full whitespace-normal break-words text-sm font-semibold leading-snug sm:w-auto sm:min-w-0 sm:flex-1 sm:text-base",
              task.status === "completed" && "text-muted-foreground line-through"
            )}>
              {task.title}
            </h2>
            <Badge variant="outline" className={cn("gap-1 text-[10px]", priorityClass[task.priority])}>
              {priorityLabel[task.priority]}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 text-[10px]",
                task.status === "completed" ? "border-success/40 text-success" : "border-warning/40 text-warning"
              )}
            >
              {task.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
              {statusLabel[task.status]}
            </Badge>
            {openReasons > 0 && (
              <Badge variant="secondary" className="text-[10px]">{openReasons} pendência(s)</Badge>
            )}
            {task.progress_target && (
              <Badge variant="outline" className="text-[10px]">
                {task.progress_current}/{task.progress_target}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1 break-words">
              <UserRound className="h-3 w-3 shrink-0" />
              <span className="min-w-0 break-words">{task.assignee || "Sem responsável"}</span>
            </span>
            <span>Criada {format(parseISO(task.created_at), "dd/MM/yyyy")}</span>
            {task.completed_at && (
              <span>Concluída {format(parseISO(task.completed_at), "dd/MM/yyyy")}</span>
            )}
          </div>
        </div>

        <Button
          variant={task.status === "completed" ? "outline" : "secondary"}
          size="sm"
          className="col-span-2 h-10 gap-1 sm:col-span-1 sm:h-9 sm:shrink-0"
          onClick={() => onUpdate({ status: task.status === "completed" ? "pending" : "completed" })}
        >
          <Check className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {task.status === "completed" ? "Reabrir" : "Concluir"}
          </span>
        </Button>
      </div>

      {/* Status bar */}
      <div className={cn("h-1 w-full", statusColor)} />

      {/* Expanded body */}
      {expanded && (
        <div className="space-y-4 border-t border-border/40 p-3 sm:p-4">
          {/* Edit row: title + priority + progress */}
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
            {editingTitle ? (
              <Input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); }
                }}
                className="h-10"
              />
            ) : (
              <Button variant="outline" size="sm" className="h-10 justify-start gap-2" onClick={() => { setTitleDraft(task.title); setEditingTitle(true); }}>
                <Pencil className="h-3.5 w-3.5" />
                Editar título
              </Button>
            )}
            <Select value={task.priority} onValueChange={(v) => onUpdate({ priority: v as Priority })}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-10 w-10 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress controls */}
          {task.progress_target && (
            <div className="rounded border border-border/50 bg-background/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Progresso da meta</span>
                <span className="text-sm font-semibold">
                  {task.progress_current}/{task.progress_target}
                </span>
              </div>
              <FluidProgressRange
                max={task.progress_target}
                value={Math.min(task.progress_current, task.progress_target)}
                onCommit={handleTaskProgressCommit}
              />
            </div>
          )}

          {/* Pending reasons */}
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pendências
            </div>

            {/* List */}
            <div className="space-y-2">
              {task.pending_reasons.map((r) => (
              <ReasonRow
                  key={r.id}
                  reason={r}
                  onUpdate={(updates) => onUpdateReason(r.id, updates)}
                  onComplete={() => onCompleteReason(r.id)}
                  onDelete={() => onDeleteReason(r.id)}
                />
              ))}
            </div>

            {/* Add form */}
            <div className="mt-3 grid gap-2 rounded border border-border/50 bg-background/40 p-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_140px_120px_100px_auto]">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo da pendência"
                className="min-h-10 resize-none"
              />
              <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Responsável" className="h-10" />
              <Select value={rPriority} onValueChange={(v) => setRPriority(v as Priority)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number" min={1}
                value={rTarget}
                onChange={(e) => setRTarget(e.target.value)}
                placeholder="Meta"
                className="h-10"
              />
              <Button onClick={handleAddReason} disabled={!reason.trim()} className="h-10 gap-1 sm:col-span-2 xl:col-span-1">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
});

function ReasonRow({
  reason,
  onUpdate,
  onComplete,
  onDelete,
}: {
  reason: TaskPendingReason;
  onUpdate: (updates: Partial<TaskPendingReason>) => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reason.reason);

  const isDone = !!reason.completed_at;

  const save = () => {
    const t = draft.trim();
    if (t && t !== reason.reason) onUpdate({ reason: t });
    setEditing(false);
  };

  const handleReasonProgressCommit = (value: number) => {
    const reachedTarget = !!reason.progress_target && value >= reason.progress_target;
    onUpdate({
      progress_current: value,
      completed_at: reachedTarget ? new Date().toISOString() : null,
    });
  };

  return (
    <div className="rounded border border-border/40 p-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-start">
        <div className="min-w-0 flex-1">
          {editing ? (
            <Textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setDraft(reason.reason); setEditing(false); } }}
              className="min-h-10 resize-none text-sm"
            />
          ) : (
            <button
              onClick={() => !isDone && setEditing(true)}
              className={cn(
                "block w-full whitespace-normal break-words text-left text-sm leading-snug",
                isDone && "text-muted-foreground line-through",
                !isDone && "hover:underline"
              )}
            >
              {reason.reason}
            </button>
          )}
          <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
            <span className="min-w-0 break-words">Responsável: {reason.responsible || "—"}</span>
            <span>Criada {format(parseISO(reason.created_at), "dd/MM/yyyy")}</span>
            {reason.completed_at && <span>Concluída {format(parseISO(reason.completed_at), "dd/MM/yyyy")}</span>}
          </div>
        </div>

        <Select value={reason.priority} onValueChange={(v) => onUpdate({ priority: v as Priority })} disabled={isDone}>
          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>

        {!isDone && (
          <>
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={onComplete}>
              <Check className="h-3.5 w-3.5" /> Resolver
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {reason.progress_target && (
        <div className="mt-2 rounded border border-border/40 bg-background/40 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">Progresso</span>
            <span className="text-xs font-semibold">{reason.progress_current}/{reason.progress_target}</span>
          </div>
          <FluidProgressRange
            max={reason.progress_target}
            value={Math.min(reason.progress_current, reason.progress_target)}
            onCommit={handleReasonProgressCommit}
          />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "success" | "warning" }) {
  return (
    <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-center">
      <div className={cn("text-lg font-bold", tone === "success" && "text-success", tone === "warning" && "text-warning")}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function FluidProgressRange({
  value,
  max,
  onCommit,
}: {
  value: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [dragging, setDragging] = useState(false);
  const draftRef = useRef(value);
  const lastCommitRef = useRef(value);

  useEffect(() => {
    if (!dragging) {
      setDraft(value);
      draftRef.current = value;
      lastCommitRef.current = value;
    }
  }, [dragging, value]);

  const commit = () => {
    setDragging(false);
    const nextValue = draftRef.current;
    if (nextValue !== lastCommitRef.current) {
      lastCommitRef.current = nextValue;
      onCommit(nextValue);
    }
  };

  return (
    <input
      type="range"
      min={0}
      max={max}
      value={draft}
      onPointerDown={() => setDragging(true)}
      onPointerUp={commit}
      onPointerCancel={commit}
      onTouchEnd={commit}
      onMouseUp={commit}
      onBlur={commit}
      onKeyUp={commit}
      onChange={(e) => {
        const nextValue = Number(e.target.value);
        draftRef.current = nextValue;
        setDraft(nextValue);
      }}
      className="h-8 w-full cursor-pointer touch-pan-y accent-primary [appearance:auto]"
    />
  );
}

