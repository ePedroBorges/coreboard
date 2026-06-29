import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TagSelector } from "./TagSelector";
import { makeNoteBlocks } from "@/lib/noteUtils";
import { Block, Notebook } from "@/types/notes";

interface QuickCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebooks: Notebook[];
  defaultNotebookId?: string;
  onSave: (input: { title: string; content: Block[]; notebookId?: string; pinned: boolean; createTask: boolean }) => Promise<void>;
}

type ChecklistDraft = { id: string; text: string; checked?: boolean };

const createDraftItem = (): ChecklistDraft => ({
  id: Math.random().toString(36).slice(2, 10),
  text: "",
});

export function QuickCaptureModal({ open, onOpenChange, notebooks, defaultNotebookId, onSave }: QuickCaptureModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState(defaultNotebookId || "");
  const [pinned, setPinned] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistDraft[]>([]);
  const [savingMode, setSavingMode] = useState<"note" | "task" | null>(null);

  useEffect(() => {
    if (open) setSelectedNotebookId(defaultNotebookId || notebooks[0]?.id || "");
  }, [defaultNotebookId, notebooks, open]);

  const canSave = useMemo(
    () => !!title.trim() || !!content.trim() || checklistItems.some((item) => item.text.trim()),
    [checklistItems, content, title]
  );

  const reset = () => {
    setTitle("");
    setContent("");
    setTags([]);
    setSelectedNotebookId(defaultNotebookId || notebooks[0]?.id || "");
    setPinned(false);
    setChecklistItems([]);
    setSavingMode(null);
  };

  const save = async (createTask: boolean) => {
    if (!canSave) return;
    setSavingMode(createTask ? "task" : "note");
    await onSave({
      title: title.trim(),
      content: makeNoteBlocks(content, checklistItems, tags),
      notebookId: selectedNotebookId || defaultNotebookId,
      pinned,
      createTask,
    });
    reset();
    onOpenChange(false);
  };

  const updateChecklistItem = (id: string, text: string) => {
    setChecklistItems((items) => items.map((item) => item.id === id ? { ...item, text } : item));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-lg border-border/70 bg-card p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Captura avançada</DialogTitle>
          <DialogDescription>
            Crie uma nota completa com texto, checklist, tags e ação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título opcional" />
          <div className="space-y-2">
            <Label htmlFor="quick-capture-notebook">Caderno</Label>
            <Select value={selectedNotebookId} onValueChange={setSelectedNotebookId}>
              <SelectTrigger id="quick-capture-notebook">
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
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Escreva livremente..."
            className="min-h-40 resize-y leading-6"
          />

          <div className="rounded-md border border-border/60 bg-background/35 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckSquare className="h-4 w-4 text-primary" />
                Checklist
              </div>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => setChecklistItems((items) => [...items, createDraftItem()])}>
                <Plus className="h-3.5 w-3.5" />
                Item
              </Button>
            </div>
            <div className="space-y-2">
              {checklistItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">Adicione itens quando a ideia já vier com próximos passos.</p>
              ) : checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox checked={false} disabled className="h-4 w-4" />
                  <Input
                    value={item.text}
                    onChange={(event) => updateChecklistItem(item.id, event.target.value)}
                    placeholder="Item do checklist"
                    className="h-9"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setChecklistItems((items) => items.filter((current) => current.id !== item.id))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</div>
            <TagSelector value={tags} onChange={setTags} />
          </div>

          <button
            type="button"
            onClick={() => setPinned((current) => !current)}
            className="flex min-h-10 items-center gap-2 rounded-md border border-border/60 bg-background/35 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pin className="h-4 w-4" />
            {pinned ? "Nota fixada" : "Fixar nota"}
          </button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" variant="secondary" onClick={() => save(true)} disabled={!canSave || !!savingMode}>
            {savingMode === "task" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar e criar tarefa
          </Button>
          <Button type="button" onClick={() => save(false)} disabled={!canSave || !!savingMode}>
            {savingMode === "note" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
