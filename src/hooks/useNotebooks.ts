import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Notebook } from "@/types/notes";
import { toast } from "sonner";

export function useNotebooks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notebooks", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Notebook[]> => {
      const { data: notebooks, error } = await supabase
        .from("notebooks")
        .select("*")
        .order("position", { ascending: true });

      if (error) throw error;

      // Get page counts
      const { data: counts } = await supabase
        .from("pages")
        .select("notebook_id");

      const countMap: Record<string, number> = {};
      counts?.forEach((p: any) => {
        countMap[p.notebook_id] = (countMap[p.notebook_id] || 0) + 1;
      });

      return (notebooks as any[]).map((n) => ({
        ...n,
        page_count: countMap[n.id] || 0,
      }));
    },
  });

  const createNotebook = useMutation({
    mutationFn: async (title: string) => {
      const maxPos = query.data?.length || 0;
      const { data, error } = await supabase
        .from("notebooks")
        .insert({ title, user_id: user!.id, position: maxPos })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Caderno criado!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateNotebook = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Notebook> & { id: string }) => {
      const { error } = await supabase.from("notebooks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notebooks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteNotebook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notebooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast.success("Caderno excluído!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, createNotebook, updateNotebook, deleteNotebook };
}
