import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  ListChecks,
  Loader2,
  Pencil,
  Pin,
  Plus,
  Sparkles,
  Target,
  Trash2,
  UserRound,
} from "lucide-react";
import { useWeeklyTasks, TaskStatus, WeeklyTask, Priority, TaskPendingReason } from "@/hooks/useWeeklyTasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_NOTEBOOK_NAME } from "@/lib/noteUtils";
import { cn } from "@/lib/utils";
import { Notebook } from "@/types/notes";

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
  low: "border-muted-foreground/30 bg-muted/30 text-muted-foreground",
  medium: "border-warning/35 bg-warning/10 text-warning",
  high: "border-destructive/45 bg-destructive/10 text-destructive",
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i);
const monthName = (m: number) => format(new Date(2000, m, 1), "LLLL", { locale: ptBR });
const taskDateTime = (task: WeeklyTask, field: "task_date" | "completed_at" = "task_date") => {
  const rawDate = task[field] || task.task_date || task.created_at;
  const time = rawDate ? parseISO(rawDate).getTime() : Number.MAX_SAFE_INTEGER;
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

interface WeeklyTaskManagerProps {
  notebooks?: Notebook[];
  defaultNotebookId?: string;
  pinnedTaskIds?: string[];
  onTogglePinnedTask?: (taskId: string) => void;
}

export function WeeklyTaskManager({
  notebooks = [],
  defaultNotebookId,
  pinnedTaskIds = [],
  onTogglePinnedTask,
}: WeeklyTaskManagerProps) {
  const today = new Date();
  const [view, setView] = useState<"day" | "pending" | "completed" | "all">("day");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newTarget, setNewTarget] = useState<string>("");
  const [newDate, setNewDate] = useState<string>(format(today, "yyyy-MM-dd"));
  const [newNotebookId, setNewNotebookId] = useState<string>(defaultNotebookId || "none");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

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
      (total, task) => total + task.pending_reasons.filter((reason) => !reason.completed_at).length,
      0
    );
    return { total: tasks.length, pending, completed, openReasons };
  }, [tasks]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(new Date(year, month, 1));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [year, month]);

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

  const notebookTitleById = useMemo(() => {
    const map = new Map<string, string>();
    notebooks.forEach((notebook) => map.set(notebook.id, notebook.title));
    return map;
  }, [notebooks]);

  useEffect(() => {
    setNewNotebookId((current) => current === "none" && defaultNotebookId ? defaultNotebookId : current);
  }, [defaultNotebookId]);

  const handleCreateTask = () => {
    if (!newTitle.trim()) return;
    const target = newTarget.trim() ? Math.max(1, parseInt(newTarget, 10)) : null;
    const taskNotebookId = newNotebookId !== "none" ? newNotebookId : null;
    const taskNotebookTitle = taskNotebookId
      ? notebookTitleById.get(taskNotebookId) || DEFAULT_NOTEBOOK_NAME
      : undefined;
    createTask.mutate({
      title: newTitle.trim(),
      description: newDescription.trim(),
      assignee: newAssignee.trim(),
      priority: newPriority,
      progress_target: target,
      task_date: newDate || format(today, "yyyy-MM-dd"),
      notebook_id: taskNotebookId,
      source_notebook_title: taskNotebookTitle,
    });
    setNewTitle("");
    setNewDescription("");
    setNewAssignee("");
    setNewPriority("medium");
    setNewTarget("");
    setNewDate(format(selectedDay, "yyyy-MM-dd"));
    setNewNotebookId(defaultNotebookId || "none");
    setTaskDialogOpen(false);
  };

  const handleSelectDay = (day: Date) => {
    setSelectedDay(day);
    setNewDate(format(day, "yyyy-MM-dd"));
  };

  const handleGoToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    handleSelectDay(today);
  };

  const years = Array.from({ length: 7 }, (_, i) => today.getFullYear() - 3 + i);

  const displayedTasks = useMemo(() => {
    if (view === "day") return [...tasksForSelectedDay].sort((a, b) => taskDateTime(a) - taskDateTime(b));
    if (view === "pending") {
      return tasks
        .filter((task) => task.status === "pending")
        .sort((a, b) => taskDateTime(a) - taskDateTime(b));
    }
    if (view === "completed") {
      return tasks
        .filter((task) => task.status === "completed")
        .sort((a, b) => taskDateTime(b, "completed_at") - taskDateTime(a, "completed_at"));
    }
    return [...tasks].sort((a, b) => taskDateTime(a) - taskDateTime(b));
  }, [tasks, tasksForSelectedDay, view]);

  const viewTabs: Array<{ value: typeof view; label: string; shortLabel: string; icon: ReactNode }> = [
    { value: "day", label: "Por dia", shortLabel: "Por dia", icon: <CalendarDays className="h-3.5 w-3.5" /> },
    { value: "pending", label: "Pendentes", shortLabel: "Pendentes", icon: <Clock3 className="h-3.5 w-3.5" /> },
    { value: "completed", label: "Concluídas", shortLabel: "Concluídas", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    { value: "all", label: "Todas as tarefas", shortLabel: "Todas", icon: <ListChecks className="h-3.5 w-3.5" /> },
  ];

  const selectedDayLabel = format(selectedDay, "dd/MM/yyyy");
  const listTitle =
    view === "day"
      ? `Tarefas de ${selectedDayLabel}`
      : view === "pending"
        ? "Tarefas pendentes"
        : view === "completed"
          ? "Tarefas concluídas"
          : "Todas as tarefas";
  const listDescription =
    view === "day"
      ? "Planeje, conclua e registre bloqueios para a data selecionada."
      : view === "pending"
        ? "Todas as tarefas abertas, ordenadas pela data mais próxima."
        : view === "completed"
          ? "Histórico das tarefas finalizadas recentemente."
          : "Visão geral de tarefas pendentes e concluídas.";

  const focusSummary =
    tasks.length === 0
      ? "Tudo limpo por aqui. Crie uma tarefa ou registre uma ideia em Anotações."
      : stats.pending > 0
        ? `Você tem ${stats.pending} ${stats.pending === 1 ? "tarefa pendente" : "tarefas pendentes"}. Escolha uma prioridade e avance agora.`
        : "Todas as tarefas foram concluídas. Use Anotações para capturar o próximo movimento.";

  const emptyMessage =
    view === "completed"
      ? "Nenhuma tarefa concluída ainda. Finalize uma tarefa e acompanhe sua evolução."
      : view === "pending"
        ? "Nenhuma pendência no momento. Ótimo sinal."
        : view === "all"
          ? "Seu espaço de execução está vazio. Crie sua primeira tarefa do dia."
          : "Planeje uma tarefa ou escolha outro dia.";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:p-6 md:gap-4 lg:gap-6">
      <section className="space-y-2 md:hidden">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tarefas</h1>
        <p className="text-sm leading-6 text-muted-foreground">Planeje e conclua suas prioridades.</p>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Total" value={stats.total} icon={<ListChecks className="h-4 w-4" />} />
          <Metric label="Pendentes" value={stats.pending} tone="warning" icon={<Clock3 className="h-4 w-4" />} />
          <Metric label="Concluídas" value={stats.completed} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
          <Metric label="Pendências" value={stats.openReasons} tone="warning" icon={<CircleAlert className="h-4 w-4" />} />
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-border/60 bg-card/70 p-1">
          {viewTabs.map((item) => (
            <Button
              key={item.value}
              variant="ghost"
              size="sm"
              onClick={() => setView(item.value)}
              className={cn(
                "h-10 min-w-0 justify-start gap-2 rounded px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground",
                view === item.value && "bg-primary/15 text-primary ring-1 ring-primary/30 hover:bg-primary/20 hover:text-primary"
              )}
            >
              {item.icon}
              <span className="truncate">{item.shortLabel}</span>
            </Button>
          ))}
        </div>
        <Button className="h-11 w-full gap-2" onClick={() => setTaskDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova tarefa
        </Button>
      </section>

      <section className="hidden overflow-hidden rounded-lg border border-border/70 bg-card/80 shadow-sm ring-1 ring-white/5 md:block">
        <div className="border-b border-border/60 p-4 sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                AnchorLab Productivity
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Tarefas
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                Planeje ações por data, acompanhe pendências e conclua prioridades.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[540px]">
              <Metric label="Total" value={stats.total} icon={<ListChecks className="h-4 w-4" />} />
              <Metric label="Pendentes" value={stats.pending} tone="warning" icon={<Clock3 className="h-4 w-4" />} />
              <Metric label="Concluídas" value={stats.completed} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
              <Metric label="Pendências" value={stats.openReasons} tone="warning" icon={<CircleAlert className="h-4 w-4" />} />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="rounded-md border border-primary/15 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Target className="h-4 w-4 text-primary" />
                  Foco do dia
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{focusSummary}</p>
              </div>
              <div className="rounded-md border border-border/60 bg-background/45 px-3 py-2 text-xs text-muted-foreground">
                Organize o que precisa ser feito agora.
              </div>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto rounded-md border border-border/60 bg-background/45 p-1">
            {viewTabs.map((item) => (
              <Button
                key={item.value}
                variant="ghost"
                size="sm"
                onClick={() => setView(item.value)}
                className={cn(
                  "h-9 shrink-0 gap-2 rounded px-3 text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground",
                  view === item.value && "bg-primary/15 text-primary ring-1 ring-primary/30 hover:bg-primary/20 hover:text-primary"
                )}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>

          {view === "day" ? (
          <div className="rounded-md border border-border/60 bg-background/45 p-3 sm:p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Nova tarefa</h2>
                <p className="text-xs text-muted-foreground">Capture uma ação clara para hoje ou para outro dia.</p>
              </div>
              <span className="text-xs text-muted-foreground">Caderno e projeto/meta são opcionais.</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-6">
              <Input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleCreateTask()}
                placeholder="Título da tarefa"
                className="h-11 bg-card/80 sm:col-span-4"
              />
              <Input
                value={newAssignee}
                onChange={(event) => setNewAssignee(event.target.value)}
                placeholder="Responsável"
                className="h-11 bg-card/60 sm:col-span-2"
              />
              <Textarea
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder="Descrição (opcional)"
                className="min-h-11 resize-none bg-card/80 sm:col-span-6"
              />
              <Select value={newNotebookId} onValueChange={setNewNotebookId}>
                <SelectTrigger className="h-11 bg-card/80 sm:col-span-2">
                  <SelectValue placeholder="Caderno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem caderno</SelectItem>
                  {notebooks.map((notebook) => (
                    <SelectItem key={notebook.id} value={notebook.id}>
                      {notebook.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
                className="h-11 bg-card/80 sm:col-span-2"
                aria-label="Dia da tarefa"
              />
              <Select value={newPriority} onValueChange={(value) => setNewPriority(value as Priority)}>
                <SelectTrigger className="h-11 bg-card/80 sm:col-span-1"><SelectValue /></SelectTrigger>
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
                onChange={(event) => setNewTarget(event.target.value)}
                placeholder="Meta"
                className="h-11 bg-card/80 sm:col-span-1"
              />
              <Button
                onClick={handleCreateTask}
                className="h-11 w-full gap-2 sm:col-span-6"
                disabled={!newTitle.trim() || createTask.isPending}
              >
                {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar tarefa
              </Button>
            </div>
          </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-md border border-border/60 bg-background/45 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{listTitle}</h2>
                <p className="text-xs leading-5 text-muted-foreground">{listDescription}</p>
              </div>
              <Button className="h-10 shrink-0 gap-2" onClick={() => setTaskDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Nova tarefa
              </Button>
            </div>
          )}
        </div>
      </section>

      {view === "day" && (
        <section className="space-y-3 rounded-lg border border-border/60 bg-card/70 p-2.5 shadow-sm ring-1 ring-white/5 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="hidden md:block">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" />
                Planejamento por dia
              </h2>
              <p className="text-xs text-muted-foreground">
                Tarefas de <strong>{format(selectedDay, "dd/MM/yyyy")}</strong>
              </p>
            </div>
            <div className="md:hidden">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" />
                Planejamento por dia
              </h2>
              <p className="text-xs text-muted-foreground">
                Tarefas de <strong>{format(selectedDay, "dd/MM/yyyy")}</strong>
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center md:w-auto">
              <Select value={String(month)} onValueChange={(value) => setMonth(parseInt(value, 10))}>
                <SelectTrigger className="h-10 w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={String(m)}>{monthName(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(value) => setYear(parseInt(value, 10))}>
                <SelectTrigger className="h-10 w-full sm:w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="col-span-2 sm:col-span-1"
                variant="outline"
                size="sm"
                onClick={handleGoToToday}
              >
                Hoje
              </Button>
            </div>
          </div>

          <div>
            <div className="mx-auto mb-1 grid w-full max-w-md grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="mx-auto grid w-full max-w-md grid-cols-7 gap-1">
              {(() => {
                const first = monthDays[0];
                const offset = (getDay(first) + 6) % 7;
                const blanks = Array.from({ length: offset });
                return (
                  <>
                    {blanks.map((_, index) => <div key={`blank-${index}`} />)}
                    {monthDays.map((day) => {
                      const isSelected = isSameDay(day, selectedDay);
                      const isToday = isSameDay(day, today);
                      const dayTasks = tasksOnDay(day);
                      const count = dayTasks.length;
                      const hasPending = dayTasks.some((task) => task.status === "pending");
                      const hasCompleted = dayTasks.some((task) => task.status === "completed");

                      const tone = isToday
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : hasPending
                          ? "border-warning/60 bg-warning/10 text-warning"
                          : hasCompleted
                            ? "border-success/60 bg-success/10 text-success"
                            : "border-border/50 text-foreground hover:border-border hover:bg-secondary/40";

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => handleSelectDay(day)}
                          className={cn(
                            "relative flex h-10 min-w-0 flex-col items-center justify-center rounded-md border text-[11px] transition-colors sm:h-14 sm:text-xs",
                            tone,
                            isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          )}
                        >
                          <span className="text-xs font-semibold leading-none sm:text-sm">{format(day, "dd")}</span>
                          {count > 0 && (
                            <span
                              className={cn(
                                "mt-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-background",
                                isToday ? "bg-primary" : hasPending ? "bg-warning" : "bg-success"
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
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Hoje</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Pendentes</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Concluídas</span>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {listTitle}
            </h2>
            <p className="text-xs text-muted-foreground">
              {listDescription}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-52 items-center justify-center rounded-lg border border-border/60 bg-card/70">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-5 text-center sm:p-8">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ListChecks className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {view === "day" ? "Tudo limpo nesta data." : "Tudo limpo por aqui."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {displayedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={{
                  ...task,
                  source_notebook_title: task.source_notebook_title || (task.notebook_id ? notebookTitleById.get(task.notebook_id) : undefined),
                }}
                pinned={pinnedTaskIds.includes(task.id)}
                onTogglePinned={() => onTogglePinnedTask?.(task.id)}
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
      </section>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-h-[calc(100svh-7rem)] w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border-border/70 bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
            <DialogDescription>
              Planeje uma ação para {format(selectedDay, "dd/MM/yyyy")}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleCreateTask()}
              placeholder="Título da tarefa"
              className="h-11 bg-background/70"
            />
            <Textarea
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="Mini descrição"
              className="min-h-20 resize-none bg-background/70"
            />
            <Input
              type="date"
              value={newDate}
              onChange={(event) => setNewDate(event.target.value)}
              className="h-11 bg-background/70"
              aria-label="Dia da tarefa"
            />
            <Select value={newPriority} onValueChange={(value) => setNewPriority(value as Priority)}>
              <SelectTrigger className="h-11 bg-background/70"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newNotebookId} onValueChange={setNewNotebookId}>
              <SelectTrigger className="h-11 bg-background/70">
                <SelectValue placeholder="Caderno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem caderno</SelectItem>
                {notebooks.map((notebook) => (
                  <SelectItem key={notebook.id} value={notebook.id}>
                    {notebook.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={newAssignee}
              onChange={(event) => setNewAssignee(event.target.value)}
              placeholder="Responsável"
              className="h-11 bg-background/70"
            />
            <Input
              type="number"
              min={1}
              value={newTarget}
              onChange={(event) => setNewTarget(event.target.value)}
              placeholder="Projeto/Meta"
              className="h-11 bg-background/70"
            />
            <Button
              onClick={handleCreateTask}
              className="mt-1 h-11 gap-2"
              disabled={!newTitle.trim() || createTask.isPending}
            >
              {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar tarefa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const TaskCard = memo(function TaskCard({
  task,
  pinned,
  onTogglePinned,
  onUpdate,
  onDelete,
  onAddReason,
  onUpdateReason,
  onDeleteReason,
  onCompleteReason,
}: {
  task: WeeklyTask;
  pinned: boolean;
  onTogglePinned?: () => void;
  onUpdate: (updates: Partial<WeeklyTask>) => void;
  onDelete: () => void;
  onAddReason: (input: { reason: string; description?: string; responsible?: string; priority?: Priority; progress_target?: number | null }) => void;
  onUpdateReason: (id: string, updates: Partial<TaskPendingReason>) => void;
  onDeleteReason: (id: string) => void;
  onCompleteReason: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descriptionDraft, setDescriptionDraft] = useState(task.description || "");

  const [reason, setReason] = useState("");
  const [responsible, setResponsible] = useState("");
  const [rPriority, setRPriority] = useState<Priority>("medium");
  const [rTarget, setRTarget] = useState<string>("");

  const openReasons = task.pending_reasons.filter((pendingReason) => !pendingReason.completed_at).length;
  const statusColor = task.status === "completed" ? "bg-success" : "bg-warning";

  useEffect(() => {
    setTitleDraft(task.title);
    setDescriptionDraft(task.description || "");
  }, [task.description, task.title]);

  const handleSaveTitle = () => {
    const title = titleDraft.trim();
    if (title && title !== task.title) onUpdate({ title });
    setEditingTitle(false);
  };

  const handleSaveDescription = () => {
    const description = descriptionDraft.trim();
    if (description !== (task.description || "")) onUpdate({ description });
  };

  const handleAddReason = () => {
    if (!reason.trim()) return;
    onAddReason({
      reason: reason.trim(),
      responsible: responsible.trim(),
      priority: rPriority,
      progress_target: rTarget.trim() ? Math.max(1, parseInt(rTarget, 10)) : null,
    });
    setReason("");
    setResponsible("");
    setRPriority("medium");
    setRTarget("");
  };

  const handleTaskProgressCommit = (value: number) => {
    const reachedTarget = !!task.progress_target && value >= task.progress_target;
    onUpdate({
      progress_current: value,
          status: reachedTarget ? "completed" : "pending",
    });
  };

  return (
    <article className="group overflow-hidden rounded-lg border border-border/60 bg-card/80 shadow-sm transition-colors [content-visibility:auto] [contain-intrinsic-size:240px] hover:border-primary/35 hover:bg-card">
      <div className={cn("h-1 w-full", statusColor)} />
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 p-3 sm:flex sm:items-start sm:p-4">
        <button
          onClick={() => setExpanded((current) => !current)}
          className="mt-0.5 shrink-0 rounded-md border border-border/50 bg-background/40 p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Expandir tarefa"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            <h2 className={cn(
              "w-full whitespace-normal break-words text-sm font-semibold leading-snug text-foreground sm:w-auto sm:min-w-0 sm:flex-1 sm:text-base",
              task.status === "completed" && "text-muted-foreground line-through"
            )}>
              {task.title}
            </h2>
            <Badge variant="outline" className={cn("gap-1 rounded text-[10px]", priorityClass[task.priority])}>
              {priorityLabel[task.priority]}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 rounded text-[10px]",
                task.status === "completed" ? "border-success/40 text-success" : "border-warning/40 text-warning"
              )}
            >
              {task.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
              {statusLabel[task.status]}
            </Badge>
            {openReasons > 0 && (
              <Badge variant="secondary" className="rounded text-[10px]">{openReasons} pendência(s)</Badge>
            )}
            {task.progress_target && (
              <Badge variant="outline" className="rounded text-[10px]">
                {task.progress_current}/{task.progress_target}
              </Badge>
            )}
            {task.source_note_title && (
              <Badge variant="outline" className="rounded text-[10px]">
                Origem: {task.source_note_title}
              </Badge>
            )}
            {task.source_notebook_title && (
              <Badge variant="outline" className="rounded text-[10px]">
                Caderno: {task.source_notebook_title}
              </Badge>
            )}
          </div>
          {task.description && (
            <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
              {task.description}
            </p>
          )}
          <div className="mt-2 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
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

        <div className="col-span-2 flex gap-2 sm:col-span-1 sm:shrink-0">
          {onTogglePinned && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 sm:h-9 sm:w-9"
              onClick={onTogglePinned}
                        title={pinned ? "Desafixar tarefa" : "Fixar tarefa"}
            >
              <Pin className={cn("h-4 w-4", pinned && "fill-warning text-warning")} />
            </Button>
          )}
          <Button
            variant={task.status === "completed" ? "outline" : "secondary"}
            size="sm"
            className="h-10 flex-1 gap-1 sm:h-9 sm:flex-none"
            onClick={() => onUpdate({ status: task.status === "completed" ? "pending" : "completed" })}
          >
            <Check className="h-3.5 w-3.5" />
            <span>{task.status === "completed" ? "Reabrir" : "Concluir"}</span>
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-border/40 bg-background/25 p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
                    {editingTitle ? (
              <Input
                autoFocus
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSaveTitle();
                  if (event.key === "Escape") {
                    setTitleDraft(task.title);
                    setEditingTitle(false);
                  }
                }}
                className="h-10"
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-10 justify-start gap-2"
                onClick={() => {
                  setTitleDraft(task.title);
                  setEditingTitle(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar título
              </Button>
            )}
            <Select value={task.priority} onValueChange={(value) => onUpdate({ priority: value as Priority })}>
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

          <div className="space-y-2 rounded-md border border-border/50 bg-card/70 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Mini descrição
            </div>
            <Textarea
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              onBlur={handleSaveDescription}
              placeholder="Adicione um contexto rápido para esta tarefa"
              className="min-h-20 resize-none bg-background/45"
            />
          </div>

          {task.progress_target && (
            <div className="rounded-md border border-border/50 bg-card/70 p-3">
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

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pendências
            </div>

            <div className="space-y-2">
              {task.pending_reasons.map((pendingReason) => (
                <ReasonRow
                  key={pendingReason.id}
                  reason={pendingReason}
                  onUpdate={(updates) => onUpdateReason(pendingReason.id, updates)}
                  onComplete={() => onCompleteReason(pendingReason.id)}
                  onDelete={() => onDeleteReason(pendingReason.id)}
                />
              ))}
            </div>

            <div className="mt-3 grid gap-2 rounded-md border border-border/50 bg-card/70 p-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_140px_120px_120px_auto]">
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Motivo da pendência"
                className="min-h-10 resize-none"
              />
              <Input value={responsible} onChange={(event) => setResponsible(event.target.value)} placeholder="Responsável" className="h-10" />
              <Select value={rPriority} onValueChange={(value) => setRPriority(value as Priority)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={rTarget}
                onChange={(event) => setRTarget(event.target.value)}
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

  useEffect(() => {
    setDraft(reason.reason);
  }, [reason.reason]);

  const save = () => {
    const text = draft.trim();
    if (text && text !== reason.reason) onUpdate({ reason: text });
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
    <div className="rounded-md border border-border/40 bg-background/35 p-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-start">
        <div className="min-w-0 flex-1">
              {editing ? (
            <Textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={save}
              onKeyDown={(event) => {
                if (event.key === "Enter") save();
                if (event.key === "Escape") {
                  setDraft(reason.reason);
                  setEditing(false);
                }
              }}
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
            <span className="min-w-0 break-words">Responsável: {reason.responsible || "-"}</span>
            <span>Criada {format(parseISO(reason.created_at), "dd/MM/yyyy")}</span>
            {reason.completed_at && <span>Concluída {format(parseISO(reason.completed_at), "dd/MM/yyyy")}</span>}
          </div>
        </div>

        <Select value={reason.priority} onValueChange={(value) => onUpdate({ priority: value as Priority })} disabled={isDone}>
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
        <div className="mt-2 rounded-md border border-border/40 bg-background/40 p-2">
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

function Metric({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
  icon: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/45 p-3 text-left">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary",
          tone === "success" && "bg-success/10 text-success",
          tone === "warning" && "bg-warning/10 text-warning"
        )}>
          {icon}
        </span>
        <div className={cn("text-2xl font-semibold", tone === "success" && "text-success", tone === "warning" && "text-warning")}>
          {value}
        </div>
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
      onChange={(event) => {
        const nextValue = Number(event.target.value);
        draftRef.current = nextValue;
        setDraft(nextValue);
      }}
      className="h-8 w-full cursor-pointer touch-pan-y accent-primary [appearance:auto]"
    />
  );
}
