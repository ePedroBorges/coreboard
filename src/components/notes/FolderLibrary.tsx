import { useMemo, useState } from "react";
import { FileText, Folder, FolderOpen, FolderPlus, FolderInput, Loader2, Pin, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContextHelp } from "@/components/ui/context-help";
import { Notebook, Page } from "@/types/notes";
import { DEFAULT_NOTEBOOK_NAME, getNotePreview, getNoteTitle } from "@/lib/noteUtils";
import { cn } from "@/lib/utils";
import { useLongPress } from "@/hooks/useLongPress";
import { BulkActionBar } from "@/components/common/BulkActionBar";

interface FolderLibraryProps {
  notes: Page[];
  folders: Notebook[];
  activeFolderId?: string;
  loading: boolean;
  pinnedFolderIds: string[];
  onOpenRoot: () => void;
  onOpenFolder: (id: string) => void;
  onCreateFolder: (title: string, parentId?: string | null) => Promise<Notebook>;
  onRenameFolder: (id: string, title: string) => void;
  onDeleteFolder: (id: string, targetFolderId?: string) => void;
  onTogglePinnedFolder: (id: string) => void;
  onCreateNote: (folderId: string) => void;
  onOpenNote: (page: Page) => void;
  onMoveNote: (page: Page, folderId: string) => void;
  onCreateTaskFromPage: (page: Page) => void;
  onDeleteNote: (page: Page) => void;
  onToggleNoteFavorite: (page: Page, favorite: boolean) => void;
}

export function FolderLibrary({
  notes,
  folders,
  activeFolderId,
  loading,
  pinnedFolderIds,
  onOpenRoot,
  onOpenFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onTogglePinnedFolder,
  onCreateNote,
  onOpenNote,
  onMoveNote,
  onCreateTaskFromPage,
  onDeleteNote,
  onToggleNoteFavorite,
}: FolderLibraryProps) {
  const activeFolder = folders.find((folder) => folder.id === activeFolderId);
  const rootFolders = folders.filter((folder) => !folder.parent_id);
  const subfolders = activeFolder ? folders.filter((folder) => folder.parent_id === activeFolder.id) : [];
  const visibleNotes = activeFolder ? notes.filter((note) => note.notebook_id === activeFolder.id) : [];
  const [createParentId, setCreateParentId] = useState<string | null | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameFolder, setRenameFolder] = useState<Notebook | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteFolder, setDeleteFolder] = useState<Notebook | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedNoteIds([]);
  };

  const toggleNoteSelection = (id: string) => {
    setSelectedNoteIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const noteCountByFolder = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((note) => counts.set(note.notebook_id, (counts.get(note.notebook_id) || 0) + 1));
    return counts;
  }, [notes]);

  const sortedNotes = [...visibleNotes].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const beginCreate = (parentId: string | null) => {
    setCreateParentId(parentId);
    setNewFolderName("");
  };

  const submitCreate = async () => {
    const title = newFolderName.trim();
    if (!title) return toast.error("Informe o nome da pasta.");
    setCreating(true);
    try {
      await onCreateFolder(title, createParentId || null);
      setCreateParentId(undefined);
      setNewFolderName("");
    } finally {
      setCreating(false);
    }
  };

  const openDelete = (folder: Notebook) => {
    const children = folders.filter((candidate) => candidate.parent_id === folder.id);
    if (children.length > 0) {
      toast.error("Mova ou exclua as subpastas antes de excluir esta pasta.");
      return;
    }
    const fallback = folders.find((candidate) => candidate.id !== folder.id && !candidate.parent_id);
    setDeleteTargetId(fallback?.id || "");
    setDeleteFolder(folder);
  };

  const folderDirectNotes = deleteFolder ? notes.filter((note) => note.notebook_id === deleteFolder.id).length : 0;
  const deleteTargets = folders.filter((folder) => folder.id !== deleteFolder?.id && !folder.parent_id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-3 sm:p-6">
      <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            {activeFolder && activeFolder.title.trim().toLowerCase() !== DEFAULT_NOTEBOOK_NAME.toLowerCase() ? (
              <button type="button" className="truncate text-left text-2xl font-semibold tracking-tight hover:text-primary" onClick={() => { setRenameFolder(activeFolder); setRenameValue(activeFolder.title); }} title="Clique para alterar o título">{activeFolder.title}</button>
            ) : <h1 className="truncate text-2xl font-semibold tracking-tight">{activeFolder?.title || "Pastas"}</h1>}
            <ContextHelp text={activeFolder ? "As anotações sempre ficam dentro desta pasta ou subpasta." : "Use pastas para separar áreas da sua vida e subpastas para projetos ou assuntos."} />
          </div>
        </div>

        <div className="grid gap-2 sm:flex">
          {!activeFolder && <Button className="h-10 gap-2" onClick={() => beginCreate(null)}><FolderPlus className="h-4 w-4" />Nova pasta</Button>}
          {activeFolder && !activeFolder.parent_id && <Button variant="outline" className="h-10 gap-2" onClick={() => beginCreate(activeFolder.id)}><FolderPlus className="h-4 w-4" />Nova subpasta</Button>}
          {activeFolder && <Button className="h-10 gap-2" onClick={() => onCreateNote(activeFolder.id)}><Plus className="h-4 w-4" />Nova anotação</Button>}
        </div>
      </header>

      {createParentId !== undefined && (
        <div className="flex flex-col gap-2 border border-border/60 bg-card/55 p-3 sm:flex-row">
          <Input value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submitCreate(); if (event.key === "Escape") setCreateParentId(undefined); }} placeholder={createParentId ? "Nome da subpasta" : "Nome da pasta"} autoFocus />
          <Button onClick={() => void submitCreate()} disabled={creating || !newFolderName.trim()}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}</Button>
          <Button variant="outline" onClick={() => setCreateParentId(undefined)}>Cancelar</Button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : !activeFolder ? (
        rootFolders.length === 0 ? <EmptyFolderState title="Nenhuma pasta ainda" text="Crie uma pasta para começar a organizar suas anotações." /> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rootFolders.map((folder) => <FolderCard key={folder.id} folder={folder} noteCount={noteCountByFolder.get(folder.id) || 0} childCount={folders.filter((candidate) => candidate.parent_id === folder.id).length} pinned={pinnedFolderIds.includes(folder.id)} onOpen={() => onOpenFolder(folder.id)} onPin={() => onTogglePinnedFolder(folder.id)} onRename={() => { setRenameFolder(folder); setRenameValue(folder.title); }} onDelete={() => openDelete(folder)} />)}
          </div>
        )
      ) : (
        <div className="space-y-6">
          {!activeFolder.parent_id && subfolders.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Folder className="h-4 w-4 text-primary" />Subpastas</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {subfolders.map((folder) => <FolderCard key={folder.id} folder={folder} noteCount={noteCountByFolder.get(folder.id) || 0} childCount={0} pinned={pinnedFolderIds.includes(folder.id)} onOpen={() => onOpenFolder(folder.id)} onPin={() => onTogglePinnedFolder(folder.id)} onRename={() => { setRenameFolder(folder); setRenameValue(folder.title); }} onDelete={() => openDelete(folder)} />)}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" />Anotações <Badge variant="secondary" className="rounded-full">{sortedNotes.length}</Badge></h2>
            {sortedNotes.length === 0 ? <EmptyFolderState title="Nenhuma anotação aqui" text="Crie uma anotação e comece a registrar suas ideias." /> : (
              <div className="grid gap-3 lg:grid-cols-2">
                {sortedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    folders={folders}
                    selectionMode={selectionMode}
                    selected={selectedNoteIds.includes(note.id)}
                    onStartSelection={() => { setSelectionMode(true); setSelectedNoteIds([note.id]); }}
                    onToggleSelection={() => toggleNoteSelection(note.id)}
                    onOpenNote={onOpenNote}
                    onMoveNote={onMoveNote}
                    onCreateTaskFromPage={onCreateTaskFromPage}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {selectionMode && (
        <BulkActionBar
          count={selectedNoteIds.length}
          total={sortedNotes.length}
          allSelected={selectedNoteIds.length === sortedNotes.length && sortedNotes.length > 0}
          onSelectAll={() => setSelectedNoteIds(selectedNoteIds.length === sortedNotes.length ? [] : sortedNotes.map((note) => note.id))}
          onClear={exitSelection}
        >
          <Select
            value=""
            onValueChange={(folderId) => {
              sortedNotes.filter((note) => selectedNoteIds.includes(note.id)).forEach((note) => onMoveNote(note, folderId));
              toast.success("Anotações movidas.");
              exitSelection();
            }}
          >
            <SelectTrigger className="h-9 w-40 text-xs" disabled={selectedNoteIds.length === 0}>
              <FolderInput className="mr-1 h-4 w-4" />
              <SelectValue placeholder="Mover para" />
            </SelectTrigger>
            <SelectContent>{folders.map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.parent_id ? `↳ ${folder.title}` : folder.title}</SelectItem>)}</SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={selectedNoteIds.length === 0}
            onClick={() => {
              const selected = sortedNotes.filter((note) => selectedNoteIds.includes(note.id));
              const shouldPin = selected.some((note) => !note.is_favorite);
              selected.forEach((note) => onToggleNoteFavorite(note, shouldPin));
              toast.success(shouldPin ? "Anotações fixadas." : "Anotações desafixadas.");
              exitSelection();
            }}
          >
            <Pin className="h-4 w-4" />
            Fixar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-9 gap-1.5"
            disabled={selectedNoteIds.length === 0}
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
        </BulkActionBar>
      )}

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir anotações?</DialogTitle>
            <DialogDescription>{selectedNoteIds.length} anotação(ões) serão excluídas permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                sortedNotes.filter((note) => selectedNoteIds.includes(note.id)).forEach((note) => onDeleteNote(note));
                setBulkDeleteOpen(false);
                exitSelection();
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameFolder} onOpenChange={(open) => !open && setRenameFolder(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md"><DialogHeader><DialogTitle>Renomear pasta</DialogTitle><DialogDescription>Escolha um nome simples e fácil de reconhecer.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="rename-folder">Nome da pasta</Label><Input id="rename-folder" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} autoFocus /></div><DialogFooter><Button variant="outline" onClick={() => setRenameFolder(null)}>Cancelar</Button><Button disabled={!renameValue.trim()} onClick={() => { if (renameFolder) onRenameFolder(renameFolder.id, renameValue.trim()); setRenameFolder(null); }}>Salvar</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={!!deleteFolder} onOpenChange={(open) => !open && setDeleteFolder(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md"><DialogHeader><DialogTitle>Excluir pasta?</DialogTitle><DialogDescription>{folderDirectNotes > 0 ? `As ${folderDirectNotes} anotações serão movidas antes da exclusão.` : "Esta pasta está vazia e pode ser excluída com segurança."}</DialogDescription></DialogHeader>{folderDirectNotes > 0 && <div className="space-y-2"><Label>Mover anotações para</Label><Select value={deleteTargetId} onValueChange={setDeleteTargetId}><SelectTrigger><SelectValue placeholder="Escolha uma pasta" /></SelectTrigger><SelectContent>{deleteTargets.map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.title}</SelectItem>)}</SelectContent></Select></div>}<DialogFooter><Button variant="outline" onClick={() => setDeleteFolder(null)}>Cancelar</Button><Button variant="destructive" disabled={folderDirectNotes > 0 && !deleteTargetId} onClick={() => { if (deleteFolder) onDeleteFolder(deleteFolder.id, folderDirectNotes > 0 ? deleteTargetId : undefined); setDeleteFolder(null); }}>Excluir pasta</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

function NoteCard({
  note,
  folders,
  selectionMode,
  selected,
  onStartSelection,
  onToggleSelection,
  onOpenNote,
  onMoveNote,
  onCreateTaskFromPage,
}: {
  note: Page;
  folders: Notebook[];
  selectionMode: boolean;
  selected: boolean;
  onStartSelection: () => void;
  onToggleSelection: () => void;
  onOpenNote: (page: Page) => void;
  onMoveNote: (page: Page, folderId: string) => void;
  onCreateTaskFromPage: (page: Page) => void;
}) {
  const { handlers, consumeLongPress } = useLongPress(() => {
    if (selectionMode) onToggleSelection();
    else onStartSelection();
  });

  return (
    <article
      {...handlers}
      className={cn(
        "group rounded-md border bg-card/55 p-4 transition-colors hover:border-primary/35 hover:bg-card/80",
        selected ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border/60",
      )}
    >
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => {
          if (consumeLongPress()) return;
          if (selectionMode) onToggleSelection();
          else onOpenNote(note);
        }}
      >
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 break-words font-semibold">{getNoteTitle(note)}</h3>
          {selectionMode && <span className={cn("mt-0.5 h-4 w-4 shrink-0 rounded border", selected ? "border-primary bg-primary" : "border-border")} />}
          {note.is_favorite && <Star className="h-4 w-4 shrink-0 fill-warning text-warning" />}
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{getNotePreview(note) || "Anotação sem conteúdo."}</p>
      </button>
      {!selectionMode && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
          <Select value={note.notebook_id} onValueChange={(folderId) => onMoveNote(note, folderId)}>
            <SelectTrigger className="h-8 min-w-36 flex-1 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{folders.map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.parent_id ? `↳ ${folder.title}` : folder.title}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onCreateTaskFromPage(note)}>Criar tarefa</Button>
        </div>
      )}
    </article>
  );
}

function FolderCard({ folder, noteCount, childCount, pinned, onOpen, onPin, onRename, onDelete }: { folder: Notebook; noteCount: number; childCount: number; pinned: boolean; onOpen: () => void; onPin: () => void; onRename: () => void; onDelete: () => void }) {
  const locked = folder.title.trim().toLowerCase() === DEFAULT_NOTEBOOK_NAME.toLowerCase();
  return (
    <article className="rounded-md border border-border/60 bg-card/55 p-3 transition-colors hover:border-primary/40 hover:bg-card/80">
      <div className="flex w-full items-center gap-3 text-left">
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary" onClick={onOpen} title="Abrir pasta"><FolderOpen className="h-5 w-5" /></button>
        <span className="min-w-0 flex-1">
          <button type="button" className="block max-w-full truncate font-semibold hover:text-primary" onClick={locked ? onOpen : onRename} title={locked ? "Abrir pasta" : "Clique para alterar o título"}>{folder.title}</button>
          <button type="button" className="mt-1 block text-xs text-muted-foreground hover:text-foreground" onClick={onOpen}>{childCount > 0 ? `${childCount} subpasta${childCount === 1 ? "" : "s"} · ` : ""}{noteCount} anotaç{noteCount === 1 ? "ão" : "ões"}</button>
        </span>
      </div>
      <div className="mt-3 flex justify-end gap-1 border-t border-border/50 pt-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPin} title={pinned ? "Desafixar pasta" : "Fixar pasta"}><Pin className={cn("h-4 w-4", pinned && "fill-primary text-primary")} /></Button>
        {!locked && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="Excluir pasta"><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </article>
  );
}

function EmptyFolderState({ title, text }: { title: string; text: string }) {
  return <div className="border border-dashed border-border/70 bg-card/35 px-4 py-10 text-center"><Folder className="mx-auto h-7 w-7 text-muted-foreground" /><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>;
}
