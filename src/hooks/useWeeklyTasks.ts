import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { startOfWeek, format } from "date-fns";

export type TaskStatus = "added" | "completed" | "pending";

export interface WeeklyTask {
  id: string;
  user_id: string;
  title: string;
  task_date: string;
  status: TaskStatus;
  week_start: string;
  created_at: string;
  updated_at: string;
}

export function useWeeklyTasks(weekStart: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const weekKey = format(weekStart, "yyyy-MM-dd");

  const query = useQuery({
    queryKey: ["weekly-tasks", weekKey, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WeeklyTask[]> => {
      const { data, error } = await supabase
        .from("weekly_tasks")
        .select("*")
        .eq("week_start", weekKey)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any;
    },
  });

  const createTask = useMutation({
    mutationFn: async ({ title, task_date }: { title: string; task_date: string }) => {
      const { data, error } = await supabase
        .from("weekly_tasks")
        .insert({
          title,
          task_date,
          user_id: user!.id,
          week_start: weekKey,
          status: "added" as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-tasks", weekKey] });
      toast.success("Tarefa adicionada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WeeklyTask> & { id: string }) => {
      const { error } = await supabase
        .from("weekly_tasks")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-tasks", weekKey] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weekly_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-tasks", weekKey] });
      toast.success("Tarefa removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, createTask, updateTask, deleteTask };
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
        .order("week_start", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as WeeklyTask[];
    },
  });
}
