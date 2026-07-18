import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { format } from "date-fns";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TodayView } from "@/components/today/TodayView";
import { WeeklyTaskManager } from "@/components/tasks/WeeklyTaskManager";
import type { WeeklyTask } from "@/hooks/useWeeklyTasks";

const taskMutations = vi.hoisted(() => ({
  createTask: { mutate: vi.fn(), isPending: false },
  updateTask: { mutate: vi.fn() },
  deleteTask: { mutate: vi.fn() },
  addPendingReason: { mutate: vi.fn() },
  updatePendingReason: { mutate: vi.fn() },
  deletePendingReason: { mutate: vi.fn() },
  completePendingReason: { mutate: vi.fn() },
}));

const tasks = vi.hoisted(() => [] as WeeklyTask[]);

vi.mock("@/hooks/useWeeklyTasks", () => ({
  useWeeklyTasks: () => ({
    data: tasks,
    isLoading: false,
    ...taskMutations,
  }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({ isPro: true, loading: false }),
}));

const makeTask = (overrides: Partial<WeeklyTask> = {}): WeeklyTask => ({
  id: crypto.randomUUID(),
  user_id: "user-1",
  title: "Preparar relatório",
  description: null,
  task_date: format(new Date(), "yyyy-MM-dd"),
  status: "pending",
  week_start: format(new Date(), "yyyy-MM-dd"),
  assignee: null,
  priority: "medium",
  progress_current: 0,
  progress_target: null,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  pending_reasons: [],
  ...overrides,
});

const renderWithProviders = (component: React.ReactNode) => render(
  <BrowserRouter>
    <TooltipProvider>{component}</TooltipProvider>
  </BrowserRouter>,
);

describe("task experience simplification", () => {
  beforeEach(() => {
    tasks.splice(0, tasks.length, makeTask());
    vi.clearAllMocks();
  });

  it("mantém a Home focada em tarefas pendentes e anotações recentes", () => {
    const completedTask = makeTask({ id: "completed", title: "Tarefa concluída", status: "completed" });
    renderWithProviders(
      <TodayView
        tasks={[tasks[0], completedTask]}
        notes={[]}
        tasksLoading={false}
        notesLoading={false}
        quickCapturePending={false}
        onQuickCapture={vi.fn()}
        onOpenAdvancedCapture={vi.fn()}
        onOpenTasks={vi.fn()}
        onOpenNotes={vi.fn()}
        onOpenNote={vi.fn()}
        onToggleTaskStatus={vi.fn()}
        gamification={{ level: 1, levelName: "Iniciante", tier: "Bronze", xp: 0, levelStartXp: 0, nextLevelXp: 100, xpToNextLevel: 100, progressPercent: 0, completedTasks: 0, notesCreated: 0, rewards: [] }}
      />,
    );

    expect(screen.getByText("Tarefas de hoje")).toBeInTheDocument();
    expect(screen.getByText("Anotações recentes")).toBeInTheDocument();
    expect(screen.queryByText("Tarefa concluída")).not.toBeInTheDocument();
    expect(screen.queryByText("Resumo")).not.toBeInTheDocument();
    expect(screen.queryByText("Planejamento")).not.toBeInTheDocument();
  });

  it("abre edição e subtarefas ao clicar na própria tarefa", () => {
    const { container } = renderWithProviders(<WeeklyTaskManager />);
    const taskButton = container.querySelector<HTMLButtonElement>('[aria-label="Abrir detalhes da tarefa Preparar relatório"]');
    expect(taskButton).not.toBeNull();
    fireEvent.click(taskButton!);

    expect(container.querySelector('[aria-label="Fechar detalhes da tarefa Preparar relatório"]')).not.toBeNull();
    expect(screen.getByText("Editar título")).toBeInTheDocument();
    expect(screen.getByText("Subtarefas")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Quantidade (opcional)")).toBeInTheDocument();
  });
});
