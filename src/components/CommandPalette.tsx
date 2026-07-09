import { BookOpen, CalendarDays, CheckCircle2, FileText, ListChecks, NotebookPen, Plus, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { WeeklyTask } from "@/hooks/useWeeklyTasks";
import { Notebook, Page } from "@/types/notes";
import { DEFAULT_NOTEBOOK_NAME, getNotePreview, getNoteTitle } from "@/lib/noteUtils";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebooks: Notebook[];
  notes: Page[];
  tasks: WeeklyTask[];
  notebookTitleById: Map<string, string>;
  onOpenNotebook: (notebookId: string) => void;
  onOpenNote: (page: Page) => void;
  onOpenTask: (task: WeeklyTask) => void;
  onCreateNote: () => void;
  onCreateTask: () => void;
  onOpenSettings: () => void;
};

const runAndClose = (run: () => void, close: () => void) => {
  run();
  close();
};

export function CommandPalette({
  open,
  onOpenChange,
  notebooks,
  notes,
  tasks,
  notebookTitleById,
  onOpenNotebook,
  onOpenNote,
  onOpenTask,
  onCreateNote,
  onCreateTask,
  onOpenSettings,
}: CommandPaletteProps) {
  const close = () => onOpenChange(false);
  const recentNotes = notes.slice(0, 8);
  const recentTasks = tasks.slice(0, 8);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar notas, tarefas, cadernos ou acoes..." />
      <CommandList className="max-h-[min(70svh,460px)]">
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        <CommandGroup heading="Acoes">
          <CommandItem value="nova anotacao captura nota" onSelect={() => runAndClose(onCreateNote, close)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova anotacao
            <CommandShortcut>Nota</CommandShortcut>
          </CommandItem>
          <CommandItem value="nova tarefa criar task" onSelect={() => runAndClose(onCreateTask, close)}>
            <ListChecks className="mr-2 h-4 w-4" />
            Nova tarefa
            <CommandShortcut>Tarefa</CommandShortcut>
          </CommandItem>
          <CommandItem value="configuracoes perfil pro" onSelect={() => runAndClose(onOpenSettings, close)}>
            <Search className="mr-2 h-4 w-4" />
            Abrir Configuracoes
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Cadernos">
          {notebooks.slice(0, 10).map((notebook) => (
            <CommandItem
              key={notebook.id}
              value={`caderno ${notebook.title} ${notebook.page_count || 0}`}
              onSelect={() => runAndClose(() => onOpenNotebook(notebook.id), close)}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">{notebook.title}</span>
              <Badge variant="outline" className="ml-2 rounded-full">
                {notebook.page_count || 0}
              </Badge>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Anotacoes">
          {recentNotes.map((page) => (
            <CommandItem
              key={page.id}
              value={`anotacao ${getNoteTitle(page)} ${getNotePreview(page, 120)} ${notebookTitleById.get(page.notebook_id) || DEFAULT_NOTEBOOK_NAME}`}
              onSelect={() => runAndClose(() => onOpenNote(page), close)}
            >
              <NotebookPen className="mr-2 h-4 w-4" />
              <div className="min-w-0 flex-1">
                <div className="truncate">{getNoteTitle(page)}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {notebookTitleById.get(page.notebook_id) || DEFAULT_NOTEBOOK_NAME}
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Tarefas">
          {recentTasks.map((task) => (
            <CommandItem
              key={task.id}
              value={`tarefa ${task.title} ${task.description || ""} ${task.assignee || ""} ${task.source_note_title || ""}`}
              onSelect={() => runAndClose(() => onOpenTask(task), close)}
            >
              {task.status === "completed" ? (
                <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
              ) : (
                <CalendarDays className="mr-2 h-4 w-4 text-warning" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate">{task.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {task.task_date} · {task.status === "completed" ? "Concluida" : "Pendente"}
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Recursos Pro">
          <CommandItem value="ia anotacao para tarefa pro" onSelect={() => runAndClose(onCreateNote, close)}>
            <FileText className="mr-2 h-4 w-4" />
            Capturar nota e transformar em tarefa
          </CommandItem>
          <CommandItem value="anexos arquivos imagens pro" onSelect={() => runAndClose(onCreateNote, close)}>
            <FileText className="mr-2 h-4 w-4" />
            Criar anotacao com anexos
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
