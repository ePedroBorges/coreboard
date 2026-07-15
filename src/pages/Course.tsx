import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { jsPDF } from "jspdf";
import { ArrowLeft, Award, CheckCircle2, GraduationCap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

const lessons = [
  { id: "capture", title: "1. Capture sem interromper seu fluxo", text: "Use Hoje para registrar uma anotação ou tarefa rapidamente. Dê um título claro e refine depois dentro do caderno." },
  { id: "notebooks", title: "2. Organize com Cadernos", text: "Toda anotação pertence a um caderno. Use cadernos para áreas maiores e subpastas para projetos ou assuntos específicos." },
  { id: "notes", title: "3. Escreva e transforme ideias", text: "Escreva livremente na área principal. Abaixo, acrescente checklist e anexos. Quando houver uma próxima ação, crie uma tarefa a partir da anotação." },
  { id: "tasks", title: "4. Execute com tarefas e subtarefas", text: "Defina data e prioridade. Divida trabalhos maiores em subtarefas e conclua uma etapa por vez." },
  { id: "review", title: "5. Revise sua evolução", text: "Consulte Indicadores e Conquistas para entender sua rotina. Ajuste temas e preferências em Configurações." },
];

export default function Course() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const storageKey = `vistaCourseProgress:${user?.id || "guest"}`;
  const [completed, setCompleted] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });
  useEffect(() => {
    if (!user) return;
    try { setCompleted(JSON.parse(localStorage.getItem(storageKey) || "[]")); } catch { setCompleted([]); }
  }, [storageKey, user]);
  const percent = Math.round((completed.length / lessons.length) * 100);
  const finished = completed.length === lessons.length;
  const toggle = (id: string) => {
    const next = completed.includes(id) ? completed.filter((item) => item !== id) : [...completed, id];
    setCompleted(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const completedSet = useMemo(() => new Set(completed), [completed]);

  const downloadCertificate = () => {
    if (!finished) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFillColor(5, 15, 30); doc.rect(0, 0, 297, 210, "F");
    doc.setTextColor(0, 170, 255); doc.setFontSize(18); doc.text("VISTA Tasks Control", 148.5, 42, { align: "center" });
    doc.setTextColor(245, 248, 252); doc.setFontSize(30); doc.text("Certificado de conclusão", 148.5, 75, { align: "center" });
    doc.setFontSize(15); doc.text("Certificamos que", 148.5, 98, { align: "center" });
    doc.setFontSize(20); doc.text(user?.email || "Usuário VISTA", 148.5, 116, { align: "center" });
    doc.setFontSize(14); doc.text("concluiu o curso Primeiros passos no VISTA Tasks Control.", 148.5, 137, { align: "center" });
    doc.setTextColor(160, 174, 192); doc.setFontSize(11); doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")} por AnchorLab Studio`, 148.5, 170, { align: "center" });
    doc.save("certificado-vista-tasks-control.pdf");
  };

  if (!loading && !user) return <Navigate to="/auth" replace />;
  return (
    <main className="min-h-svh bg-background px-3 pb-10 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex items-center gap-3 border-b border-border/60 pb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="Voltar"><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-xl font-semibold sm:text-2xl">Aprenda a usar o VISTA</h1><p className="text-sm text-muted-foreground">Curso rápido, direto e baseado no uso real.</p></div>
        </header>
        <section className="flex items-center gap-4 border-l-2 border-primary bg-card/45 p-4">
          <GraduationCap className="h-7 w-7 shrink-0 text-primary" />
          <div className="min-w-0 flex-1"><div className="flex justify-between text-sm"><span>{completed.length} de {lessons.length} aulas</span><span>{percent}%</span></div><Progress value={percent} className="mt-2 h-2" /></div>
        </section>
        <div className="divide-y divide-border/60 border-y border-border/60">
          {lessons.map((lesson) => <article key={lesson.id} className="flex gap-3 py-5"><Checkbox checked={completedSet.has(lesson.id)} onCheckedChange={() => toggle(lesson.id)} className="mt-1" /><div><h2 className="font-semibold">{lesson.title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{lesson.text}</p></div></article>)}
        </div>
        <section className="flex flex-col gap-3 border border-border/60 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><Award className="h-5 w-5 text-primary" /><div><h2 className="text-sm font-semibold">Certificado do curso</h2><p className="text-sm text-muted-foreground">Disponível após concluir todas as aulas.</p></div></div>
          <Button onClick={downloadCertificate} disabled={!finished} className="gap-2"><CheckCircle2 className="h-4 w-4" />Gerar certificado</Button>
        </section>
      </div>
    </main>
  );
}
