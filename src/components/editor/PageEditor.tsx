import { useState, useCallback, useEffect, useRef } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Copy,
  Download,
  ListChecks,
  Mail,
  Minimize2,
  Pin,
  Share2,
  Trash2,
} from "lucide-react";
import { Page, Block, Notebook } from "@/types/notes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BlockEditor } from "./BlockEditor";
import { TagSelector } from "@/components/notes/TagSelector";
import { cn } from "@/lib/utils";
import { generatePagePdf } from "@/lib/pdfExport";
import { blocksToText, getNoteTags, setNoteTags } from "@/lib/noteUtils";
import { Json } from "@/integrations/supabase/types";

interface PageEditorProps {
  page: Page;
  onUpdate: (updates: Partial<Page>) => void;
  focusMode: boolean;
  onExitFocus: () => void;
  onCreateTaskFromPage?: (page: Page) => void;
  onDelete?: () => void;
  notebooks?: Notebook[];
  onNotebookChange?: (notebookId: string) => void;
}

export function PageEditor({ page, onUpdate, focusMode, onExitFocus, onCreateTaskFromPage, onDelete, notebooks = [], onNotebookChange }: PageEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [blocks, setBlocks] = useState<Block[]>(page.content || []);
  const [dirty, setDirty] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const pageIdRef = useRef(page.id);
  const pendingRef = useRef<{ title: string; blocks: Block[] } | null>(null);

  useEffect(() => {
    if (pageIdRef.current !== page.id && pendingRef.current) {
      const prevId = pageIdRef.current;
      const { title: pendingTitle, blocks: pendingBlocks } = pendingRef.current;
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase.from("pages").update({ title: pendingTitle, content: pendingBlocks as unknown as Json }).eq("id", prevId);
      });
      pendingRef.current = null;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    }

    pageIdRef.current = page.id;
    setTitle(page.title);
    setBlocks(page.content || []);
    setDirty(false);
    // Only reset local editor state when switching notes; autosave invalidations should not steal the cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  const scheduleAutoSave = useCallback(
    (newTitle: string, newBlocks: Block[]) => {
      setDirty(true);
      pendingRef.current = { title: newTitle, blocks: newBlocks };
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onUpdate({ title: newTitle, content: newBlocks });
        pendingRef.current = null;
        setDirty(false);
      }, 800);
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

  const handleTagsChange = (tags: string[]) => {
    const nextBlocks = setNoteTags(blocks, tags);
    setBlocks(nextBlocks);
    scheduleAutoSave(title, nextBlocks);
  };

  const handleNotebookChange = (notebookId: string) => {
    onUpdate({ notebook_id: notebookId });
    onNotebookChange?.(notebookId);
  };

  const handleForceSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    onUpdate({ title, content: blocks });
    pendingRef.current = null;
    setDirty(false);
    toast.success("Salvo");
  }, [blocks, onUpdate, title]);

  const currentPage = { ...page, title, content: blocks };
  const tags = getNoteTags(blocks);

  const handleDownloadPdf = async () => {
    try {
      const doc = generatePagePdf(title, blocks, page.created_at, page.updated_at);
      doc.save(`${title || "pagina"}.pdf`);
      toast.success("PDF baixado");
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleSharePdf = async (method: "email" | "social") => {
    try {
      const doc = generatePagePdf(title, blocks, page.created_at, page.updated_at);
      const blob = doc.output("blob");
      const file = new File([blob], `${title || "pagina"}.pdf`, { type: "application/pdf" });

      if (navigator.share) {
        await navigator.share({ title, text: `Confira: ${title}`, files: [file] });
        return;
      }

      if (method === "email") {
        const anchor = document.createElement("a");
        anchor.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Segue a página: " + title)}`;
        anchor.click();
        toast.info("Abra seu cliente de e-mail e anexe o PDF baixado.");
      } else {
        toast.info("Compartilhamento não suportado neste navegador. O PDF será baixado.");
      }
      doc.save(`${title || "pagina"}.pdf`);
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Erro ao compartilhar");
    }
  };

  const handleCopyNote = async () => {
    await navigator.clipboard.writeText([title, blocksToText(blocks)].filter(Boolean).join("\n\n"));
    toast.success("Página copiada");
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        handleForceSave();
      }
      if (event.ctrlKey && event.shiftKey && event.key === "F") {
        event.preventDefault();
        if (focusMode) onExitFocus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, handleForceSave, onExitFocus]);

  return (
    <div className={cn("flex h-full flex-col", focusMode && "mx-auto max-w-3xl")}>
      <div className="shrink-0 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex shrink-0 items-center gap-1">
              {dirty ? (
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-warning sm:h-2 sm:w-2" title="Salvando..." />
              ) : (
                <Check className="h-4 w-4 text-success sm:h-3.5 sm:w-3.5" />
              )}
              <span className="font-mono-accent text-[11px] text-muted-foreground sm:text-[10px]">
                {dirty ? "Salvando..." : "Salvo"}
              </span>
            </div>

            <span className="hidden font-mono-accent text-[11px] text-muted-foreground sm:block sm:text-[10px]">
              <Clock className="mr-0.5 inline h-3 w-3" />
              Editado às {format(new Date(page.updated_at), "HH:mm")}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onCreateTaskFromPage && (
              <Button
                variant="secondary"
                size="sm"
                className="hidden h-8 gap-1 sm:inline-flex"
                onClick={() => onCreateTaskFromPage(currentPage)}
              >
                <ListChecks className="h-3.5 w-3.5" />
                Criar tarefa
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 sm:h-7 sm:w-7"
              onClick={() => onUpdate({ is_favorite: !page.is_favorite })}
              title={page.is_favorite ? "Desafixar" : "Fixar"}
            >
              <Pin className={cn("h-5 w-5 sm:h-3.5 sm:w-3.5", page.is_favorite && "fill-warning text-warning")} />
            </Button>

            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-7 sm:w-7" onClick={handleCopyNote} title="Copiar página">
              <Copy className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
            </Button>

            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-destructive hover:text-destructive sm:h-7 sm:w-7"
                onClick={() => {
                  if (window.confirm("Excluir esta página permanentemente?")) onDelete();
                }}
                title="Excluir página"
              >
                <Trash2 className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
              </Button>
            )}

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
                  Enviar por e-mail
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Capture ideias, links e checklists. Depois transforme tudo em ação.
          </span>
          {page.is_favorite && <Badge variant="outline" className="rounded-full border-warning/40 text-warning">Fixada</Badge>}
          {onCreateTaskFromPage && (
            <Button
              variant="secondary"
              size="sm"
              className="h-9 gap-1 sm:hidden"
              onClick={() => onCreateTaskFromPage(currentPage)}
            >
              <ListChecks className="h-3.5 w-3.5" />
              Criar tarefa
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 pb-3 pt-6 sm:px-6 sm:pt-8">
        <input
          value={title}
          onChange={(event) => handleTitleChange(event.target.value)}
          className="w-full border-none bg-transparent text-xl font-bold outline-none placeholder:text-muted-foreground/30 sm:text-2xl"
          placeholder="Título da página"
        />
      </div>

      <div className="px-4 pb-4 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-[minmax(180px,260px)_minmax(0,1fr)]">
          {notebooks.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="page-notebook" className="text-xs text-muted-foreground">Caderno</Label>
              <Select value={page.notebook_id} onValueChange={handleNotebookChange}>
                <SelectTrigger id="page-notebook" className="h-9">
                  <SelectValue placeholder="Selecione um caderno" />
                </SelectTrigger>
                <SelectContent>
                  {notebooks.map((notebook) => (
                    <SelectItem key={notebook.id} value={notebook.id}>
                      {notebook.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <div className="mb-2 text-xs text-muted-foreground">Tags</div>
            <TagSelector value={tags} onChange={handleTagsChange} compact />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-16 sm:px-6">
        <div className="rounded-lg border border-border/50 bg-card/35 p-3 sm:p-4">
          <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
        </div>
      </div>
    </div>
  );
}
