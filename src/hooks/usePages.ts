import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Page } from "@/types/notes";
import { toast } from "sonner";

export function usePages(notebookId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pages", notebookId],
    enabled: !!user && !!notebookId,
    queryFn: async (): Promise<Page[]> => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("notebook_id", notebookId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((p) => ({ ...p, content: p.content as any }));
    },
  });

  const createPage = useMutation({
    mutationFn: async (title: string = "Untitled Page") => {
      const maxPos = query.data?.length || 0;
      const { data, error } = await supabase
        .from("pages")
        .insert({
          title,
          notebook_id: notebookId!,
          user_id: user!.id,
          position: maxPos,
          content: [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages", notebookId] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-pages"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Page> & { id: string }) => {
      const { error } = await supabase.from("pages").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-pages"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-pages"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
      toast.success("Página excluída!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicatePage = useMutation({
    mutationFn: async (page: Page) => {
      const maxPos = query.data?.length || 0;
      const { data, error } = await supabase
        .from("pages")
        .insert([{
          title: `${page.title} (cópia)`,
          notebook_id: page.notebook_id,
          user_id: user!.id,
          position: maxPos,
          content: page.content as any,
          is_favorite: false,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
      toast.success("Página duplicada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase.from("pages").update({ is_favorite }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-pages"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
    },
  });

  return { ...query, createPage, updatePage, deletePage, duplicatePage, toggleFavorite };
}

export function useFavoritePages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favorite-pages", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Page[]> => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("is_favorite", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((p) => ({ ...p, content: p.content as any }));
    },
  });
}
