import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Database } from "@/integrations/supabase/types";

export type TaskStatus = "pending" | "completed";
export type Priority = "low" | "medium" | "high";
type WeeklyTaskRow = Database["public"]["Tables"]["weekly_tasks"]["Row"];
type WeeklyTaskInsert = Database["public"]["Tables"]["weekly_tasks"]["Insert"];
type WeeklyTaskUpdate = Database["public"]["Tables"]["weekly_tasks"]["Update"];
type PendingReasonInsert = Database["public"]["Tables"]["task_pending_reasons"]["Insert"];
type PendingReasonUpdate = Database["public"]["Tables"]["task_pending_reasons"]["Update"];
type DbTaskStatus = Database["public"]["Enums"]["task_status"];

export interface TaskPendingReason {
  id: string;
  task_id: string;
  user_id: string;
  reason: string;
  description: string | null;
  responsible: string | null;
  priority: Priority;
  progress_current: number;
  progress_target: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface WeeklyTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  task_date: string;
  status: TaskStatus;
  week_start: string;
  assignee: string | null;
  priority: Priority;
  progress_current: number;
  progress_target: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  pending_reasons: TaskPendingReason[];
  notebook_id: string | null;
  source_note_id: string;
  source_note_title: string;
  source_notebook_title: string;
}

type CreateTaskInput = {
  title: string;
  description: string;
  assignee: string;
  priority: Priority;
  progress_target: number | null;
  task_date: string;
  notebook_id: string | null;
  source_note_id: string;
  source_note_title: string;
  source_notebook_title: string;
};

type AddPendingReasonInput = {
  taskId: string;
  reason: string;
  description: string;
  responsible: string;
  priority: Priority;
  progress_target: number | null;
};

const todayKey = () => format(new Date(), "yyyy-MM-dd");
const currentWeekKey = () => format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
const taskOriginStorageKey = (userId: string) => `vistaTaskOrigins:${userId}`;

type StoredTaskOrigin = Pick<WeeklyTask, "notebook_id" | "source_note_id" | "source_note_title" | "source_notebook_title">;

const isMissingNotebookColumnError = (error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return message.includes("notebook_id") && message.includes("schema cache");
};

const isMissingOptionalTaskColumnError = (error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return (message.includes("notebook_id") || message.includes("description")) && message.includes("schema cache");
};

const loadTaskOrigins = (userId: string): Record<string, StoredTaskOrigin> => {
  if (!userId || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(taskOriginStorageKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveTaskOrigin = (userId: string | undefined, taskId: string, origin: StoredTaskOrigin) => {
  if (!userId || typeof window === "undefined") return;
  const current = loadTaskOrigins(userId);
  window.localStorage.setItem(taskOriginStorageKey(userId), JSON.stringify({
    ...current,
    [taskId]: origin,
  }));
};

const updateTaskOriginsBySourceNote = (
  userId: string | undefined,
  taskIds: string[],
  notebookId: string,
  notebookTitle: string
) => {
  if (!userId || typeof window === "undefined" || taskIds.length === 0) return;
  const current = loadTaskOrigins(userId);
  const next = { ...current };
  taskIds.forEach((taskId) => {
    next[taskId] = {
      ...next[taskId],
      notebook_id: notebookId,
      source_notebook_title: notebookTitle,
    };
  });
  window.localStorage.setItem(taskOriginStorageKey(userId), JSON.stringify(next));
};

export function useWeeklyTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tasks", user.id],
    enabled: !!user,
    queryFn: async (): Promise<WeeklyTask[]> => {
      const { data: tasks, error } = await supabase
        .from("weekly_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const taskIds = (tasks || []).map((task) => task.id);
      let reasons: TaskPendingReason[] = [];

      if (taskIds.length > 0) {
        const { data: reasonRows, error: reasonError } = await supabase
          .from("task_pending_reasons")
          .select("*")
          .in("task_id", taskIds)
          .order("created_at", { ascending: false });

        if (reasonError) throw reasonError;
        reasons = (reasonRows || []) as unknown as TaskPendingReason[];
      }

      const origins = loadTaskOrigins(user.id);

      return ((tasks || []) as WeeklyTaskRow[]).map((task) => ({
        ...task,
        status: task.status === "completed" ? "completed" : "pending",
        assignee: task.assignee || null,
        priority: (task.priority || "medium") as Priority,
        progress_current: task.progress_current ?? 0,
        progress_target: task.progress_target ?? null,
        completed_at: task.completed_at || null,
        pending_reasons: reasons.filter((reason) => reason.task_id === task.id),
        ...origins[task.id],
      }));
    },
  });

  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

  const createTask = useMutation({
    mutationFn: async ({ title, description, assignee, priority, progress_target, task_date, notebook_id }: CreateTaskInput) => {
      const day = task_date || todayKey();
      const basePayload = {
        title,
        description: description.trim() || null,
        assignee: assignee.trim() || null,
        priority: priority || "medium",
        progress_target: progress_target ?? null,
        progress_current: 0,
        user_id: user!.id,
        task_date: day,
        week_start: format(startOfWeek(parseISO(day), { weekStartsOn: 1 }), "yyyy-MM-dd"),
        status: "pending" as DbTaskStatus,
      } satisfies Omit<WeeklyTaskInsert, "notebook_id">;

      const payload = notebook_id
        ? ({ ...basePayload, notebook_id } satisfies WeeklyTaskInsert)
        : (basePayload as WeeklyTaskInsert);
      const { description: _description, ...fallbackBasePayload } = basePayload;
      void _description;

      let result = await supabase
        .from("weekly_tasks")
        .insert(payload)
        .select()
        .single();

      if (result.error && (notebook_id || description) && isMissingOptionalTaskColumnError(result.error)) {
        result = await supabase
          .from("weekly_tasks")
          .insert(fallbackBasePayload as WeeklyTaskInsert)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (createdTask, variables) => {
      if (variables.notebook_id || variables.source_note_id || variables.source_note_title || variables.source_notebook_title) {
        saveTaskOrigin(user.id, createdTask.id, {
          notebook_id: variables.notebook_id || null,
          source_note_id: variables.source_note_id,
          source_note_title: variables.source_note_title,
          source_notebook_title: variables.source_notebook_title,
        });
      }
      invalidateTasks();
      toast.success(variables.source_note_id ? "Tarefa criada a partir da anotação." : "Tarefa criada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WeeklyTask> & { id: string }) => {
      const {
        pending_reasons,
        source_note_id,
        source_note_title,
        source_notebook_title,
        notebook_id,
        ...taskUpdates
      } = updates;
      void pending_reasons;
      void source_note_id;
      void source_note_title;
      void source_notebook_title;
      const payload: WeeklyTaskUpdate = {
        ...taskUpdates,
        ...(notebook_id !== undefined ? { notebook_id } : {}),
      };

      if (updates.status === "completed") {
        payload.completed_at = new Date().toISOString();
      }

      if (updates.status === "pending") {
        payload.completed_at = null;
      }

      

      let result = await supabase.from("weekly_tasks").update(payload).eq("id", id);
      if (result.error && isMissingOptionalTaskColumnError(result.error)) {
        const { notebook_id: _notebookId, description: _description, ...fallbackPayload } = payload;
        void _notebookId;
        void _description;
        result = await supabase.from("weekly_tasks").update(fallbackPayload).eq("id", id);
      }
      if (notebook_id !== undefined) {
        const previous = loadTaskOrigins(user.id)[id] || {};
        saveTaskOrigin(user.id, id, {
          ...previous,
          notebook_id,
          source_notebook_title,
        });
      }
      if (result.error) throw result.error;
    },
    onSuccess: invalidateTasks,
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTasksFromSourceNote = useMutation({
    mutationFn: async ({
      source_note_id,
      notebook_id,
      source_notebook_title,
    }: {
      source_note_id: string;
      notebook_id: string;
      source_notebook_title: string;
    }) => {
      const matchingTasks = (query.data || []).filter((task) => task.source_note_id === source_note_id);
      if (matchingTasks.length === 0) return 0;

      updateTaskOriginsBySourceNote(
        user.id,
        matchingTasks.map((task) => task.id),
        notebook_id,
        source_notebook_title
      );

      const { error } = await supabase
        .from("weekly_tasks")
        .update({ notebook_id } satisfies WeeklyTaskUpdate)
        .in("id", matchingTasks.map((task) => task.id));
      if (error && !isMissingNotebookColumnError(error)) throw error;

      return matchingTasks.length;
    },
    onSuccess: invalidateTasks,
    onError: (e: Error) => toast.error(e.message),
  });

  /** Increments progress; auto-completes when reaching target */
  const incrementTaskProgress = useMutation({
    mutationFn: async ({
      id,
      delta,
      current,
      target,
    }: {
      id: string;
      delta: number;
      current: number;
      target: number | null;
    }) => {
      const next = Math.max(0, current + delta);
      const payload: WeeklyTaskUpdate = { progress_current: next };
      if (target && next >= target) {
        payload.status = "completed";
        payload.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("weekly_tasks").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateTasks,
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weekly_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTasks();
      toast.success("Tarefa removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addPendingReason = useMutation({
    mutationFn: async ({ taskId, reason, description, responsible, priority, progress_target }: AddPendingReasonInput) => {
      const payload: PendingReasonInsert = {
        task_id: taskId,
        user_id: user!.id,
        reason,
        description: description.trim() || null,
        responsible: responsible.trim() || null,
        priority: priority || "medium",
        progress_target: progress_target ?? null,
        progress_current: 0,
      };
      let result = await supabase.from("task_pending_reasons").insert(payload);
      if (result.error && description && isMissingOptionalTaskColumnError(result.error)) {
        const { description: _description, ...fallbackPayload } = payload;
        void _description;
        result = await supabase.from("task_pending_reasons").insert(fallbackPayload);
      }

      if (result.error) throw result.error;
    },
    onSuccess: () => {
      invalidateTasks();
      toast.success("Pendência registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePendingReason = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TaskPendingReason> & { id: string }) => {
      const payload: PendingReasonUpdate = { ...updates };
      let result = await supabase
        .from("task_pending_reasons")
        .update(payload)
        .eq("id", id);
      if (result.error && isMissingOptionalTaskColumnError(result.error)) {
        const { description: _description, ...fallbackPayload } = payload;
        void _description;
        result = await supabase
          .from("task_pending_reasons")
          .update(fallbackPayload)
          .eq("id", id);
      }
      if (result.error) throw result.error;
    },
    onSuccess: invalidateTasks,
    onError: (e: Error) => toast.error(e.message),
  });

  const incrementReasonProgress = useMutation({
    mutationFn: async ({
      id,
      delta,
      current,
      target,
    }: {
      id: string;
      delta: number;
      current: number;
      target: number | null;
    }) => {
      const next = Math.max(0, current + delta);
      const payload: PendingReasonUpdate = { progress_current: next };
      if (target && next >= target) {
        payload.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("task_pending_reasons").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateTasks,
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePendingReason = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_pending_reasons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateTasks,
    onError: (e: Error) => toast.error(e.message),
  });

  const completePendingReason = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_pending_reasons")
        .update({ completed_at: new Date().toISOString() } satisfies PendingReasonUpdate)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: invalidateTasks,
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    ...query,
    createTask,
    updateTask,
    updateTasksFromSourceNote,
    incrementTaskProgress,
    deleteTask,
    addPendingReason,
    updatePendingReason,
    incrementReasonProgress,
    deletePendingReason,
    completePendingReason,
  };
}

export function useTaskHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["task-history", user.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as unknown as WeeklyTask[];
    },
  });
}
