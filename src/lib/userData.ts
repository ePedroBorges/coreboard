import { format, startOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Database, Json } from "@/integrations/supabase/types";
import { Block } from "@/types/notes";
import { DEFAULT_NOTEBOOK_NAMES } from "@/lib/noteUtils";
import { UserSettings } from "@/hooks/useUserSettings";

type NotebookRow = Database["public"]["Tables"]["notebooks"]["Row"];
type PageRow = Database["public"]["Tables"]["pages"]["Row"];
type TaskRow = Database["public"]["Tables"]["weekly_tasks"]["Row"];
type ReasonRow = Database["public"]["Tables"]["task_pending_reasons"]["Row"];
type TagRow = Database["public"]["Tables"]["tags"]["Row"];
type PageTagRow = Database["public"]["Tables"]["page_tags"]["Row"];
type PageVersionRow = Database["public"]["Tables"]["page_versions"]["Row"];
type TaskStatus = Database["public"]["Enums"]["task_status"];

export interface VistaBackup {
  app: "VISTA Tasks Control";
  backupVersion: "1.0";
  exportedAt: string;
  userId: string;
  data: {
    notebooks: NotebookRow[];
    notes: PageRow[];
    tasks: TaskRow[];
    taskPendingReasons: ReasonRow[];
    tags: TagRow[];
    pageTags: PageTagRow[];
    pageVersions: PageVersionRow[];
    taskOrigins: Record<string, unknown>;
    settings: UserSettings;
  };
}

export type ImportMode = "merge" | "replace";

const taskOriginStorageKey = (userId: string) => `vistaTaskOrigins:${userId}`;

const requireUser = (userId: string) => {
  if (!userId) throw new Error("Usuário não autenticado.");
};

const safeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
};

const makeBlock = (type: Block["type"], content: string, extra: Partial<Block> = {}): Block => ({
  id: safeId(),
  type,
  content,
  ...extra,
});

const getTaskOrigins = (userId: string) => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(taskOriginStorageKey(userId)) || "{}");
  } catch {
    return {};
  }
};

const setTaskOrigins = (userId: string, origins: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(taskOriginStorageKey(userId), JSON.stringify(origins));
};

export async function collectUserBackup(userId: string, settings: UserSettings): Promise<VistaBackup> {
  requireUser(userId);

  const [
    notebooksResult,
    notesResult,
    tasksResult,
    reasonsResult,
    tagsResult,
  ] = await Promise.all([
    supabase.from("notebooks").select("*").eq("user_id", userId).order("position", { ascending: true }),
    supabase.from("pages").select("*").eq("user_id", userId).order("position", { ascending: true }),
    supabase.from("weekly_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("task_pending_reasons").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("tags").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
  ]);

  const firstError = notebooksResult.error || notesResult.error || tasksResult.error || reasonsResult.error || tagsResult.error;
  if (firstError) throw firstError;

  const notes = notesResult.data || [];
  const tags = tagsResult.data || [];
  const noteIds = notes.map((note) => note.id);
  const tagIds = tags.map((tag) => tag.id);

  const pageTagsResult = noteIds.length > 0 || tagIds.length > 0
    await supabase
      .from("page_tags")
      .select("*")
      .or([
        noteIds.length `page_id.in.(${noteIds.join(",")})` : "",
        tagIds.length `tag_id.in.(${tagIds.join(",")})` : "",
      ].filter(Boolean).join(","))
    : { data: [], error: null };

  const versionsResult = noteIds.length > 0 ? await supabase.from("page_versions").select("*").in("page_id", noteIds) : { data: [], error: null };

  if (pageTagsResult.error) throw pageTagsResult.error;
  if (versionsResult.error) throw versionsResult.error;

  return {
    app: "VISTA Tasks Control",
    backupVersion: "1.0",
    exportedAt: new Date().toISOString(),
    userId,
    data: {
      notebooks: notebooksResult.data || [],
      notes,
      tasks: tasksResult.data || [],
      taskPendingReasons: reasonsResult.data || [],
      tags,
      pageTags: pageTagsResult.data || [],
      pageVersions: versionsResult.data || [],
      taskOrigins: getTaskOrigins(userId),
      settings,
    },
  };
}

export function downloadBackup(backup: VistaBackup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `vista-tasks-control-backup-${format(new Date(), "yyyy-MM-dd")}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function validateBackup(input: unknown): VistaBackup {
  if (!input || typeof input !== "object") throw new Error("Arquivo inválido. Selecione um backup JSON do VISTA Tasks Control.");
  const backup = input as VistaBackup;
  if (backup.app !== "VISTA Tasks Control" || backup.backupVersion !== "1.0" || !backup.data) {
    throw new Error("Este arquivo não parece ser um backup válido do VISTA Tasks Control.");
  }
  return {
    ...backup,
    data: {
      notebooks: Array.isArray(backup.data?.notebooks) backup.data?.notebooks : [],
      notes: Array.isArray(backup.data?.notes) backup.data?.notes : [],
      tasks: Array.isArray(backup.data?.tasks) backup.data?.tasks : [],
      taskPendingReasons: Array.isArray(backup.data?.taskPendingReasons) backup.data?.taskPendingReasons : [],
      tags: Array.isArray(backup.data?.tags) backup.data?.tags : [],
      pageTags: Array.isArray(backup.data?.pageTags) backup.data?.pageTags : [],
      pageVersions: Array.isArray(backup.data?.pageVersions) backup.data?.pageVersions : [],
      taskOrigins: backup.data?.taskOrigins || {},
      settings: backup.data?.settings || { hasSeenOnboarding: true, validationChecklist: {} },
    },
  };
}

export async function resetUserData(userId: string, recreateDefaults = true) {
  requireUser(userId);

  const { data: pages } = await supabase.from("pages").select("id").eq("user_id", userId);
  const { data: tags } = await supabase.from("tags").select("id").eq("user_id", userId);
  const pageIds = (pages || []).map((page) => page.id);
  const tagIds = (tags || []).map((tag) => tag.id);

  if (pageIds.length > 0) {
    await supabase.from("page_tags").delete().in("page_id", pageIds);
    await supabase.from("page_versions").delete().in("page_id", pageIds);
  }
  if (tagIds.length > 0) {
    await supabase.from("page_tags").delete().in("tag_id", tagIds);
  }

  const operations = [
    supabase.from("task_pending_reasons").delete().eq("user_id", userId),
    supabase.from("weekly_tasks").delete().eq("user_id", userId),
    supabase.from("pages").delete().eq("user_id", userId),
    supabase.from("tags").delete().eq("user_id", userId),
    supabase.from("notebooks").delete().eq("user_id", userId),
  ];

  const results = await Promise.all(operations);
  const firstError = results.find((result) => result.error).error;
  if (firstError) throw firstError;

  setTaskOrigins(userId, {});

  if (recreateDefaults) {
    const { error } = await supabase.from("notebooks").insert(
      DEFAULT_NOTEBOOK_NAMES.map((title, position) => ({ title, position, user_id: userId }))
    );
    if (error) throw error;
  }
}

export async function importBackupForUser(userId: string, backup: VistaBackup, mode: ImportMode) {
  requireUser(userId);
  const validBackup = validateBackup(backup);

  if (mode === "replace") {
    await resetUserData(userId, false);
  }

  const { data: existingNotebooks, error: existingError } = await supabase
    .from("notebooks")
    .select("*")
    .eq("user_id", userId);
  if (existingError) throw existingError;

  const notebookIdMap = new Map<string, string>();
  const existingByTitle = new Map((existingNotebooks || []).map((notebook) => [notebook.title.trim().toLowerCase(), notebook.id]));
  let nextPosition = existingNotebooks.length || 0;

  for (const notebook of validBackup.data?.notebooks) {
    const title = notebook.title || "Caderno importado";
    const existingId = mode === "merge" existingByTitle.get(title.trim().toLowerCase()) : undefined;
    if (existingId) {
      notebookIdMap.set(notebook.id, existingId);
      continue;
    }
    const { data, error } = await supabase
      .from("notebooks")
      .insert({
        title,
        description: notebook.description || null,
        position: nextPosition++,
        user_id: userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    notebookIdMap.set(notebook.id, data.id);
  }

  if (notebookIdMap.size === 0) {
    const { data, error } = await supabase
      .from("notebooks")
      .insert({ title: "Geral", position: 0, user_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    notebookIdMap.set("default", data.id);
  }

  const fallbackNotebookId = Array.from(notebookIdMap.values())[0];
  const pageIdMap = new Map<string, string>();
  for (const note of validBackup.data?.notes) {
    const { data, error } = await supabase
      .from("pages")
      .insert({
        title: note.title || "Anotação importada",
        content: note.content || [],
        is_favorite: !!note.is_favorite,
        notebook_id: notebookIdMap.get(note.notebook_id) || fallbackNotebookId,
        position: note.position || 0,
        user_id: userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    pageIdMap.set(note.id, data.id);
  }

  const tagIdMap = new Map<string, string>();
  for (const tag of validBackup.data?.tags) {
    const { data, error } = await supabase
      .from("tags")
      .insert({
        name: tag.name,
        color: tag.color || "#3b82f6",
        usage_count: tag.usage_count || 0,
        user_id: userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    tagIdMap.set(tag.id, data.id);
  }

  const pageTagsToInsert = validBackup.data?.pageTags
    .map((pageTag) => ({
      page_id: pageIdMap.get(pageTag.page_id),
      tag_id: tagIdMap.get(pageTag.tag_id),
    }))
    .filter((pageTag): pageTag is { page_id: string; tag_id: string } => !!pageTag.page_id && !!pageTag.tag_id);
  if (pageTagsToInsert.length > 0) {
    const { error } = await supabase.from("page_tags").insert(pageTagsToInsert);
    if (error) throw error;
  }

  const taskIdMap = new Map<string, string>();
  for (const task of validBackup.data?.tasks) {
    const taskDate = task.task_date || format(new Date(), "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("weekly_tasks")
      .insert({
        title: task.title || "Tarefa importada",
        description: task.description || null,
        assignee: task.assignee || null,
        completed_at: task.completed_at || null,
        notebook_id: task.notebook_id ? notebookIdMap.get(task.notebook_id) || null : null,
        priority: task.priority || "medium",
        progress_current: task.progress_current || 0,
        progress_target: task.progress_target || null,
        status: (task.status || "pending") as TaskStatus,
        task_date: taskDate,
        week_start: task.week_start || format(startOfWeek(new Date(taskDate), { weekStartsOn: 1 }), "yyyy-MM-dd"),
        user_id: userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    taskIdMap.set(task.id, data.id);
  }

  for (const reason of validBackup.data?.taskPendingReasons) {
    const taskId = taskIdMap.get(reason.task_id);
    if (!taskId) continue;
    const { error } = await supabase.from("task_pending_reasons").insert({
      task_id: taskId,
      reason: reason.reason,
      description: reason.description || null,
      responsible: reason.responsible || null,
      priority: reason.priority || "medium",
      progress_current: reason.progress_current || 0,
      progress_target: reason.progress_target || null,
      completed_at: reason.completed_at || null,
      user_id: userId,
    });
    if (error) throw error;
  }

  const nextOrigins: Record<string, unknown> = mode === "merge" getTaskOrigins(userId) : {};
  Object.entries(validBackup.data?.taskOrigins || {}).forEach(([oldTaskId, origin]) => {
    const newTaskId = taskIdMap.get(oldTaskId);
    if (!newTaskId || !origin || typeof origin !== "object") return;
    const typedOrigin = origin as { notebook_id: string; source_note_id: string };
    nextOrigins[newTaskId] = {
      ...typedOrigin,
      notebook_id: typedOrigin.notebook_id ? notebookIdMap.get(typedOrigin.notebook_id) || typedOrigin.notebook_id : typedOrigin.notebook_id,
      source_note_id: typedOrigin.source_note_id ? pageIdMap.get(typedOrigin.source_note_id) || typedOrigin.source_note_id : typedOrigin.source_note_id,
    };
  });
  setTaskOrigins(userId, nextOrigins);

  return {
    notebooks: notebookIdMap.size,
    notes: pageIdMap.size,
    tasks: taskIdMap.size,
  };
}

export async function loadSampleData(userId: string) {
  requireUser(userId);

  const notebookTitles = ["Geral", "AnchorLab", "VISTA", "MEMIQ", "Estudos", "Clientes"];
  const { data: existing, error: existingError } = await supabase.from("notebooks").select("*").eq("user_id", userId);
  if (existingError) throw existingError;

  const byTitle = new Map((existing || []).map((notebook) => [notebook.title.trim().toLowerCase(), notebook]));
  const notebooks = new Map<string, NotebookRow>();
  let position = existing.length || 0;

  for (const title of notebookTitles) {
    const current = byTitle.get(title.toLowerCase());
    if (current) {
      notebooks.set(title, current);
      continue;
    }
    const { data, error } = await supabase
      .from("notebooks")
      .insert({ title, position: position++, user_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    notebooks.set(title, data);
  }

  const noteInputs = [
    { title: "Ideias para posts LinkedIn", notebook: "AnchorLab", text: "Post sobre transformar anotações soltas em tarefas executáveis.\nPost sobre rotina de validação de MVP." },
    { title: "Links da landing page", notebook: "VISTA", text: "https://www.anchorlab.com.br\nhttps://linearsistemas.com.br/\nhttps://www.totvs.com/logistica/" },
    { title: "Melhorias do VISTA Tasks Control", notebook: "VISTA", text: "Polir onboarding, backup, importacao e estados vazios para a versao atual." },
    { title: "Checklist semanal AnchorLab", notebook: "AnchorLab", checklist: ["Revisar prioridades", "Atualizar roadmap", "Publicar aprendizado da semana"] },
    { title: "Roadmap MEMIQ", notebook: "MEMIQ", text: "Organizar hipóteses, entrevistas e próximos experimentos." },
    { title: "Prospects VISTA", notebook: "Clientes", text: "Mapear empresas com operação intensa de tarefas, logística e atendimento." },
  ];

  for (const [index, note] of noteInputs.entries()) {
    const content: Block[] = note.checklist
      note.checklist.map((item) => makeBlock("checklist", item, { checked: false }))
      : [makeBlock("freeform", note.text || "")];
    const { error } = await supabase.from("pages").insert({
      title: note.title,
      content: content as unknown as Json,
      notebook_id: notebooks.get(note.notebook).id || notebooks.get("Geral")!.id,
      position: index,
      user_id: userId,
    });
    if (error) throw error;
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const taskInputs = [
    { title: "Revisar landing page do VISTA", notebook: "VISTA", priority: "high", description: "Checar clareza da promessa, CTA e links principais." },
    { title: "Criar post sobre produtividade", notebook: "AnchorLab", priority: "medium", description: "Usar aprendizado de produtividade como gancho para LinkedIn." },
    { title: "Testar fluxo anotação → tarefa", notebook: "VISTA", priority: "high", description: "Criar uma anotação real, transformar em tarefa e validar calendário." },
    { title: "Organizar caderno AnchorLab", notebook: "AnchorLab", priority: "medium", description: "Separar ideias, clientes e validações em anotações acionáveis." },
    { title: "Validar app por 7 dias sem Google Keep", notebook: "Geral", priority: "high", description: "Usar o app no dia a dia e registrar atritos no checklist de evolucao." },
  ];

  const { error: taskError } = await supabase.from("weekly_tasks").insert(taskInputs.map((task) => ({
    title: task.title,
    description: task.description,
    notebook_id: notebooks.get(task.notebook).id || notebooks.get("Geral")!.id,
    priority: task.priority,
    progress_current: 0,
    progress_target: null,
    status: "pending" as TaskStatus,
    task_date: today,
    week_start: weekStart,
    user_id: userId,
  })));
  if (taskError) throw taskError;

  return { notebooks: notebookTitles.length, notes: noteInputs.length, tasks: taskInputs.length };
}
