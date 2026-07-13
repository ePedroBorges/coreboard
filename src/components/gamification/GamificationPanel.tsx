import { Award, CheckCircle2, Gift, NotebookPen, Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GamificationStats, GAMIFICATION_REWARDS } from "@/lib/gamification";
import { cn } from "@/lib/utils";

interface GamificationPanelProps {
  stats: GamificationStats;
  compact: boolean;
}

export function GamificationPanel({ stats, compact = false }: GamificationPanelProps) {
  const visibleRewards = compact GAMIFICATION_REWARDS.slice(0, 3) : GAMIFICATION_REWARDS;

  return (
    <section className="overflow-hidden rounded-lg border border-primary/20 bg-card/80 shadow-sm ring-1 ring-white/5">
      <div className="border-b border-border/60 bg-primary/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Trophy className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nivel atual</p>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{stats.levelName}</h2>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit rounded-full">
            {stats.xp.toLocaleString("pt-BR")} XP
          </Badge>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{stats.xpToNextLevel} XP para o proximo nivel</span>
            <span>{stats.progressPercent}%</span>
          </div>
          <Progress value={stats.progressPercent} className="h-2" />
        </div>
      </div>

      <div className={cn("grid gap-3 p-4", compact "lg:grid-cols-[0.75fr_1.25fr]" : "lg:grid-cols-[0.85fr_1.15fr]")}>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          <Metric icon={CheckCircle2} label="Tarefas" value={stats.completedTasks} />
          <Metric icon={NotebookPen} label="Notas" value={stats.notesCreated} />
          <Metric icon={Award} label="Premios" value={stats.rewards.length} />
        </div>

        <div className="grid gap-2">
          {visibleRewards.map((reward) => {
            const unlocked = stats.level >= reward.level;
            return (
              <div
                key={reward.level}
                className={cn(
                  "flex gap-3 rounded-md border p-3",
                  unlocked "border-primary/30 bg-primary/10" : "border-border/60 bg-background/35"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    unlocked "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {unlocked <Gift className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{reward.title}</p>
                    <Badge variant={unlocked "secondary" : "outline"} className="rounded-full">
                      Nivel {reward.level}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{reward.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/35 p-3">
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-lg font-semibold">{value}</span>
      </div>
      <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
