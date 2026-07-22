import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Link2,
  ListChecks,
  Loader2,
  NotebookPen,
  Pin,
  Plus,
  Sparkles,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { GamificationStats } from "@/lib/gamification";
import {
  getNotePreview,
  getNoteTags,
  getNoteTitle,
  pageHasChecklist,
  pageHasLink,
} from "@/lib/noteUtils";
import { Page } from "@/types/notes";
import { Priority, WeeklyTask } from "@/hooks/useWeeklyTasks";
import { useSubscription } from "@/hooks/useSubscription";

type CaptureMode = "note" | "task";

interface TodayViewProps {
  tasks: WeeklyTask[];
  notes: Page[];
  tasksLoading: boolean;
  notesLoading: boolean;
  quickCapturePending: boolean;
  onQuickCapture: (input: { mode: CaptureMode; text: string }) => Promise<void>;
  onOpenAdvancedCapture: (mode: CaptureMode) => void;
  onOpenTasks: () => void;
  onOpenNotes: () => void;
  onOpenNote: (page: Page) => void;
  onOpenTask: (task: WeeklyTask) => void;
  onToggleTaskStatus: (task: WeeklyTask) => void;
  gamification: GamificationStats;
}

const priorityLabel: Record<Priority, string> = {
  low: "Baixa",
  medium: "Média",
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
  onOpenNote,
  onOpenTask,
  onToggleTaskStatus,
  gamification,
}: TodayViewProps) {
  const [captureText, setCaptureText] = useState("");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("note");
  const { isPro, loading: subscriptionLoading } = useSubscription();

  const todayKey = format(new Date(), "yyyy-MM-dd");

  const todayTasks = useMemo(() => {
    return tasks
      .filter((task) => task.task_date === todayKey && task.status === "pending")
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

  const handleSave = async () => {
    const text = captureText.trim();
    if (!text) return;
    await onQuickCapture({ mode: captureMode, text });
    setCaptureText("");
    setCaptureMode("note");
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:gap-4 sm:p-6 lg:gap-5">
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Hoje</h1>
        </div>
        <Link to="/conquistas" className="flex h-9 items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 text-xs transition-colors hover:border-primary/40 hover:bg-primary/15" title="Ver níveis, conquistas e formas de ganhar XP">
          <span className="font-semibold text-primary">{gamification.levelName}</span>
          <span className="text-muted-foreground">{gamification.xpToNextLevel} XP</span>
        </Link>
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

      {!subscriptionLoading && !isPro && <ProPromotion />}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <TodayPriorities
          tasks={todayTasks}
          loading={tasksLoading}
          onOpenTasks={onOpenTasks}
          onOpenTask={onOpenTask}
          onToggleTaskStatus={onToggleTaskStatus}
        />
        <RecentNotes
          notes={recentNotes}
          loading={notesLoading}
          onOpenNotes={onOpenNotes}
          onOpenNote={onOpenNote}
        />
      </div>

    </div>
  );
}

function ProPromotion() {
  return (
    <section className="flex flex-col gap-3 border-y border-primary/20 bg-primary/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Leve sua rotina mais longe com o CoreBoard Pro</p>
          <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
            Temas premium, lembretes, anexos e PDF. Assine ou garanta acesso vitalício.
          </p>
        </div>
      </div>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="h-10 w-full shrink-0 gap-2 border-primary/30 bg-background/50 text-primary hover:bg-primary/10 sm:w-auto"
      >
        <Link to="/planos">
          Ver planos
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Button>
    </section>
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
  onOpenAdvancedCapture: (mode: CaptureMode) => void;
}) {
  const options: Array<{ value: CaptureMode; label: string; icon: React.ElementType }> = [
    { value: "note", label: "Anotação", icon: NotebookPen },
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
            placeholder={mode === "task" ? "O que precisa ser feito?" : "Escreva uma anotação ou cole um link..."}
            className="min-h-20 resize-none bg-background/55 text-base leading-6 sm:min-h-24 sm:text-sm"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.value}
                  type="button"
                  variant={mode === option.value ? "secondary" : "outline"}
                  size="sm"
                  className="h-10 justify-center gap-2 px-2"
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
          <Button type="button" variant="outline" className="h-11" onClick={() => onOpenAdvancedCapture(mode)}>
            {mode === "task" ? "Configurar tarefa" : "Opções da anotação"}
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
  onOpenTask,
  onToggleTaskStatus,
}: {
  tasks: WeeklyTask[];
  loading: boolean;
  onOpenTasks: () => void;
  onOpenTask: (task: WeeklyTask) => void;
  onToggleTaskStatus: (task: WeeklyTask) => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/65 bg-card/70 p-3 shadow-sm ring-1 ring-white/5 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Tarefas de hoje</h2>
        </div>
        <Button variant="outline" size="sm" className="h-10 w-full sm:h-9 sm:w-auto" onClick={onOpenTasks}>
          Ver todas as tarefas
        </Button>
      </div>

      {loading ? (
        <LoadingPanel />
      ) : tasks.length === 0 ? (
        <EmptyPanel
          icon={ListChecks}
          title="Nenhuma tarefa"
        />
      ) : (
        <div className="grid gap-2">
          {tasks.map((task) => {
            const openReasons = task.pending_reasons.filter((reason) => !reason.completed_at).length;
            return (
              <article key={task.id} className="rounded-md border border-border/60 bg-background/40 p-3 transition-colors hover:border-primary/35 hover:bg-background/65">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <button type="button" className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/50" onClick={() => onOpenTask(task)} aria-label={`Abrir tarefa ${task.title}`}>
                    <h3
                      className={cn(
                        "break-words text-sm font-semibold leading-snug",
                        task.status === "completed" && "text-muted-foreground line-through"
                      )}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="rounded">
                        {priorityLabel[task.priority]}
                      </Badge>
                      {task.assignee && <Badge variant="secondary" className="rounded">{task.assignee}</Badge>}
                      {task.progress_target && (
                        <Badge variant="outline" className="rounded">
                          Quantidade {task.progress_current}/{task.progress_target}
                        </Badge>
                      )}
                      {task.source_note_title && (
                        <Badge variant="outline" className="rounded">
                          Origem: {task.source_note_title}
                        </Badge>
                      )}
                      {openReasons > 0 && (
                        <Badge variant="outline" className="rounded border-warning/40 text-warning">
                          {openReasons} subtarefa(s)
                        </Badge>
                      )}
                    </div>
                  </button>
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
}: {
  notes: Page[];
  loading: boolean;
  onOpenNotes: () => void;
  onOpenNote: (page: Page) => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border/65 bg-card/70 p-3 shadow-sm ring-1 ring-white/5 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Anotações recentes</h2>
        </div>
        {notes.length > 0 && (
          <Button variant="outline" size="sm" className="h-10 w-full sm:h-9 sm:w-auto" onClick={onOpenNotes}>
            Ver pastas
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingPanel />
      ) : notes.length === 0 ? (
        <EmptyPanel
          icon={NotebookPen}
          title="Nenhuma anotação ainda."
          text="Escreva uma ideia, salve um link ou crie um checklist."
          cta="Nova anotação"
          onAction={onOpenNotes}
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
                  <Badge key={tag} variant="secondary" className="max-w-full rounded-full">
                    <Tag className="mr-1 h-3 w-3" />
                    <span className="truncate">{tag}</span>
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
              </div>
            </article>
          ))}
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

function EmptyPanel({
  icon: Icon,
  title,
  text = "",
  cta,
  onAction,
}: {
  icon: React.ElementType;
  title: string;
  text?: string;
  cta?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background/35 p-6 text-center">
      <Icon className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {text && <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>}
      {cta && onAction && (
        <Button variant="outline" size="sm" className="mt-3 h-9" onClick={onAction}>
          {cta}
        </Button>
      )}
    </div>
  );
}


