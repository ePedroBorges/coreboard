import { Page } from "@/types/notes";
import { WeeklyTask } from "@/hooks/useWeeklyTasks";

export type LevelTier = "Bronze" | "Prata" | "Ouro" | "Platina" | "Diamante" | "Mestre";

export interface GamificationReward {
  level: number;
  title: string;
  description: string;
}

export interface GamificationStats {
  xp: number;
  level: number;
  tier: LevelTier;
  levelName: string;
  levelStartXp: number;
  nextLevelXp: number;
  progressPercent: number;
  xpToNextLevel: number;
  completedTasks: number;
  notesCreated: number;
  rewards: GamificationReward[];
  nextReward?: GamificationReward;
}

export const GAMIFICATION_REWARDS: GamificationReward[] = [
  {
    level: 5,
    title: "Selo Ritmo Inicial",
    description: "Um selo de perfil que reconhece sua primeira rotina consistente.",
  },
  {
    level: 10,
    title: "Título Organizador",
    description: "Exiba o título Organizador ao lado do seu nível.",
  },
  {
    level: 15,
    title: "Selo Executor",
    description: "Reconhecimento visual para quem transforma anotações em tarefas concluídas.",
  },
  {
    level: 20,
    title: "Selo Consistência",
    description: "Marco de perfil por manter captura, organização e execução em equilíbrio.",
  },
  {
    level: 30,
    title: "Status Mestre CoreBoard",
    description: "Nivel de dominio para usuarios com rotina consolidada de captura, organizacao e execucao.",
  },
];

const LEVEL_STEP = 140;

const TIER_BY_LEVEL: Array<{ min: number; tier: LevelTier }> = [
  { min: 30, tier: "Mestre" },
  { min: 20, tier: "Diamante" },
  { min: 15, tier: "Platina" },
  { min: 10, tier: "Ouro" },
  { min: 5, tier: "Prata" },
  { min: 1, tier: "Bronze" },
];

export function getTierForLevel(level: number): LevelTier {
  return TIER_BY_LEVEL.find((item) => level >= item.min)?.tier || "Bronze";
}

export function calculateGamificationStats({
  tasks,
  notes,
  notebookCount,
  completedChecklist,
}: {
  tasks: WeeklyTask[];
  notes: Page[];
  notebookCount: number;
  completedChecklist: number;
}): GamificationStats {
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const completedPendingReasons = tasks.reduce(
    (total, task) => total + task.pending_reasons.filter((reason) => !!reason.completed_at).length,
    0
  );
  const favoriteNotes = notes.filter((note) => note.is_favorite).length;

  const xp =
    completedTasks * 60 +
    completedPendingReasons * 25 +
    notes.length * 15 +
    favoriteNotes * 10 +
    notebookCount * 20 +
    completedChecklist * 40;

  const level = Math.max(1, Math.floor(xp / LEVEL_STEP) + 1);
  const levelStartXp = (level - 1) * LEVEL_STEP;
  const nextLevelXp = level * LEVEL_STEP;
  const xpInsideLevel = xp - levelStartXp;
  const progressPercent = Math.min(100, Math.round((xpInsideLevel / LEVEL_STEP) * 100));
  const tier = getTierForLevel(level);
  const rewards = GAMIFICATION_REWARDS.filter((reward) => level >= reward.level);
  const nextReward = GAMIFICATION_REWARDS.find((reward) => level < reward.level);

  return {
    xp,
    level,
    tier,
    levelName: `${tier} ${level}`,
    levelStartXp,
    nextLevelXp,
    progressPercent,
    xpToNextLevel: Math.max(0, nextLevelXp - xp),
    completedTasks,
    notesCreated: notes.length,
    rewards,
    nextReward,
  };
}
