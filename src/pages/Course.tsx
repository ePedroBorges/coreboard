import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings } from "@/hooks/useUserSettings";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { ArrowLeft, Award, BookOpen, CheckCircle2, ChevronDown, GraduationCap, LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const modules = [
  {
    id: "fundamentos",
    title: "Módulo 1 · Fundamentos",
    lessons: [
      { id: "capture", title: "Capture sem interromper o fluxo", text: "Use Hoje para registrar rapidamente uma ideia ou uma tarefa. Capture primeiro, depois abra o item para completar data, prioridade, quantidade e contexto." },
      { id: "folders", title: "Organize com pastas e subpastas", text: "Toda anotação pertence a uma pasta. Use subpastas para projetos ou assuntos específicos e mantenha a estrutura curta o bastante para encontrar o conteúdo sem esforço." },
    ],
  },
  {
    id: "execucao",
    title: "Módulo 2 · Da ideia à execução",
    lessons: [
      { id: "notes", title: "Escreva anotações úteis", text: "Use o texto livre como área principal. Acrescente checklist, anexos e imagens apenas quando eles ajudarem. Um título claro e um conteúdo pesquisável tornam a anotação útil no futuro." },
      { id: "tasks", title: "Transforme intenção em tarefa", text: "Crie tarefas a partir da anotação quando existir uma próxima ação. Defina prioridade e data, e divida trabalhos maiores em subtarefas que possam ser concluídas de forma objetiva." },
    ],
  },
  {
    id: "rotina",
    title: "Módulo 3 · Rotina e continuidade",
    lessons: [
      { id: "offline", title: "Trabalhe também sem internet", text: "As alterações feitas offline ficam no dispositivo. Ao reconectar, o VISTA envia as operações pendentes e busca as atualizações feitas em outros dispositivos." },
      { id: "review", title: "Revise e personalize", text: "Use filtros de tarefas para revisar pendências e concluídas. Ajuste tema, movimento e sons nas configurações para criar um ambiente confortável para sua rotina." },
    ],
  },
];

const questions = [
  { id: "q1", text: "Onde registrar algo rapidamente?", options: ["Na tela Hoje", "Somente em Configurações", "No perfil"], answer: 0 },
  { id: "q2", text: "Quando uma ideia deve virar tarefa?", options: ["Sempre", "Quando houver uma próxima ação", "Somente no fim do mês"], answer: 1 },
  { id: "q3", text: "O que acontece com alterações feitas offline?", options: ["São descartadas", "Ficam apenas na memória", "São guardadas e sincronizadas ao reconectar"], answer: 2 },
  { id: "q4", text: "Como organizar projetos dentro de uma pasta?", options: ["Com subpastas", "Criando outra conta", "Pelo plano de assinatura"], answer: 0 },
];

const lessons = modules.flatMap((module) => module.lessons);
const estimatedHours = 3;

type CourseState = { completed: string[]; answers: Record<string, number>; score: number | null };
const emptyState: CourseState = { completed: [], answers: {}, score: null };

export default function Course() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const userSettings = useUserSettings(user?.id);
  const storageKey = `vistaTraining:v2:${user?.id || "guest"}`;
  const [course, setCourse] = useState<CourseState>(emptyState);

  useEffect(() => {
    if (!user) return;
    try { setCourse({ ...emptyState, ...JSON.parse(localStorage.getItem(storageKey) || "{}") }); }
    catch { setCourse(emptyState); }
  }, [storageKey, user]);

  const save = (next: CourseState) => {
    setCourse(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const completedSet = useMemo(() => new Set(course.completed), [course.completed]);
  const lessonsDone = course.completed.length === lessons.length;
  const passed = (course.score ?? 0) >= 80;
  const percent = Math.round((course.completed.length / lessons.length) * 100);

  const toggleLesson = (id: string) => {
    const completed = completedSet.has(id) ? course.completed.filter((item) => item !== id) : [...course.completed, id];
    save({ ...course, completed });
  };

  const submitQuiz = () => {
    if (!lessonsDone) return;
    if (Object.keys(course.answers).length !== questions.length) {
      toast.error("Responda todas as questões antes de finalizar.");
      return;
    }
    const correct = questions.filter((question) => course.answers[question.id] === question.answer).length;
    const score = Math.round((correct / questions.length) * 100);
    save({ ...course, score });
    toast[score >= 80 ? "success" : "error"](score >= 80 ? "Avaliação concluída. Certificado liberado." : "Revise as aulas e tente novamente.");
  };

  const downloadCertificate = () => {
    if (!passed || !user) return;
    const profile = userSettings.settings.profile;
    const fullName = profile.fullName || user.user_metadata?.full_name || user.email || "Usuário VISTA";
    const cpfDigits = profile.cpf.replace(/\D/g, "");
    const maskedCpf = cpfDigits.length === 11 ? `***.${cpfDigits.slice(3, 6)}.${cpfDigits.slice(6, 9)}-**` : "não informado";
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFillColor(3, 11, 25); doc.rect(0, 0, 297, 210, "F");
    doc.setDrawColor(8, 184, 255); doc.setLineWidth(1); doc.rect(11, 11, 275, 188);
    doc.setTextColor(8, 184, 255); doc.setFontSize(17); doc.text("VISTA Tasks Control · AnchorLab Studio", 148.5, 35, { align: "center" });
    doc.setTextColor(245, 248, 252); doc.setFontSize(29); doc.text("Certificado interno de conclusão", 148.5, 63, { align: "center" });
    doc.setFontSize(14); doc.text("Certificamos que", 148.5, 82, { align: "center" });
    doc.setFontSize(21); doc.text(fullName, 148.5, 101, { align: "center" });
    doc.setFontSize(11); doc.text(`CPF: ${maskedCpf}`, 148.5, 112, { align: "center" });
    doc.setFontSize(13); doc.text("concluiu o curso Primeiros passos no VISTA Tasks Control", 148.5, 130, { align: "center" });
    doc.setTextColor(170, 184, 202); doc.setFontSize(10);
    doc.text(`Carga horária estimada: ${estimatedHours} horas · Avaliação: ${course.score}% · Emissão: ${new Date().toLocaleDateString("pt-BR")}`, 148.5, 147, { align: "center" });
    doc.text("Grade: Fundamentos · Da ideia à execução · Rotina e continuidade", 148.5, 160, { align: "center" });
    doc.setTextColor(125, 139, 158); doc.setFontSize(8);
    doc.text("Curso livre interno, não credenciado e sem equivalência acadêmica ou profissional.", 148.5, 183, { align: "center" });
    doc.save("certificado-interno-vista-tasks-control.pdf");
  };

  if (!loading && !user) return <Navigate to="/auth" replace />;
  return (
    <main className="h-svh overflow-y-auto overscroll-contain bg-background px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] [-webkit-overflow-scrolling:touch] sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-center gap-3 border-b border-border/60 pb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="Voltar" className="hidden lg:inline-flex"><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0 flex-1"><p className="text-xs font-medium uppercase text-primary">Desenvolvimento VISTA</p><h1 className="mt-1 text-xl font-semibold sm:text-2xl">Central de treinamento</h1></div>
          <GraduationCap className="h-6 w-6 text-primary" />
        </header>

        <section className="grid gap-4 border border-border/60 bg-card/55 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><h2 className="font-semibold">Primeiros passos no VISTA Tasks Control</h2><p className="mt-1 text-sm text-muted-foreground">3 módulos · 6 aulas · {estimatedHours} horas estimadas</p><Progress value={percent} className="mt-3 h-2" /></div>
          <span className="text-sm font-semibold text-primary">{percent}% concluído</span>
        </section>

        <div className="space-y-3">
          {modules.map((module, moduleIndex) => (
            <details key={module.id} className="group border border-border/60 bg-card/35" open={moduleIndex === 0}>
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-semibold"><BookOpen className="h-4 w-4 text-primary" /><span className="flex-1">{module.title}</span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
              <div className="divide-y divide-border/50 border-t border-border/50">
                {module.lessons.map((lesson) => <article key={lesson.id} className="flex gap-3 p-4 sm:p-5"><Checkbox checked={completedSet.has(lesson.id)} onCheckedChange={() => toggleLesson(lesson.id)} className="mt-1" /><div><h3 className="font-medium">{lesson.title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{lesson.text}</p></div></article>)}
              </div>
            </details>
          ))}
        </div>

        <section className={cn("border border-border/60 bg-card/45 p-4 sm:p-5", !lessonsDone && "opacity-75")}>
          <div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Avaliação final</h2><p className="text-sm text-muted-foreground">Aproveitamento mínimo: 80%.</p></div></div>
          {lessonsDone ? <div className="mt-5 space-y-5">{questions.map((question, index) => <fieldset key={question.id}><legend className="text-sm font-semibold">{index + 1}. {question.text}</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{question.options.map((option, optionIndex) => <button type="button" key={option} onClick={() => save({ ...course, answers: { ...course.answers, [question.id]: optionIndex }, score: null })} className={cn("min-h-11 border border-border bg-background/40 px-3 py-2 text-left text-sm transition-colors hover:border-primary/50", course.answers[question.id] === optionIndex && "border-primary bg-primary/10 text-primary")}>{option}</button>)}</div></fieldset>)}<Button onClick={submitQuiz}>Finalizar avaliação</Button>{course.score !== null && <p className={cn("text-sm font-semibold", passed ? "text-success" : "text-destructive")}>Resultado: {course.score}%</p>}</div> : <p className="mt-4 text-sm text-muted-foreground">Conclua as seis aulas para liberar a avaliação.</p>}
        </section>

        <section className="flex flex-col gap-3 border-l-2 border-primary bg-card/55 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><Award className="h-5 w-5 text-primary" /><div><h2 className="text-sm font-semibold">Certificado interno</h2><p className="text-sm text-muted-foreground">Inclui grade curricular, duração estimada e os dados salvos no perfil.</p></div></div>
          <Button onClick={downloadCertificate} disabled={!passed} className="gap-2"><CheckCircle2 className="h-4 w-4" />Gerar certificado</Button>
        </section>
        <p className="text-center text-xs leading-5 text-muted-foreground">Curso livre interno, não credenciado e sem equivalência acadêmica ou profissional.</p>
      </div>
    </main>
  );
}
