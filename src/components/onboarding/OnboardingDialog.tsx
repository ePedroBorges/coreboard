import { useState } from "react";
import { BookOpen, CalendarDays, CheckCircle2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Capture tudo rapidamente",
    text: "Salve ideias, links, checklists e tarefas antes que se percam.",
    icon: NotebookPen,
  },
  {
    title: "Organize em cadernos",
    text: "Separe suas anotações por projetos, estudos, clientes ou áreas da vida.",
    icon: BookOpen,
  },
  {
    title: "Transforme anotações em tarefas",
    text: "Crie tarefas a partir das suas anotações e acompanhe tudo no Calendário.",
    icon: CalendarDays,
  },
];

interface OnboardingDialogProps {
  open: boolean;
  onFinish: () => void;
}

export function OnboardingDialog({ open, onFinish }: OnboardingDialogProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const Icon = step.icon;
  const isLast = stepIndex === steps.length - 1;

  const finish = () => {
    setStepIndex(0);
    onFinish();
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] rounded-lg border-border/70 bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:max-w-md sm:p-6"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription className="leading-6">{step.text}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={cn(
                "h-1.5 flex-1 rounded-full bg-muted",
                index <= stepIndex && "bg-primary"
              )}
            />
          ))}
        </div>

        <div className="rounded-md border border-border/60 bg-background/35 p-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            VISTA Tasks Control
          </div>
          <p className="mt-1 leading-6">Um fluxo simples para capturar, organizar e executar.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={finish}>Pular</Button>
          {isLast ? (
            <Button onClick={finish}>Começar agora</Button>
          ) : (
            <Button onClick={() => setStepIndex((current) => current + 1)}>Próximo</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
