import { useState, useCallback, useEffect, useRef } from "react";
import { Page, Block, BlockType } from "@/types/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Star,
  Copy,
  Trash2,
  Minimize2,
  Clock,
  Check,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BlockEditor } from "./BlockEditor";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

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

  // Sync when page changes
  useEffect(() => {
    setTitle(page.title);
    setBlocks(page.content || []);
    setDirty(false);
  }, [page.id]);

  // Auto-save
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

  // Keyboard shortcuts
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
      <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Save indicator */}
          <div className="flex items-center gap-1 shrink-0">
            {dirty ? (
              <div className="h-2 w-2 rounded-full bg-warning animate-pulse-glow" title="Salvando..." />
            ) : (
              <Check className="h-3.5 w-3.5 text-success" />
            )}
            <span className="font-mono-accent text-[10px] text-muted-foreground">
              {dirty ? "editando" : "salvo"}
            </span>
          </div>

          {/* Timestamps */}
          <span className="font-mono-accent text-[10px] text-muted-foreground hidden sm:block">
            <Clock className="inline h-3 w-3 mr-0.5" />
            {format(new Date(page.updated_at), "dd/MM HH:mm")}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdate({ is_favorite: !page.is_favorite })}
          >
            <Star className={cn("h-3.5 w-3.5", page.is_favorite && "fill-warning text-warning")} />
          </Button>

          {focusMode && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExitFocus}>
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pt-8 pb-4">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full bg-transparent text-2xl font-bold border-none outline-none placeholder:text-muted-foreground/30"
          placeholder="Título da página..."
        />
      </div>

      {/* Block editor */}
      <div className="flex-1 px-6 pb-16 overflow-auto">
        <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
      </div>
    </div>
  );
}
