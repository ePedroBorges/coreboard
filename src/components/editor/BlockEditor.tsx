import { useState, useRef, KeyboardEvent } from "react";
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
  Image,
  Paintbrush,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
];

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [slashMenuIndex, setSlashMenuIndex] = useState<number | null>(null);
  const blockRefs = useRef<(HTMLElement | null)[]>([]);

  const addBlock = (type: BlockType = "paragraph", afterIndex?: number) => {
    const newBlock: Block = { id: generateId(), type, content: "" };
    if (type === "checklist") newBlock.checked = false;

    const newBlocks = [...blocks];
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : newBlocks.length;
    newBlocks.splice(insertAt, 0, newBlock);
    onChange(newBlocks);

    // Focus new block
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
    // Focus previous block
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
      const el = e.target as HTMLElement;
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
    updateBlock(index, { type, content: "" });
    if (type === "checklist") updateBlock(index, { type, content: "", checked: false });
    setSlashMenuIndex(null);
    setTimeout(() => blockRefs.current[index]?.focus(), 50);
  };

  const getBlockClassName = (type: BlockType) => {
    switch (type) {
      case "heading1":
        return "text-2xl font-bold";
      case "heading2":
        return "text-xl font-semibold";
      case "heading3":
        return "text-lg font-medium";
      case "bullet-list":
        return "pl-4";
      case "numbered-list":
        return "pl-4";
      default:
        return "";
    }
  };

  if (blocks.length === 0) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => addBlock()}
          className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground text-sm py-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Comece a escrever ou pressione / para comandos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {blocks.map((block, index) => (
        <div key={block.id} className="group/block flex items-start gap-1 relative">
          {/* Drag handle + actions */}
          <div className="flex items-center gap-0.5 pt-1 opacity-0 group-hover/block:opacity-100 transition-opacity shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-0.5 rounded hover:bg-muted">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {BLOCK_TYPES.map((bt) => (
                  <DropdownMenuItem
                    key={bt.type}
                    onClick={() => addBlock(bt.type, index)}
                  >
                    <bt.icon className="mr-2 h-4 w-4" />
                    {bt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button className="p-0.5 rounded hover:bg-muted cursor-grab">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Block content */}
          <div className="flex-1 min-w-0">
            {block.type === "checklist" ? (
              <div className="flex items-start gap-2 py-0.5">
                <Checkbox
                  checked={block.checked}
                  onCheckedChange={(checked) => updateBlock(index, { checked: !!checked })}
                  className="mt-1"
                />
                <div
                  ref={(el) => { blockRefs.current[index] = el; }}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) =>
                    updateBlock(index, { content: (e.target as HTMLElement).textContent || "" })
                  }
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={cn(
                    "flex-1 outline-none text-sm py-0.5 min-h-[1.5em]",
                    block.checked && "line-through text-muted-foreground"
                  )}
                  data-placeholder="Item..."
                >
                  {block.content}
                </div>
              </div>
            ) : block.type === "bullet-list" ? (
              <div className="flex items-start gap-2 py-0.5">
                <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
                <div
                  ref={(el) => { blockRefs.current[index] = el; }}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) =>
                    updateBlock(index, { content: (e.target as HTMLElement).textContent || "" })
                  }
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="flex-1 outline-none text-sm py-0.5 min-h-[1.5em]"
                  data-placeholder="Item da lista..."
                />
              </div>
            ) : block.type === "numbered-list" ? (
              <div className="flex items-start gap-2 py-0.5">
                <span className="font-mono-accent text-xs text-muted-foreground mt-0.5 shrink-0 w-4 text-right">
                  {index + 1}.
                </span>
                <div
                  ref={(el) => { blockRefs.current[index] = el; }}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) =>
                    updateBlock(index, { content: (e.target as HTMLElement).textContent || "" })
                  }
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="flex-1 outline-none text-sm py-0.5 min-h-[1.5em]"
                  data-placeholder="Item..."
                />
              </div>
            ) : (
              <div
                ref={(el) => { blockRefs.current[index] = el; }}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) =>
                  updateBlock(index, { content: (e.target as HTMLElement).textContent || "" })
                }
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={cn(
                  "outline-none text-sm py-0.5 min-h-[1.5em]",
                  getBlockClassName(block.type)
                )}
                data-placeholder={
                  block.type === "heading1"
                    ? "Título 1"
                    : block.type === "heading2"
                    ? "Título 2"
                    : block.type === "heading3"
                    ? "Título 3"
                    : "Escreva algo ou pressione / para comandos..."
                }
              />
            )}
          </div>

          {/* Delete button */}
          <button
            onClick={() => deleteBlock(index)}
            className="p-0.5 rounded hover:bg-destructive/10 opacity-0 group-hover/block:opacity-100 transition-opacity mt-1 shrink-0"
          >
            <Trash2 className="h-3 w-3 text-destructive/60" />
          </button>

          {/* Slash menu */}
          {slashMenuIndex === index && (
            <div className="absolute left-8 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 shadow-lg">
              {BLOCK_TYPES.map((bt) => (
                <button
                  key={bt.type}
                  onClick={() => handleSlashSelect(bt.type, index)}
                  className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
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
        className="flex items-center gap-2 w-full text-muted-foreground/40 hover:text-muted-foreground text-sm py-2 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar bloco
      </button>
    </div>
  );
}
