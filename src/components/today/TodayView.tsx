import { useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  parseISO,
  startOfMonth,
} from "date-fns";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Link2,
  ListChecks,
  Loader2,
  NotebookPen,
  Pin,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getNotePreview,
  getNoteTags,
  getNoteTitle,
  pageHasChecklist,
  pageHasLink,
} from "@/lib/noteUtils";
import { Page } from "@/types/notes";
import { Priority, WeeklyTask } from "@/hooks/useWeeklyTasks";

type CaptureMode = "note" | "checklist" | "task";

interface TodayViewProps {
  tasks: WeeklyTask[];
  notes: Page[];
  tasksLoading: boolean;
  notesLoading: boolean;
  quickCapturePending: boolean;
  onQuickCapture: (input: { mode: CaptureMode; text: string }) => Promise<void>;
  onOpenAdvancedCapture: () => void;
  onOpenTasks: () => void;
  onOpenNotes: () => void;
  onOpenCalendar: () => void;
  onOpenNote: (page: Page) => void;
  onToggleTaskStatus: (task: WeeklyTask) => void;
  onCreateTaskFromPage: (page: Page) => void;
}

const priorityLabel: Record<Priority, string> = {
  low: "Baixa",
  medium: "M√©dia",
  high: "Alta",
};

const priorityRank: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function TodayView({
  tasks,
  notes,
  tasksLoading,
  notesLoading,
  quickCapturePending,
  onQuickCapture,
  onOpenAdvancedCapture,
  onOpenTasks,
  onOpenNotes,
  onOpenCalendar,
  onOpenNote,
  onToggleTaskStatus,
  onCreateTaskFromPage,
}: TodayViewProps) {
  const [captureText, setCaptureText] = useState("");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("note");

  const todayKey = format(new Date(), "yyyy-MM-dd");

  const todayTasks = useMemo(() => {
    return tasks
      .filter((task) => task.task_date === todayKey)
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
        if (priorityRank[a.priority] !== priorityRank[b.priority]) {
          return priorityRank[a.priority] - priorityRank[b.priority];
        }
        const aOpenReasons = a.pending_reasons.filter((reason) => !reason.completed_at).length;
        const bOpenReasons = b.pending_reasons.filter((reason) => !reason.completed_at).length;
        if (aOpenReasons !== bOpenReasons) return bOpenReasons - aOpenReasons;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 6);
  }, [tasks, todayKey]);

  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => {
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
      .slice(0, 6);
  }, [notes]);

  const stats = useMemo(() => {
    const pending = tasks.filter((task) => task.status === "pending").length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const openReasons = tasks.reduce(
      (total, task) => total + task.pending_reasons.filter((reason) => !reason.completed_at).length,
      0
    );
    return { total: tasks.length, pending, completed, openReasons };
  }, [tasks]);

  const handleSave = async () => {
    const text = captureText.trim();
    if (!text) return;
    await onQuickCapture({ mode: captureMode, text });
    setCaptureText("");
    setCaptureMode("note");
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:p-6 lg:gap-5">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Hoje</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Capture ideias, organize p·ginas e execute suas prioridades.
        </p>
      </section>

      <QuickCaptureBar
        value={captureText}
        mode={captureMode}
        pending={quickCapturePending}
        onChange={setCaptureText}
        onModeChange={setCaptureMode}
        onSave={handleSave}
        onOpenAdvancedCapture={onOpenAdvancedCapture}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <TodayPriorities
          tasks={todayTasks}
          loading={tasksLoading}
          onOpenTasks={onOpenTasks}
          onToggleTaskStatus={onToggleTaskStatus}
        />
        <RecentNotes
          notes={recentNotes}
          loading={notesLoading}
          onOpenNotes={onOpenNotes}
          onOpenNote={onOpenNote}
          onCreateTaskFromPage={onCreateTaskFromPage}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <CompactStats stats={stats} />
        <CollapsibleCalendar tasks={tasks} onOpenCalendar={onOpenCalendar} />
      </div>
    </div>
  );
}

function QuickCaptureBar({
  value,
  mode,
  pending,
  onChange,
  onModeChange,
  onSave,
  onOpenAdvancedCapture,
}: {
  value: string;
  mode: CaptureMode;
  pending: boolean;
  onChange: (value: string) => void;
  onModeChange: (mode: CaptureMode) => void;
  onSave: () => void;
  onOpenAdvancedCapture: () => void;
}) {
  const options: Array<{ value: CaptureMode; label: string; icon: React.ElementType }> = [
    { value: "note", label: "P·gina", icon: NotebookPen },
    { value: "checklist", label: "Checklist", icon: ListChecks },
    { value: "task", label: "Tarefa", icon: CheckCircle2 },
  ];

  return (
    <section className="rounded-lg border border-primary/20 bg-card/85 p-3 shadow-sm ring-1 ring-white/5 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-3">
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") onSave();
            }}
            placeholder="Escreva uma ideia, tarefa ou link..."
            className="min-h-24 resize-none bg-background/55 text-base leading-6 sm:text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={mode === option.value ? "secondary" : "outline"}
                  size="sm"
                  className="h-10 gap-2"
                  onClick={() => onModeChange(option.value)}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:w-44 lg:flex-col">
          <Button className="h-11 gap-2" onClick={onSave} disabled={!value.trim() || pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Salvar
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={onOpenAdvancedCapture}>
            Captura avan√ßada
          </Button>
        </div>
      </div>
    </section>
  );
}

function TodayPriorities({
  tasks,
  loading,
  onOpenTasks,
  onToggleTaskStatus,
}: {
  tasks: WeeklyTask[];
  loading: boolean;
  onOpenTasks: () => void;
  onToggleTaskStatus: (task: WeeklyTask) => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/65 bg-card/70 p-3 shadow-sm ring-1 ring-white/5 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Prioridades de hoje</h2>
          <p className="text-sm text-muted-foreground">O que precisa avan√ßar hoje.</p>
        </div>
        <Button variant="outline" size="sm" className="h-9" onClick={onOpenTasks}>
          Ver todas as tarefas
        </Button>
      </div>

      {loading ? (
        <LoadingPanel />
      ) : tasks.length === 0 ? (
        <EmptyPanel
          icon={ListChecks}
          text="Nenhuma prioridade para hoje. Crie uma tarefa ou transforme uma p·gina em aÁ„o."
        />
      ) : (
        <div className="grid gap-2">
          {tasks.map((task) => {
            const openReasons = task.pending_reasons.filter((reason) => !reason.completed_at).length;
            return (
              <article key={task.id} className="rounded-md border border-border/60 bg-background/40 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3
                      className={cn(
                        "break-words text-sm font-semibold leading-snug",
                        task.status === "completed" && "text-muted-foreground line-through"
                      )}
                    >
                      {task.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="rounded">
                        {priorityLabel[task.priority]}
                      </Badge>
                      {task.assignee && <Badge variant="secondary" className="rounded">{task.assignee}</Badge>}
                      {task.progress_target && (
                        <Badge variant="outline" className="rounded">
                          Meta {task.progress_current}/{task.progress_target}
                        </Badge>
                      )}
                      {task.source_note_title && (
                        <Badge variant="outline" className="rounded">
                          Origem: {task.source_note_title}
                        </Badge>
                      )}
                      {openReasons > 0 && (
                        <Badge variant="outline" className="rounded border-warning/40 text-warning">
                          {openReasons} pendencia(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={task.status === "completed" ? "outline" : "secondary"}
                    size="sm"
                    className="h-9 shrink-0 gap-1"
                    onClick={() => onToggleTaskStatus(task)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {task.status === "completed" ? "Reabrir" : "Concluir"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RecentNotes({
  notes,
  loading,
  onOpenNotes,
  onOpenNote,
  onCreateTaskFromPage,
}: {
  notes: Page[];
  loading: boolean;
  onOpenNotes: () => void;
  onOpenNote: (page: Page) => void;
  onCreateTaskFromPage: (page: Page) => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/65 bg-card/70 p-3 shadow-sm ring-1 ring-white/5 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">P·ginas recentes</h2>
          <p className="text-sm text-muted-foreground">Suas √∫ltimas ideias, links e checklists.</p>
        </div>
        <Button variant="outline" size="sm" className="h-9" onClick={onOpenNotes}>
          Ver p·ginas
        </Button>
      </div>

      {loading ? (
        <LoadingPanel />
      ) : notes.length === 0 ? (
        <EmptyPanel
          icon={NotebookPen}
          text="Nenhuma p·gina ainda. Capture uma ideia, link ou checklist para comeÁar."
        />
      ) : (
        <div className="grid gap-2">
          {notes.map((page) => (
            <article key={page.id} className="overflow-hidden rounded-md border border-border/60 bg-background/40 p-3">
              <button className="block w-full min-w-0 text-left" onClick={() => onOpenNote(page)}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug">{getNoteTitle(page)}</h3>
                  {page.is_favorite && <Pin className="h-4 w-4 shrink-0 fill-warning text-warning" />}
                </div>
                <p className="mt-2 line-clamp-2 break-all text-sm leading-6 text-muted-foreground">
                  {getNotePreview(page, 140)}
                </p>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {getNoteTags(page).slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full">
                    <Tag className="mr-1 h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
                {pageHasChecklist(page) && (
                  <Badge variant="outline" className="gap-1 rounded-full">
                    <ListChecks className="h-3 w-3" />
                    Checklist
                  </Badge>
                )}
                {pageHasLink(page) && (
                  <Badge variant="outline" className="gap-1 rounded-full">
                    <Link2 className="h-3 w-3" />
                    Link
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-8 gap-1"
                  onClick={() => onCreateTaskFromPage(page)}
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  Criar tarefa
                </Button>
              </div>
            </article>
          ))}
        </div>

      )}
    </section>
  );
}

function CompactStats({
  stats,
}: {
  stats: { total: number; pending: number; completed: number; openReasons: number };
}) {
  const items = [
    { label: "Total", value: stats.total, icon: ListChecks },
    { label: "Pendentes", value: stats.pending, icon: Clock3 },
    { label: "Conclu√≠das", value: stats.completed, icon: CheckCircle2 },
    { label: "Pend√™ncias", value: stats.openReasons, icon: CircleAlert },
  ];

  return (
    <section className="rounded-lg border border-border/60 bg-card/60 p-3 sm:p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Resumo</h2>
        <p className="text-xs text-muted-foreground">Um pulso r√°pido da sua execu√ß√£o.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-md border border-border/50 bg-background/35 p-3">
              <div className="flex items-center justify-between gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-xl font-semibold">{item.value}</span>
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CollapsibleCalendar({
  tasks,
  onOpenCalendar,
}: {
  tasks: WeeklyTask[];
  onOpenCalendar: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const today = new Date();
  const monthDays = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });
  const offset = (getDay(monthDays[0]) + 6) % 7;
  const visibleDays = [...Array.from({ length: offset }, (_, index) => addDays(monthDays[0], -offset + index)), ...monthDays];

  const countTasksOnDay = (day: Date) =>
    tasks.filter((task) => {
      if (!task.task_date) return false;
      return isSameDay(parseISO(task.task_date), day);
    }).length;

  return (
    <section className="rounded-lg border border-border/60 bg-card/60 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 text-primary" />
            Planejamento
          </h2>
          <p className="text-xs text-muted-foreground">Calend√°rio compacto para n√£o roubar o foco.</p>
        </div>
        <Button variant="outline" size="sm" className="h-9" onClick={onOpenCalendar}>
          Abrir calendario
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-3 h-9 w-full justify-between"
        onClick={() => setExpanded((current) => !current)}
      >
        <span>{format(today, "MMMM yyyy")}</span>
        <span>{expanded ? "Recolher" : "Ver calendario"}</span>
      </Button>

      {expanded && (
        <div className="mt-3">
          <div className="mb-1 grid grid-cols-7 text-center text-[10px] uppercase text-muted-foreground">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "S√°b", "Dom"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {visibleDays.map((day) => {
              const inMonth = day.getMonth() === today.getMonth();
              const count = countTasksOnDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex h-9 flex-col items-center justify-center rounded border border-border/45 text-[11px]",
                    isSameDay(day, today) && "border-primary/60 bg-primary/10 text-primary",
                    !inMonth && "opacity-35"
                  )}
                >
                  <span>{format(day, "dd")}</span>
                  {count > 0 && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-warning" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function LoadingPanel() {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-md border border-border/50 bg-background/35">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function EmptyPanel({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background/35 p-6 text-center">
      <Icon className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

