import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Block, BlockType } from "@/types/notes";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Plus,
  Trash2,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  Loader2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: "paragraph", label: "Texto", icon: Type },
  { type: "heading1", label: "Título 1", icon: Heading1 },
  { type: "heading2", label: "Título 2", icon: Heading2 },
  { type: "heading3", label: "Título 3", icon: Heading3 },
  { type: "bullet-list", label: "Lista", icon: List },
  { type: "numbered-list", label: "Lista numerada", icon: ListOrdered },
  { type: "checklist", label: "Checklist", icon: CheckSquare },
  { type: "attachment", label: "Anexo (PDF/Imagem)", icon: Paperclip },
];

/**
 * Editable text block that preserves cursor position.
 * Sets initial HTML once on mount (and when block id changes).
 * Subsequent prop changes do NOT overwrite content while editing.
 */
function EditableContent({
  blockId,
  initialContent,
  onInput,
  onKeyDown,
  className,
  placeholder,
  refCallback,
}: {
  blockId: string;
  initialContent: string;
  onInput: (text: string) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  className?: string;
  placeholder?: string;
  refCallback?: (el: HTMLElement | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== initialContent) {
      ref.current.textContent = initialContent;
    }
    // Only reset content when block identity changes — never on parent re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);

  return (
    <div
      ref={(el) => {
        ref.current = el;
        refCallback?.(el);
      }}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onInput((e.target as HTMLElement).textContent || "")}
      onKeyDown={onKeyDown}
      className={className}
      data-placeholder={placeholder}
    />
  );
}

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const { user } = useAuth();
  const [slashMenuIndex, setSlashMenuIndex] = useState<number | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const blockRefs = useRef<(HTMLElement | null)[]>([]);

  const addBlock = (type: BlockType = "paragraph", afterIndex?: number) => {
    const newBlock: Block = { id: generateId(), type, content: "" };
    if (type === "checklist") newBlock.checked = false;

    const newBlocks = [...blocks];
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : newBlocks.length;
    newBlocks.splice(insertAt, 0, newBlock);
    onChange(newBlocks);

    setTimeout(() => {
      blockRefs.current[insertAt]?.focus();
    }, 50);
  };

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    onChange(newBlocks);
  };

  const deleteBlock = (index: number) => {
    if (blocks.length <= 1) return;
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
    setTimeout(() => {
      const focusIdx = Math.max(0, index - 1);
      blockRefs.current[focusIdx]?.focus();
    }, 50);
  };

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    const block = blocks[index];

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addBlock(block.type === "checklist" ? "checklist" : "paragraph", index);
    }

    if (e.key === "Backspace" && block.content === "" && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(index);
    }

    if (e.key === "/" && block.content === "") {
      setSlashMenuIndex(index);
    }

    if (e.key === "ArrowUp" && index > 0) {
      const sel = window.getSelection();
      if (sel && sel.anchorOffset === 0) {
        e.preventDefault();
        blockRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === "ArrowDown" && index < blocks.length - 1) {
      e.preventDefault();
      blockRefs.current[index + 1]?.focus();
    }
  };

  const handleSlashSelect = (type: BlockType, index: number) => {
    const updates: Partial<Block> = { type, content: "" };
    if (type === "checklist") updates.checked = false;
    updateBlock(index, updates);
    setSlashMenuIndex(null);
    setTimeout(() => blockRefs.current[index]?.focus(), 50);
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 20MB)");
      return;
    }
    setUploadingIdx(index);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("page-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      updateBlock(index, {
        filePath: path,
        fileName: file.name,
        fileType: file.type,
        content: file.name,
      });
      toast.success("Anexo enviado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar anexo");
    } finally {
      setUploadingIdx(null);
    }
  };

  const getBlockClassName = (type: BlockType) => {
    switch (type) {
      case "heading1": return "text-xl sm:text-2xl font-bold";
      case "heading2": return "text-lg sm:text-xl font-semibold";
      case "heading3": return "text-base sm:text-lg font-medium";
      case "bullet-list": return "pl-4";
      case "numbered-list": return "pl-4";
      default: return "";
    }
  };

  if (blocks.length === 0) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => addBlock()}
          className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground text-sm py-3 sm:py-2 transition-colors min-h-[44px] sm:min-h-0"
        >
          <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
          Escreva sua nota aqui...
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {blocks.map((block, index) => (
        <div key={block.id} className="group/block flex items-start gap-1 relative">
          {/* Drag handle + actions */}
          <div className="flex items-center gap-0.5 pt-1 opacity-100 sm:opacity-0 sm:group-hover/block:opacity-100 transition-opacity shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 sm:p-0.5 rounded hover:bg-muted min-h-[36px] sm:min-h-0 min-w-[36px] sm:min-w-0 flex items-center justify-center">
                  <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {BLOCK_TYPES.map((bt) => (
                  <DropdownMenuItem
                    key={bt.type}
                    onClick={() => addBlock(bt.type, index)}
                    className="min-h-[44px] sm:min-h-0"
                  >
                    <bt.icon className="mr-2 h-4 w-4" />
                    {bt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button className="p-1.5 sm:p-0.5 rounded hover:bg-muted cursor-grab min-h-[36px] sm:min-h-0 min-w-[36px] sm:min-w-0 flex items-center justify-center">
              <GripVertical className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Block content */}
          <div className="flex-1 min-w-0">
            {block.type === "attachment" ? (
              <AttachmentBlock
                block={block}
                uploading={uploadingIdx === index}
                onUpload={(file) => handleFileUpload(index, file)}
              />
            ) : block.type === "checklist" ? (
              <div className="flex items-start gap-2 py-1 sm:py-0.5">
                <Checkbox
                  checked={block.checked}
                  onCheckedChange={(checked) => updateBlock(index, { checked: !!checked })}
                  className="mt-1 h-5 w-5 sm:h-4 sm:w-4"
                />
                <EditableContent
                  blockId={block.id}
                  initialContent={block.content}
                  onInput={(text) => updateBlock(index, { content: text })}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  refCallback={(el) => { blockRefs.current[index] = el; }}
                  className={cn(
                    "flex-1 outline-none text-base sm:text-sm py-1 sm:py-0.5 min-h-[1.5em]",
                    block.checked && "line-through text-muted-foreground"
                  )}
                  placeholder="Item..."
                />
              </div>
            ) : block.type === "bullet-list" ? (
              <div className="flex items-start gap-2 py-1 sm:py-0.5">
                <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
                <EditableContent
                  blockId={block.id}
                  initialContent={block.content}
                  onInput={(text) => updateBlock(index, { content: text })}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  refCallback={(el) => { blockRefs.current[index] = el; }}
                  className="flex-1 outline-none text-base sm:text-sm py-1 sm:py-0.5 min-h-[1.5em]"
                  placeholder="Item da lista..."
                />
              </div>
            ) : block.type === "numbered-list" ? (
              <div className="flex items-start gap-2 py-1 sm:py-0.5">
                <span className="font-mono-accent text-sm sm:text-xs text-muted-foreground mt-0.5 shrink-0 w-4 text-right">
                  {index + 1}.
                </span>
                <EditableContent
                  blockId={block.id}
                  initialContent={block.content}
                  onInput={(text) => updateBlock(index, { content: text })}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  refCallback={(el) => { blockRefs.current[index] = el; }}
                  className="flex-1 outline-none text-base sm:text-sm py-1 sm:py-0.5 min-h-[1.5em]"
                  placeholder="Item..."
                />
              </div>
            ) : (
              <EditableContent
                blockId={block.id}
                initialContent={block.content}
                onInput={(text) => updateBlock(index, { content: text })}
                onKeyDown={(e) => handleKeyDown(e, index)}
                refCallback={(el) => { blockRefs.current[index] = el; }}
                className={cn(
                  "outline-none text-base sm:text-sm py-1 sm:py-0.5 min-h-[1.5em]",
                  getBlockClassName(block.type)
                )}
                placeholder={
                  block.type === "heading1" ? "Título 1"
                    : block.type === "heading2" ? "Título 2"
                    : block.type === "heading3" ? "Título 3"
                    : "Escreva sua nota aqui..."
                }
              />
            )}
          </div>

          {/* Delete button */}
          <button
            onClick={() => deleteBlock(index)}
            className="p-1.5 sm:p-0.5 rounded hover:bg-destructive/10 opacity-100 sm:opacity-0 sm:group-hover/block:opacity-100 transition-opacity mt-1 shrink-0 min-h-[36px] sm:min-h-0 min-w-[36px] sm:min-w-0 flex items-center justify-center"
          >
            <Trash2 className="h-4 w-4 sm:h-3 sm:w-3 text-destructive/60" />
          </button>

          {/* Slash menu */}
          {slashMenuIndex === index && (
            <div className="absolute left-8 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 shadow-lg">
              {BLOCK_TYPES.map((bt) => (
                <button
                  key={bt.type}
                  onClick={() => handleSlashSelect(bt.type, index)}
                  className="flex items-center gap-2 w-full rounded-sm px-2 py-2.5 sm:py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors min-h-[44px] sm:min-h-0"
                >
                  <bt.icon className="h-4 w-4" />
                  {bt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add block at end */}
      <button
        onClick={() => addBlock()}
        className="flex items-center gap-2 w-full text-muted-foreground/40 hover:text-muted-foreground text-sm py-3 sm:py-2 transition-colors min-h-[44px] sm:min-h-0"
      >
        <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        Adicionar bloco
      </button>
    </div>
  );
}

function AttachmentBlock({
  block,
  uploading,
  onUpload,
}: {
  block: Block;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    if (block.filePath) {
      supabase.storage
        .from("page-attachments")
        .createSignedUrl(block.filePath, 60 * 60)
        .then(({ data }) => {
          if (active && data?.signedUrl) setSignedUrl(data.signedUrl);
        });
    } else {
      setSignedUrl(null);
    }
    return () => { active = false; };
  }, [block.filePath]);

  const isImage = (block.fileType || "").startsWith("image/");

  if (!block.filePath) {
    return (
      <div className="my-2 rounded-md border border-dashed border-border p-4 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
          {uploading ? "Enviando..." : "Selecionar PDF ou imagem"}
        </button>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-md border border-border bg-card/30 p-3">
      {isImage && signedUrl ? (
        <a href={signedUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={signedUrl}
            alt={block.fileName || "Anexo"}
            className="max-h-96 w-auto rounded mx-auto"
            loading="lazy"
          />
        </a>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isImage ? <ImageIcon className="h-5 w-5 shrink-0 text-primary" /> : <FileText className="h-5 w-5 shrink-0 text-primary" />}
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{block.fileName}</div>
              <div className="text-[11px] text-muted-foreground">{block.fileType}</div>
            </div>
          </div>
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Abrir
            </a>
          )}
        </div>
      )}
    </div>
  );
}
