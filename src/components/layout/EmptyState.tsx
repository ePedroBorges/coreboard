import { Button } from "@/components/ui/button";
import { BookOpen, Plus, FileText } from "lucide-react";

interface EmptyStateProps {
  hasNotebooks: boolean;
  hasSelectedNotebook: boolean;
  onCreateNotebook: () => void;
  onCreatePage: () => void;
}

export function EmptyState({ hasNotebooks, hasSelectedNotebook, onCreateNotebook, onCreatePage }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center h-full p-8">
      <div className="text-center max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-xl bg-primary/5 flex items-center justify-center glow-sm">
            <BookOpen className="h-8 w-8 text-primary/60" />
          </div>
        </div>

        {!hasNotebooks ? (
          <>
            <div>
              <h2 className="text-lg font-semibold mb-1">Bem-vindo ao VISTA Task Control</h2>
              <p className="text-sm text-muted-foreground">
                Crie seu primeiro caderno para começar a organizar suas ideias.
              </p>
            </div>
            <Button onClick={onCreateNotebook} className="glow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Criar caderno
            </Button>
          </>
        ) : !hasSelectedNotebook ? (
          <div>
            <h2 className="text-lg font-semibold mb-1">Selecione um caderno</h2>
            <p className="text-sm text-muted-foreground">Escolha um caderno no menu lateral para ver suas páginas.</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold mb-1">Caderno vazio</h2>
              <p className="text-sm text-muted-foreground">Crie uma página para começar a escrever.</p>
            </div>
            <Button onClick={onCreatePage} className="glow-sm">
              <FileText className="mr-2 h-4 w-4" />
              Nova página
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
