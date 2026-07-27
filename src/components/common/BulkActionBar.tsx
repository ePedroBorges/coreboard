import { CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionBarProps {
  count: number;
  total: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  children: React.ReactNode;
}

/** Floating bar shown while the user is multi-selecting items (long press to start). */
export function BulkActionBar({ count, total, allSelected, onSelectAll, onClear, children }: BulkActionBarProps) {
  return (
    <div className="sticky bottom-3 z-30 mx-auto w-full max-w-3xl rounded-lg border border-primary/30 bg-card/95 p-2 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-1 text-sm font-semibold text-foreground">
          {count} de {total} selecionada(s)
        </span>
        <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5" onClick={onSelectAll}>
          <CheckSquare className="h-4 w-4" />
          {allSelected ? "Limpar seleção" : "Selecionar todos"}
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {children}
          <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5" onClick={onClear}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
