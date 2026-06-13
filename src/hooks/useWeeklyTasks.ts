import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type TaskStatus = "pending" | "completed";

export interface TaskPendingReason {
  id: string;
  task_id: string;
  user_id: string;
  reason: string;
  responsible: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface WeeklyTask {
  id: string;
  user_id: string;
  title: string;
  task_date: string;
  status: TaskStatus;
  week_start: string;
  assignee: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  pending_reasons: TaskPendingReason[];
}

type CreateTaskInput = {
  title: string;
  assignee?: string;
};

type AddPendingReasonInput = {
  taskId: string;
  reason: string;
  responsible?: string;
};

const todayKey = () => format(new Date(), "yyyy-MM-dd");
const currentWeekKey = () => format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

export function useWeeklyTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WeeklyTask[]> => {
      const { data: tasks, error } = await supabase
        .from("weekly_tasks")
        .select("*")
        .order("status", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const taskIds = (tasks || []).map((task) => task.id);
      let reasons: TaskPendingReason[] = [];

      if (taskIds.length > 0) {
        const { data: reasonRows, error: reasonError } = await supabase
          .from("task_pending_reasons" as any)
          .select("*")
          .in("task_id", taskIds)
          .order("created_at", { ascending: false });

        if (reasonError) throw reasonError;
        reasons = (reasonRows || []) as unknown as TaskPendingReason[];
      }

      return ((tasks || []) as any[]).map((task) => ({
        ...task,
        status: task.status === "completed" ? "completed" : "pending",
        assignee: task.assignee || null,
        completed_at: task.completed_at || null,
        pending_reasons: reasons.filter((reason) => reason.task_id === task.id),
      }));
    },
  });

  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

  const createTask = useMutation({
    mutationFn: async ({ title, assignee }: CreateTaskInput) => {
      const { data, error } = await supabase
        .from("weekly_tasks")
        .insert({
          title,
          assignee: assignee?.trim() || null,
          user_id: user!.id,
          task_date: todayKey(),
          week_start: currentWeekKey(),
          status: "pending" as any,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateTasks();
      toast.success("Tarefa criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WeeklyTask> & { id: string }) => {
      const payload = { ...updates } as any;

      if (updates.status === "completed") {
        payload.completed_at = new Date().toISOString();
      }

      if (updates.status === "pending") {
        payload.completed_at = null;
      }

      delete payload.pending_reasons;

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
    mutationFn: async ({ taskId, reason, responsible }: AddPendingReasonInput) => {
      const { error } = await supabase.from("task_pending_reasons" as any).insert({
        task_id: taskId,
        user_id: user!.id,
        reason,
        responsible: responsible?.trim() || null,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTasks();
      toast.success("Pendência registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completePendingReason = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_pending_reasons" as any)
        .update({ completed_at: new Date().toISOString() } as any)
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
    deleteTask,
    addPendingReason,
    completePendingReason,
  };
}

export function useTaskHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["task-history", user?.id],
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
