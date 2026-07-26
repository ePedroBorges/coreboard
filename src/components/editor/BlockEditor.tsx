import { useEffect, useRef, useState, KeyboardEvent, useCallback } from "react";
import { Block, BlockType } from "@/types/notes";
import { cn } from "@/lib/utils";
import {
  Bold,
  CheckSquare,
  Download,
  FileText,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Indent,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Paperclip,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { LinkifiedText } from "@/components/notes/LinkifiedText";

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  canUseAttachments?: boolean;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: "freeform", label: "Texto livre", icon: Type },
  { type: "paragraph", label: "Linha", icon: Type },
  { type: "heading1", label: "Título 1", icon: Heading1 },
  { type: "heading2", label: "Título 2", icon: Heading2 },
  { type: "heading3", label: "Título 3", icon: Heading3 },
  { type: "bullet-list", label: "Lista", icon: List },
  { type: "numbered-list", label: "Lista numerada", icon: ListOrdered },
  // Checklist block type removed — checkboxes are available inline in the text editor
  { type: "attachment", label: "Imagem ou arquivo", icon: Paperclip },
];

const FONT_SIZES = [
  { value: "12px", label: "12" },
  { value: "14px", label: "14" },
  { value: "16px", label: "16" },
  { value: "18px", label: "18" },
  { value: "20px", label: "20" },
  { value: "24px", label: "24" },
  { value: "28px", label: "28" },
  { value: "32px", label: "32" },
  { value: "36px", label: "36" },
  { value: "42px", label: "42" },
  { value: "48px", label: "48" },
];

const HIGHLIGHT_COLORS = [
  { color: "#fef08a", label: "Amarelo" },
  { color: "#bbf7d0", label: "Verde" },
  { color: "#bfdbfe", label: "Azul" },
  { color: "#fecaca", label: "Vermelho" },
  { color: "#e9d5ff", label: "Roxo" },
  { color: "#fed7aa", label: "Laranja" },
];

// ─── Rich text formatting toolbar ───────────────────────────────────────────

function sanitizeHtml(html: string): string {
  // Strip script tags and event handlers while keeping safe HTML
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function FormattingToolbar({
  editorRef,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [currentFontSize, setCurrentFontSize] = useState("16");

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleFontSizeChange = (sizeValue: string) => {
    setCurrentFontSize(sizeValue);
    document.execCommand("styleWithCSS", false);
    const pxSize = parseInt(sizeValue, 10);
    const selection = window.getSelection();
    const hasSelection = selection && !selection.isCollapsed && selection.toString().trim().length > 0;
    if (hasSelection) {
      // Wrap selected text with a styled span
      document.execCommand("insertHTML", false, `<span style="font-size: ${pxSize}px">${selection!.toString()}</span>`);
    } else {
      // No selection — apply font-size to the next typed characters via the execCommand fontSize
      // (emits <font> tags but ensures the next keystrokes get the chosen size)
      const sizeMap: Record<string, string> = {
        "12": "1", "14": "2", "16": "3", "18": "3",
        "20": "4", "24": "4", "28": "5", "32": "5",
        "36": "6", "42": "6", "48": "7",
      };
      document.execCommand("fontSize", false, sizeMap[sizeValue] || "3");
    }
  };

  // Enable CSS styling by default
  useEffect(() => {
    document.execCommand("styleWithCSS", false);
  }, []);

  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center gap-0.5 rounded-t-lg border border-border/60 bg-card/95 px-2 py-1.5 shadow-sm backdrop-blur">
      {/* Bold */}
      <Toggle
        size="sm"
        className="h-8 w-8 data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
        onClick={() => exec("bold")}
        title="Negrito (Ctrl+B)"
        aria-label="Negrito"
      >
        <Bold className="h-3.5 w-3.5" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Font Size */}
      <Select value={currentFontSize} onValueChange={handleFontSizeChange}>
        <SelectTrigger className="h-8 w-[68px] text-[11px]">
          <SelectValue placeholder="16" />
        </SelectTrigger>
        <SelectContent className="max-h-52">
          {FONT_SIZES.map((size) => (
            <SelectItem key={size.value} value={size.value} className="text-xs">
              {size.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Highlight / Text Marker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Toggle
            size="sm"
            className="h-8 w-8 data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
            title="Marcador de texto"
            aria-label="Marcador de texto"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </Toggle>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-0 p-1.5">
          <div className="mb-1 text-[10px] font-medium text-muted-foreground">
            Cor do marcador
          </div>
          <div className="grid grid-cols-3 gap-1">
            {HIGHLIGHT_COLORS.map(({ color, label }) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  document.execCommand("styleWithCSS", false);
                  exec("backColor", color);
                }}
                className="flex h-7 w-7 items-center justify-center rounded border border-border/50 transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                title={label}
                aria-label={`Marcar com ${label}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => exec("removeFormat")}
            className="mt-1 w-full rounded px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent"
          >
            Remover marcação
          </button>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists */}
      <Toggle
        size="sm"
        className="h-8 w-8 data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
        onClick={() => exec("insertUnorderedList")}
        title="Lista não numerada"
        aria-label="Lista não numerada"
      >
        <List className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        className="h-8 w-8 data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
        onClick={() => exec("insertOrderedList")}
        title="Lista numerada"
        aria-label="Lista numerada"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Toggle>

      {/* Checklist inline — inserts a ballot-box symbol (U+2610) */}
      <Toggle
        size="sm"
        className="h-8 w-8 data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
        onClick={() => exec("insertHTML", "☐ ")}
        title="Caixa de seleção"
        aria-label="Caixa de seleção"
      >
        <CheckSquare className="h-3.5 w-3.5" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Indentation */}
      <Toggle
        size="sm"
        className="h-8 w-8 data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
        onClick={() => exec("indent")}
        title="Aumentar recuo"
        aria-label="Aumentar recuo"
      >
        <Indent className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        className="h-8 w-8 data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
        onClick={() => exec("outdent")}
        title="Diminuir recuo"
        aria-label="Diminuir recuo"
      >
        <Minus className="h-3.5 w-3.5" />
      </Toggle>
    </div>
  );
}

// ─── Rich text editor that replaces AutoResizeTextarea ──────────────────────

function RichTextEditor({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  blockId,
}: {
  value: string;
  onChange: (html: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  placeholder?: string;
  blockId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const isInternalUpdate = useRef(false);
  const previousBlockId = useRef(blockId);
  const imageUrls = getImageUrls(value);

  // Sync content when switching between blocks (notes)
  useEffect(() => {
    const el = ref.current;
    if (!el || isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const normalizedValue = value || "";
    const switchedBlock = previousBlockId.current !== blockId;
    previousBlockId.current = blockId;
    if ((switchedBlock || document.activeElement !== el) && el.innerHTML !== normalizedValue) {
      el.innerHTML = normalizedValue;
    }
  }, [blockId, value]);

  const handleInput = useCallback(() => {
    if (!ref.current) return;
    isInternalUpdate.current = true;
    onChange(ref.current.innerHTML);
  }, [onChange]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Bold with Ctrl+B
    if ((event.ctrlKey || event.metaKey) && event.key === "b") {
      event.preventDefault();
      document.execCommand("bold");
      return;
    }
    // Allow Shift+Enter for line break, Enter for new paragraph
    if (event.key === "Enter" && event.shiftKey) {
      document.execCommand("insertLineBreak");
      event.preventDefault();
    }
  }, []);

  const handleFocus = useCallback(() => {
    setShowToolbar(true);
    onFocus();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setShowToolbar(false);
    onBlur();
  }, [onBlur]);

  return (
    <div className="min-w-0">
      <div className={showToolbar ? undefined : "pointer-events-none invisible"} aria-hidden={!showToolbar}>
        <FormattingToolbar editorRef={ref} />
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className="min-h-[42svh] w-full overflow-y-auto border-0 bg-transparent px-0 py-3 text-[1.05rem] leading-8 outline-none placeholder:text-muted-foreground/45 focus:ring-0 sm:min-h-[46svh] sm:text-base [&:empty:before]:text-muted-foreground/45 [&:empty:before]:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_input[type=checkbox]]:mr-1.5 [&_input[type=checkbox]]:inline [&_input[type=checkbox]]:h-4 [&_input[type=checkbox]]:w-4 [&_input[type=checkbox]]:align-middle [&_mark]:rounded [&_mark]:px-0.5"
        dangerouslySetInnerHTML={{ __html: value }}
      />

      {imageUrls.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {imageUrls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border/60 bg-background/35">
              <img src={url} alt="Imagem da anotacao" className="max-h-80 w-full object-contain" loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

const imageUrlRegex = /https?:\/\/(?:(?!https?:\/\/)[^\s])+\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s]*)?/gi;

function getImageUrls(text: string) {
  return Array.from(new Set(text.match(imageUrlRegex) || []));
}

function EditableContent({
  blockId,
  initialContent,
  onInput,
  onKeyDown,
  onFocus,
  onBlur,
  className,
  placeholder,
  refCallback,
}: {
  blockId: string;
  initialContent: string;
  onInput: (text: string) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  className?: string;
  placeholder?: string;
  refCallback?: (el: HTMLElement | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== initialContent) {
      ref.current.textContent = initialContent;
    }
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
      onFocus={onFocus}
      onBlur={onBlur}
      onInput={(event) => onInput((event.target as HTMLElement).textContent || "")}
      onKeyDown={onKeyDown}
      className={className}
      data-placeholder={placeholder}
    />
  );
}

export function BlockEditor({ blocks, onChange, canUseAttachments = false }: BlockEditorProps) {
  const { user } = useAuth();
  const [slashMenuIndex, setSlashMenuIndex] = useState<number | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const blockRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const textBlocks = blocks.filter((block) => block.type !== "checklist" && block.type !== "attachment");
    const auxiliaryBlocks = blocks.filter((block) => block.type === "checklist" || block.type === "attachment");
    const alreadyUnified = textBlocks.length === 1 && textBlocks[0].type === "freeform";
    if (alreadyUnified) return;
    const content = textBlocks.map((block) => block.content).filter(Boolean).join("\n");
    onChange([{ id: textBlocks[0]?.id || generateId(), type: "freeform", content }, ...auxiliaryBlocks]);
  }, [blocks, onChange]);

  const addBlock = (type: BlockType = "freeform", afterIndex?: number) => {
    if (type === "attachment" && !canUseAttachments) {
      toast.error("Anexos são um recurso Pro. Acesse Planos para desbloquear.");
      return;
    }
    const newBlock: Block = { id: generateId(), type, content: "" };
    if (type === "checklist") newBlock.checked = false;

    const newBlocks = [...blocks];
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : newBlocks.length;
    newBlocks.splice(insertAt, 0, newBlock);
    onChange(newBlocks);
    setEditingBlockId(newBlock.id);

    setTimeout(() => {
      blockRefs.current[insertAt]?.focus();
    }, 50);
  };

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const nextBlocks = [...blocks];
    nextBlocks[index] = { ...nextBlocks[index], ...updates };
    onChange(nextBlocks);
  };

  const deleteBlock = (index: number) => {
    if (blocks.length <= 1) return;
    const nextBlocks = blocks.filter((_, currentIndex) => currentIndex !== index);
    onChange(nextBlocks);
    setTimeout(() => {
      const focusIndex = Math.max(0, index - 1);
      blockRefs.current[focusIndex]?.focus();
    }, 50);
  };

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    const block = blocks[index];

    if (event.key === "Enter" && !event.shiftKey && block.type !== "freeform") {
      event.preventDefault();
      addBlock(block.type === "checklist" ? "checklist" : "paragraph", index);
    }

    if (event.key === "Backspace" && block.content === "" && blocks.length > 1) {
      event.preventDefault();
      deleteBlock(index);
    }

    if (event.key === "/" && block.content === "") {
      setSlashMenuIndex(index);
    }
  };

  const handleSlashSelect = (type: BlockType, index: number) => {
    if (type === "attachment" && !canUseAttachments) {
      toast.error("Anexos são um recurso Pro. Acesse Planos para desbloquear.");
      setSlashMenuIndex(null);
      return;
    }
    const updates: Partial<Block> = { type, content: "" };
    if (type === "checklist") updates.checked = false;
    updateBlock(index, updates);
    setSlashMenuIndex(null);
    setTimeout(() => blockRefs.current[index]?.focus(), 50);
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!user) return;
    if (!canUseAttachments) {
      toast.error("Anexos são um recurso Pro. Acesse Planos para desbloquear.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande (max 20MB)");
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar anexo");
    } finally {
      setUploadingIdx(null);
    }
  };

  const blockClassName = (type: BlockType) => {
    switch (type) {
      case "heading1":
        return "text-xl font-bold sm:text-2xl";
      case "heading2":
        return "text-lg font-semibold sm:text-xl";
      case "heading3":
        return "text-base font-medium sm:text-lg";
      case "freeform":
        return "min-h-28 leading-6";
      default:
        return "";
    }
  };

  if (blocks.length === 0) return <div className="min-h-80 rounded-md border border-border/50 bg-background/35" />;

  return (
    <div className="space-y-1">
      {blocks.map((block, index) => {
        const isEditing = editingBlockId === block.id || !block.content.trim();
        return (
          <div key={block.id} className="group/block relative flex items-start gap-1">
            <div className={cn("shrink-0 items-center gap-0.5 pt-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/block:opacity-100", block.type === "freeform" ? "hidden" : "flex")}>
              <BlockTypeMenu onSelect={(type) => addBlock(type, index)} />
              <span className="flex min-h-9 min-w-9 items-center justify-center rounded text-muted-foreground sm:min-h-0 sm:min-w-0 sm:p-0.5">
                <GripVertical className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
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
      {isEditing ? (
                    <EditableContent
                      blockId={block.id}
                      initialContent={block.content}
                      onInput={(text) => updateBlock(index, { content: text })}
                      onKeyDown={(event) => handleKeyDown(event, index)}
                      onFocus={() => setEditingBlockId(block.id)}
                      onBlur={() => setEditingBlockId(null)}
                      refCallback={(el) => { blockRefs.current[index] = el; }}
                      className={cn(
                        "min-h-[1.5em] flex-1 rounded-sm px-1 py-1 text-base outline-none focus:bg-background/60 sm:py-0.5 sm:text-sm",
                        block.checked && "text-muted-foreground line-through"
                      )}
                      placeholder="Adicionar item ao checklist"
                    />
                  ) : (
                    <RichTextBlock
                      text={block.content}
                      className={cn("flex-1", block.checked && "text-muted-foreground line-through")}
                      onEdit={() => setEditingBlockId(block.id)}
                    />
                  )}
                </div>
              ) : block.type === "freeform" ? (
                <RichTextEditor
                  blockId={block.id}
                  value={block.content}
                  onChange={(html) => updateBlock(index, { content: html })}
                  onFocus={() => setEditingBlockId(block.id)}
                  onBlur={() => setEditingBlockId(null)}
                  placeholder="Comece a escrever. Suas ideias ficam salvas automaticamente..."
                />
              ) : block.type === "bullet-list" || block.type === "numbered-list" ? (
                <div className="flex items-start gap-2 py-1 sm:py-0.5">
                  <span className="mt-1 shrink-0 text-muted-foreground">
                    {block.type === "bullet-list" ? "-" : `${index + 1}.`}
                  </span>
      {isEditing ? (
                    <EditableContent
                      blockId={block.id}
                      initialContent={block.content}
                      onInput={(text) => updateBlock(index, { content: text })}
                      onKeyDown={(event) => handleKeyDown(event, index)}
                      onFocus={() => setEditingBlockId(block.id)}
                      onBlur={() => setEditingBlockId(null)}
                      refCallback={(el) => { blockRefs.current[index] = el; }}
                      className="min-h-[1.5em] flex-1 rounded-sm px-1 py-1 text-base outline-none focus:bg-background/60 sm:py-0.5 sm:text-sm"
                      placeholder="Item da lista..."
                    />
                  ) : (
                    <RichTextBlock
                      text={block.content}
                      className="flex-1"
                      onEdit={() => setEditingBlockId(block.id)}
                    />
                  )}
                </div>
              ) : isEditing ? (
                <EditableContent
                  blockId={block.id}
                  initialContent={block.content}
                  onInput={(text) => updateBlock(index, { content: text })}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  onFocus={() => setEditingBlockId(block.id)}
                  onBlur={() => setEditingBlockId(null)}
                  refCallback={(el) => { blockRefs.current[index] = el; }}
                  className={cn(
                    "min-h-[1.5em] rounded-sm px-1 py-1 text-base outline-none focus:bg-background/60 sm:py-0.5 sm:text-sm",
                    blockClassName(block.type)
                  )}
                  placeholder={
                    block.type === "heading1" ? "Título 1" : block.type === "heading2" ? "Título 2" : block.type === "heading3" ? "Título 3" : "Escreva uma linha..."
                  }
                />
              ) : (
                <RichTextBlock
                  text={block.content}
                  className={cn("px-1 py-1", blockClassName(block.type))}
                  onEdit={() => setEditingBlockId(block.id)}
                />
              )}
            </div>

            {block.type !== "freeform" && <button
              type="button"
              onClick={() => deleteBlock(index)}
              className="mt-1 flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded text-destructive/60 opacity-100 transition-opacity hover:bg-destructive/10 sm:min-h-0 sm:min-w-0 sm:p-0.5 sm:opacity-0 sm:group-hover/block:opacity-100"
            >
              <Trash2 className="h-4 w-4 sm:h-3 w-3" />
            </button>}

            {slashMenuIndex === index && (
              <div className="absolute left-8 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 shadow-lg">
                {BLOCK_TYPES.map((blockType) => {
                  const Icon = blockType.icon;
                  return (
                    <button
                      key={blockType.type}
                      onClick={() => handleSlashSelect(blockType.type, index)}
                      className="flex min-h-[44px] w-full items-center gap-2 rounded-sm px-2 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground sm:min-h-0 sm:py-1.5"
                    >
                      <Icon className="h-4 w-4" />
                      {blockType.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-2">
        <BlockTypeMenu
          onSelect={(type) => addBlock(type)}
          auxiliaryOnly
          trigger={
            <button
              type="button"
              className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground/60 transition-colors hover:bg-background/45 hover:text-muted-foreground"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </button>
          }
        />
      </div>
    </div>
  );
}

function BlockTypeMenu({
  onSelect,
  trigger,
  auxiliaryOnly = false,
}: {
  onSelect: (type: BlockType) => void;
  trigger?: React.ReactNode;
  auxiliaryOnly?: boolean;
}) {
  const availableTypes = auxiliaryOnly
    ? BLOCK_TYPES.filter((item) => item.type === "checklist" || item.type === "attachment")
    : BLOCK_TYPES;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="flex min-h-9 min-w-9 items-center justify-center rounded hover:bg-muted sm:min-h-0 sm:min-w-0 sm:p-0.5"
          >
            <Plus className="h-4 w-4 text-muted-foreground sm:h-3.5 sm:w-3.5" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {availableTypes.map((blockType) => {
          const Icon = blockType.icon;
          return (
            <DropdownMenuItem
              key={blockType.type}
              onClick={() => onSelect(blockType.type)}
              className="min-h-[44px] sm:min-h-0"
            >
              <Icon className="mr-2 h-4 w-4" />
              {blockType.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RichTextBlock({
  text,
  className,
  onEdit,
}: {
  text: string;
  className?: string;
  onEdit: () => void;
}) {
  const imageUrls = getImageUrls(text);
  const isHtml = /<[a-z][\s\S]*>/i.test(text);

  return (
    <div
      className={cn("min-h-[1.5em] cursor-text break-words text-base leading-6 sm:text-sm", className)}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("a") || target.closest("img")) return;
        onEdit();
      }}
    >
      {isHtml ? (
        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
      ) : (
        <LinkifiedText text={text} />
      )}
      {imageUrls.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {imageUrls.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border/60 bg-background/35">
              <img src={url} alt="Imagem da anotação" className="max-h-72 w-full object-contain" loading="lazy" />
            </a>
          ))}
        </div>
      )}
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
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
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
            className="mx-auto max-h-96 w-auto rounded"
            loading="lazy"
          />
        </a>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
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
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-accent"
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
