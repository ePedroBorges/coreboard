import { GamificationPanel } from "@/components/gamification/GamificationPanel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNotebooks } from "@/hooks/useNotebooks";
import { useAllPages } from "@/hooks/usePages";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useWeeklyTasks } from "@/hooks/useWeeklyTasks";
import { calculateGamificationStats } from "@/lib/gamification";
import { ArrowLeft, CheckCircle2, CircleHelp, NotebookPen, Trophy } from "lucide-react";
import { useMemo, type ElementType } from "react";
import { Navigate, useNavigate } from "react-router-dom";

export default function Achievements() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const notebooks = useNotebooks();
  const notes = useAllPages();
  const tasks = useWeeklyTasks();
  const settings = useUserSettings(user?.id);
  const completedChecklist = Object.values(settings.settings.validationChecklist).filter(Boolean).length;
  const stats = useMemo(() => calculateGamificationStats({
    tasks: tasks.data || [],
    notes: notes.data || [],
    notebookCount: notebooks.data?.length || 0,
    completedChecklist,
  }), [completedChecklist, notebooks.data?.length, notes.data, tasks.data]);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  return (
    <main className="h-svh overflow-y-auto overscroll-contain bg-background px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] [-webkit-overflow-scrolling:touch] sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-center gap-3 border-b border-border/60 pb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="Voltar"><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold sm:text-2xl">Níveis e conquistas</h1>
            <p className="text-sm text-muted-foreground">Acompanhe sua evolução no uso do VISTA.</p>
          </div>
        </header>

        <GamificationPanel stats={stats} />

        <section className="grid gap-3 md:grid-cols-3">
          <ProgressCard icon={CheckCircle2} title="Executar" text="Conclua tarefas e subtarefas para ganhar mais XP." />
          <ProgressCard icon={NotebookPen} title="Registrar" text="Crie anotações úteis e mantenha suas pastas organizadas." />
          <ProgressCard icon={Trophy} title="Consolidar" text="Complete marcos do perfil e mantenha uma rotina consistente." />
        </section>

        <details className="group rounded-md border border-border/60 bg-card/60 p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
            <CircleHelp className="h-4 w-4 text-primary" /> Como ganhar experiência
          </summary>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
            <p>+60 XP por tarefa concluída</p><p>+25 XP por subtarefa concluída</p>
            <p>+15 XP por anotação criada</p><p>+10 XP por anotação fixada</p>
            <p>+20 XP por pasta criada</p><p>+40 XP por marco do perfil</p>
          </div>
        </details>
      </div>
    </main>
  );
}

function ProgressCard({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return <div className="border-l-2 border-primary/60 bg-card/45 p-4"><Icon className="h-4 w-4 text-primary" /><h2 className="mt-3 text-sm font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>;
}
