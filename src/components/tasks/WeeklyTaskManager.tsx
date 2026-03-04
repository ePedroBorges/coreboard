import { useState, useMemo, useCallback } from "react";
import { useWeeklyTasks, useTaskHistory, TaskStatus, WeeklyTask } from "@/hooks/useWeeklyTasks";
import {
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  format,
  isSameDay,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Check,
  Clock,
  Sparkles,
  History,
  X,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; barColor: string }> = {
  added: { label: "Incluída", color: "text-primary", barColor: "bg-primary" },
  completed: { label: "Concluída", color: "text-success", barColor: "bg-success" },
  pending: { label: "Pendente", color: "text-warning", barColor: "bg-warning" },
};

export function WeeklyTaskManager() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [newTaskDay, setNewTaskDay] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editingTask, setEditingTask] = useState<WeeklyTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const { data: tasks = [], createTask, updateTask, deleteTask } = useWeeklyTasks(currentWeekStart);
  const { data: historyTasks = [] } = useTaskHistory();

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const kpis = useMemo(() => {
    const added = tasks.filter((t) => t.status === "added").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    return { added, completed, pending, total: tasks.length };
  }, [tasks]);

  const historyByWeek = useMemo(() => {
    const map = new Map<string, { added: number; completed: number; pending: number }>();
    historyTasks.forEach((t) => {
      const entry = map.get(t.week_start) || { added: 0, completed: 0, pending: 0 };
      entry[t.status]++;
      map.set(t.week_start, entry);
    });
    return Array.from(map.entries())
      .map(([week, stats]) => ({ week, ...stats }))
      .sort((a, b) => b.week.localeCompare(a.week));
  }, [historyTasks]);

  const handleAddTask = useCallback(() => {
    if (!newTaskTitle.trim() || !newTaskDay) return;
    try {
      createTask.mutate({ title: newTaskTitle.trim(), task_date: newTaskDay });
    } catch (e) {
      console.error("Error creating task:", e);
    }
    setNewTaskTitle("");
    setNewTaskDay(null);
  }, [newTaskTitle, newTaskDay, createTask]);

  const cycleStatus = useCallback((task: WeeklyTask) => {
    const order: TaskStatus[] = ["added", "pending", "completed"];
    const next = order[(order.indexOf(task.status) + 1) % 3];
    try {
      updateTask.mutate({ id: task.id, status: next as any });
    } catch (e) {
      console.error("Error updating task:", e);
    }
  }, [updateTask]);

  const handleEditSave = useCallback(() => {
    if (!editingTask || !editTitle.trim()) return;
    try {
      updateTask.mutate({ id: editingTask.id, title: editTitle.trim() });
    } catch (e) {
      console.error("Error editing task:", e);
    }
    setEditingTask(null);
  }, [editingTask, editTitle, updateTask]);

  const handleDeleteTask = useCallback((id: string) => {
    try {
      deleteTask.mutate(id);
    } catch (e) {
      console.error("Error deleting task:", e);
    }
  }, [deleteTask]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-bold truncate">Tarefas da Semana</h2>
          <p className="text-[11px] text-muted-foreground font-mono-accent">
            {format(currentWeekStart, "dd/MM", { locale: ptBR })} — {format(addDays(currentWeekStart, 6), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setShowHistory(true)}>
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setCurrentWeekStart((w) => subWeeks(w, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-mono-accent h-10 px-3"
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Hoje
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setCurrentWeekStart((w) => addWeeks(w, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <KpiMini label="Incluídas" value={kpis.added} barColor="bg-primary" />
        <KpiMini label="Concluídas" value={kpis.completed} barColor="bg-success" />
        <KpiMini label="Pendentes" value={kpis.pending} barColor="bg-warning" />
      </div>

      {/* Weekly Grid - stack on mobile, 7 cols on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayTasks = tasks.filter((t) => t.task_date === dateStr);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dateStr}
              className={cn(
                "rounded-md border border-border/50 p-3 min-h-[80px] sm:min-h-[120px] flex flex-col",
                isToday && "border-primary/40 bg-primary/[0.03]"
              )}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "font-mono-accent text-xs font-semibold",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )}>
                    {format(day, "dd/MM")}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60 capitalize">
                    {format(day, "EEE", { locale: ptBR })}
                  </span>
                </div>
                <button
                  onClick={() => { setNewTaskDay(dateStr); setNewTaskTitle(""); }}
                  className="p-2 rounded-md hover:bg-muted transition-colors active:bg-muted/80 min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Add task inline */}
              {newTaskDay === dateStr && (
                <div className="flex gap-1 mb-2">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTask();
                      if (e.key === "Escape") setNewTaskDay(null);
                    }}
                    placeholder="Nova tarefa..."
                    className="h-10 text-sm flex-1"
                    autoFocus
                  />
                  <button onClick={handleAddTask} className="p-2 rounded-md hover:bg-muted min-h-[40px] min-w-[40px] flex items-center justify-center">
                    <Check className="h-4 w-4 text-success" />
                  </button>
                  <button onClick={() => setNewTaskDay(null)} className="p-2 rounded-md hover:bg-muted min-h-[40px] min-w-[40px] flex items-center justify-center">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* Tasks */}
              <div className="flex-1 space-y-1.5">
                {dayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onCycleStatus={() => cycleStatus(task)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onEdit={() => { setEditingTask(task); setEditTitle(task.title); }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Editar tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
              className="text-sm h-11"
              autoFocus
            />
            <div className="flex gap-2">
              {(["added", "pending", "completed"] as TaskStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (editingTask) {
                      try {
                        updateTask.mutate({ id: editingTask.id, status: s as any });
                      } catch (e) {
                        console.error(e);
                      }
                    }
                    setEditingTask(null);
                  }}
                  className={cn(
                    "flex-1 rounded-md border border-border/50 py-3 text-xs font-medium transition-colors hover:bg-muted active:bg-muted/80 min-h-[48px]",
                    editingTask?.status === s && "border-primary bg-primary/5"
                  )}
                >
                  <div className={cn("h-1.5 w-6 rounded-full mx-auto mb-1.5", STATUS_CONFIG[s].barColor)} />
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
            <Button size="lg" className="w-full" onClick={handleEditSave}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de KPIs
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {historyByWeek.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum histórico</p>
            )}
            {historyByWeek.map((week) => {
              const ws = parseISO(week.week);
              const total = week.added + week.completed + week.pending;
              return (
                <div key={week.week} className="rounded-md border border-border/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono-accent text-[11px] text-muted-foreground">
                      {format(ws, "dd/MM")} — {format(addDays(ws, 6), "dd/MM/yyyy")}
                    </span>
                    <span className="font-mono-accent text-[11px] text-foreground font-medium">{total}</span>
                  </div>
                  <div className="flex gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      {week.added} incl.
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      {week.completed} concl.
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-warning" />
                      {week.pending} pend.
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="flex h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-primary" style={{ width: `${(week.added / total) * 100}%` }} />
                      <div className="bg-success" style={{ width: `${(week.completed / total) * 100}%` }} />
                      <div className="bg-warning" style={{ width: `${(week.pending / total) * 100}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskCard({
  task,
  onCycleStatus,
  onDelete,
  onEdit,
}: {
  task: WeeklyTask;
  onCycleStatus: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const config = STATUS_CONFIG[task.status];

  return (
    <div className="group/task rounded border border-border/30 overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-2">
        <button
          onClick={onCycleStatus}
          className="shrink-0 p-1.5 rounded-md hover:bg-muted active:bg-muted/80 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          title={`Status: ${config.label}`}
        >
          {task.status === "completed" ? (
            <Check className="h-4 w-4 text-success" />
          ) : task.status === "pending" ? (
            <Clock className="h-4 w-4 text-warning" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary" />
          )}
        </button>
        <span
          className={cn(
            "text-sm flex-1 truncate cursor-pointer",
            task.status === "completed" && "line-through text-muted-foreground"
          )}
          onClick={onEdit}
        >
          {task.title}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted active:bg-muted/80 min-h-[36px] min-w-[36px] flex items-center justify-center">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 active:bg-destructive/20 min-h-[36px] min-w-[36px] flex items-center justify-center">
            <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
          </button>
        </div>
      </div>
      <div className={cn("h-[3px] w-full", config.barColor)} />
    </div>
  );
}

function KpiMini({ label, value, barColor }: { label: string; value: number; barColor: string }) {
  return (
    <div className="rounded-md border border-border/50 p-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground font-mono-accent uppercase tracking-wider mb-1.5">{label}</div>
      <div className={cn("h-1 w-10 rounded-full mx-auto", barColor)} />
    </div>
  );
}
