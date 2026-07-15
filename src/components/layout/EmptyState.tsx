import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Plus } from "lucide-react";

interface EmptyStateProps {
  hasNotebooks: boolean;
  hasSelectedNotebook: boolean;
  onCreateNotebook: () => void;
  onCreatePage: () => void;
}

export function EmptyState({
  hasNotebooks,
  hasSelectedNotebook,
  onCreateNotebook,
  onCreatePage,
}: EmptyStateProps) {
  return (
    <div className="flex h-full flex-1 items-center justify-center p-8">
      <div className="max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/5 glow-sm">
            <BookOpen className="h-8 w-8 text-primary/60" />
          </div>
        </div>

        {!hasNotebooks ? (
          <>
            <div>
              <h2 className="mb-1 text-lg font-semibold">Bem-vindo ao VISTA Tasks Control</h2>
              <p className="text-sm text-muted-foreground">
                Crie seu primeira pasta para organizar anotações por tema.
              </p>
            </div>
            <Button onClick={onCreateNotebook} className="glow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova pasta
            </Button>
          </>
        ) : !hasSelectedNotebook ? (
          <div>
            <h2 className="mb-1 text-lg font-semibold">Selecione uma pasta</h2>
            <p className="text-sm text-muted-foreground">
              Escolha uma pasta em Anotações para ver suas anotações.
            </p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="mb-1 text-lg font-semibold">Pasta vazia</h2>
              <p className="text-sm text-muted-foreground">Esta pasta ainda está vazio. Crie uma anotação para começar.</p>
            </div>
            <Button onClick={onCreatePage} className="glow-sm">
              <FileText className="mr-2 h-4 w-4" />
              Nova anotação
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
