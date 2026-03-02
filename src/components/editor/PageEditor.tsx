import { useState, useCallback, useEffect, useRef } from "react";
import { Page, Block, BlockType } from "@/types/notes";
import { Button } from "@/components/ui/button";
import {
  Star,
  Copy,
  Trash2,
  Minimize2,
  Clock,
  Check,
  MoreHorizontal,
  Download,
  Share2,
  Mail,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { BlockEditor } from "./BlockEditor";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { generatePagePdf } from "@/lib/pdfExport";

interface PageEditorProps {
  page: Page;
  onUpdate: (updates: Partial<Page>) => void;
  focusMode: boolean;
  onExitFocus: () => void;
}

export function PageEditor({ page, onUpdate, focusMode, onExitFocus }: PageEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [blocks, setBlocks] = useState<Block[]>(page.content || []);
  const [dirty, setDirty] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setTitle(page.title);
    setBlocks(page.content || []);
    setDirty(false);
  }, [page.id]);

  const scheduleAutoSave = useCallback(
    (newTitle: string, newBlocks: Block[]) => {
      setDirty(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onUpdate({ title: newTitle, content: newBlocks });
        setDirty(false);
      }, 1500);
    },
    [onUpdate]
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    scheduleAutoSave(newTitle, blocks);
  };

  const handleBlocksChange = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    scheduleAutoSave(title, newBlocks);
  };

  const handleForceSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    onUpdate({ title, content: blocks });
    setDirty(false);
    toast.success("Salvo!");
  };

  const handleDownloadPdf = async () => {
    try {
      const doc = generatePagePdf(title, blocks, page.created_at, page.updated_at);
      doc.save(`${title || "pagina"}.pdf`);
      toast.success("PDF baixado!");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleSharePdf = async (method: "email" | "social") => {
    try {
      const doc = generatePagePdf(title, blocks, page.created_at, page.updated_at);
      const blob = doc.output("blob");
      const file = new File([blob], `${title || "pagina"}.pdf`, { type: "application/pdf" });

      if (method === "email") {
        // Try Web Share API first, fallback to mailto
        if (navigator.share) {
          await navigator.share({ title, files: [file] });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Segue em anexo a página: " + title)}`;
          a.click();
          URL.revokeObjectURL(url);
          toast.info("Abra seu cliente de email e anexe o PDF baixado.");
          doc.save(`${title || "pagina"}.pdf`);
        }
      } else {
        if (navigator.share) {
          await navigator.share({ title, text: `Confira: ${title}`, files: [file] });
        } else {
          toast.info("Compartilhamento não suportado neste navegador. O PDF será baixado.");
          doc.save(`${title || "pagina"}.pdf`);
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Erro ao compartilhar");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleForceSave();
      }
      if (e.ctrlKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        if (focusMode) onExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [title, blocks, focusMode]);

  return (
    <div className={cn("flex flex-col h-full", focusMode && "max-w-3xl mx-auto")}>
      {/* Page header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-1 shrink-0">
            {dirty ? (
              <div className="h-2.5 w-2.5 sm:h-2 sm:w-2 rounded-full bg-warning animate-pulse-glow" title="Salvando..." />
            ) : (
              <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-success" />
            )}
            <span className="font-mono-accent text-[11px] sm:text-[10px] text-muted-foreground">
              {dirty ? "editando" : "salvo"}
            </span>
          </div>

          <span className="font-mono-accent text-[11px] sm:text-[10px] text-muted-foreground hidden sm:block">
            <Clock className="inline h-3 w-3 mr-0.5" />
            {format(new Date(page.updated_at), "dd/MM HH:mm")}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:h-7 sm:w-7"
            onClick={() => onUpdate({ is_favorite: !page.is_favorite })}
          >
            <Star className={cn("h-5 w-5 sm:h-3.5 sm:w-3.5", page.is_favorite && "fill-warning text-warning")} />
          </Button>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-7 sm:w-7">
                <Share2 className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSharePdf("email")}>
                <Mail className="mr-2 h-4 w-4" />
                Enviar por email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSharePdf("social")}>
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {focusMode && (
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-7 sm:w-7" onClick={onExitFocus}>
              <Minimize2 className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full bg-transparent text-xl sm:text-2xl font-bold border-none outline-none placeholder:text-muted-foreground/30"
          placeholder="Título da página..."
        />
      </div>

      {/* Block editor */}
      <div className="flex-1 px-4 sm:px-6 pb-16 overflow-auto">
        <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
      </div>
    </div>
  );
}
