import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Notebook } from "@/types/notes";
import { toast } from "sonner";
import { DEFAULT_NOTEBOOK_NAMES } from "@/lib/noteUtils";

const byPosition = (a: Notebook, b: Notebook) => {
  if (a.position !== b.position) return a.position - b.position;
  return a.created_at.localeCompare(b.created_at);
};

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

      const existingTitles = new Set((notebooks || []).map((notebook) => notebook.title.trim().toLowerCase()));
      const missingDefaults = DEFAULT_NOTEBOOK_NAMES.filter((name) => !existingTitles.has(name.toLowerCase()));

      let allNotebooks = notebooks || [];
      if (missingDefaults.length > 0) {
        const maxPosition = allNotebooks.reduce((max, notebook) => Math.max(max, notebook.position), -1);
        const { data: createdDefaults, error: createError } = await supabase
          .from("notebooks")
          .insert(
            missingDefaults.map((title, index) => ({
              title,
              user_id: user!.id,
              position: maxPosition + index + 1,
            }))
          )
          .select("*");

        if (createError) throw createError;
        allNotebooks = [...allNotebooks, ...(createdDefaults || [])];
      }

      // Get page counts
      const { data: counts } = await supabase
        .from("pages")
        .select("notebook_id");

      const countMap: Record<string, number> = {};
      counts?.forEach((p: { notebook_id: string }) => {
        countMap[p.notebook_id] = (countMap[p.notebook_id] || 0) + 1;
      });

      return allNotebooks.map((n) => ({
        ...n,
        page_count: countMap[n.id] || 0,
      })).sort(byPosition);
    },
  });

  const createNotebook = useMutation({
    mutationFn: async (title: string) => {
      const cleanTitle = title.trim();
      if (!cleanTitle) throw new Error("Informe o nome do caderno.");
      const duplicate = query.data?.find((notebook) => notebook.title.trim().toLowerCase() === cleanTitle.toLowerCase());
      if (duplicate) return duplicate;
      const maxPos = query.data?.length || 0;
      const { data, error } = await supabase
        .from("notebooks")
        .insert({ title: cleanTitle, user_id: user!.id, position: maxPos })
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
      const notebook = query.data?.find((current) => current.id === id);
      if ((notebook?.page_count || 0) > 0) {
        throw new Error("Este caderno tem anotações. Mova as anotações antes de excluir.");
      }
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
