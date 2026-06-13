import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  CheckCircle2,
  Clock3,
  History,
  Loader2,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { useWeeklyTasks, TaskStatus, WeeklyTask } from "@/hooks/useWeeklyTasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusLabel: Record<TaskStatus, string> = {
  pending: "Pendente",
  completed: "Concluida",
};

export function WeeklyTaskManager() {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [filter, setFilter] = useState<"all" | TaskStatus>("pending");

  const {
    data: tasks = [],
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    addPendingReason,
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

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  const handleCreateTask = () => {
    if (!title.trim()) return;
    createTask.mutate({ title: title.trim(), assignee: assignee.trim() });
    setTitle("");
    setAssignee("");
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Manager</h1>
          <p className="text-sm text-muted-foreground">
            Controle tarefas, responsaveis e motivos de pendencia da equipe.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Metric label="Total" value={stats.total} />
          <Metric label="Pendentes" value={stats.pending} tone="warning" />
          <Metric label="Concluidas" value={stats.completed} tone="success" />
          <Metric label="Pendencias" value={stats.openReasons} tone="warning" />
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-card p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleCreateTask()}
            placeholder="Titulo da tarefa"
            className="h-11"
          />
          <Input
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleCreateTask()}
            placeholder="Responsavel"
            className="h-11"
          />
          <Button onClick={handleCreateTask} className="h-11 gap-2" disabled={!title.trim() || createTask.isPending}>
            {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar tarefa
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { value: "pending", label: "Pendentes" },
          { value: "completed", label: "Concluidas" },
          { value: "all", label: "Todas" },
        ].map((item) => (
          <Button
            key={item.value}
            variant={filter === item.value ? "secondary" : "outline"}
            size="sm"
            onClick={() => setFilter(item.value as typeof filter)}
            className="shrink-0"
          >
            {item.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma tarefa neste filtro.
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={(status) => updateTask.mutate({ id: task.id, status })}
              onDelete={() => deleteTask.mutate(task.id)}
              onAddReason={(reason, responsible) =>
                addPendingReason.mutate({ taskId: task.id, reason, responsible })
              }
              onCompleteReason={(id) => completePendingReason.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onAddReason,
  onCompleteReason,
}: {
  task: WeeklyTask;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
  onAddReason: (reason: string, responsible: string) => void;
  onCompleteReason: (id: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [responsible, setResponsible] = useState("");
  const openReasons = task.pending_reasons.filter((item) => !item.completed_at).length;

  const handleAddReason = () => {
    if (!reason.trim()) return;
    onAddReason(reason.trim(), responsible.trim());
    setReason("");
    setResponsible("");
  };

  return (
    <article className="rounded-md border border-border/60 bg-card p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "gap-1",
                task.status === "completed"
                  ? "border-success/40 text-success"
                  : "border-warning/40 text-warning"
              )}
            >
              {task.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
              {statusLabel[task.status]}
            </Badge>
            {openReasons > 0 && <Badge variant="secondary">{openReasons} pendencia(s) aberta(s)</Badge>}
          </div>

          <h2
            className={cn(
              "break-words text-base font-semibold",
              task.status === "completed" && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </h2>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" />
              {task.assignee || "Sem responsavel"}
            </span>
            <span>Criada em {format(new Date(task.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
            {task.completed_at && (
              <span>Concluida em {format(new Date(task.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 lg:shrink-0">
          <Button
            variant={task.status === "completed" ? "outline" : "secondary"}
            size="sm"
            onClick={() => onStatusChange(task.status === "completed" ? "pending" : "completed")}
            className="flex-1 gap-2 lg:flex-none"
          >
            <Check className="h-4 w-4" />
            {task.status === "completed" ? "Reabrir" : "Concluir"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {task.status === "pending" && (
        <div className="mt-4 rounded-md border border-border/50 bg-background/40 p-3">
          <div className="grid gap-2 lg:grid-cols-[1fr_200px_auto]">
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motivo da pendencia"
              className="min-h-20 resize-none"
            />
            <Input
              value={responsible}
              onChange={(event) => setResponsible(event.target.value)}
              placeholder="Responsavel pela pendencia"
              className="h-11"
            />
            <Button onClick={handleAddReason} disabled={!reason.trim()} className="h-11 gap-2">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
      )}

      {task.pending_reasons.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Historico de pendencias
          </div>
          {task.pending_reasons.map((item) => (
            <div key={item.id} className="rounded-md border border-border/40 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className={cn("break-words text-sm", item.completed_at && "text-muted-foreground line-through")}>
                    {item.reason}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>Adicionada em {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}</span>
                    <span>Responsavel: {item.responsible || "Nao informado"}</span>
                    {item.completed_at && (
                      <span>Concluida em {format(new Date(item.completed_at), "dd/MM/yyyy HH:mm")}</span>
                    )}
                  </div>
                </div>
                {!item.completed_at && (
                  <Button variant="outline" size="sm" onClick={() => onCompleteReason(item.id)} className="gap-2">
                    <Check className="h-4 w-4" />
                    Resolver
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
}) {
  return (
    <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-center">
      <div className={cn("text-lg font-bold", tone === "success" && "text-success", tone === "warning" && "text-warning")}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
