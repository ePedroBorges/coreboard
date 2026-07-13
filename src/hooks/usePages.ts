import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Block, Page } from "@/types/notes";
import { toast } from "sonner";
import { Database, Json } from "@/integrations/supabase/types";

type PageRow = Database["public"]["Tables"]["pages"]["Row"];
type PageUpdate = Database["public"]["Tables"]["pages"]["Update"];

const blocksToJson = (blocks: Block[]): Json => blocks as unknown as Json;

const mapPage = (page: PageRow): Page => ({
  ...page,
  content: Array.isArray(page.content) ? (page.content as unknown as Block[]) : [],
});

const mapPageUpdate = (updates: Partial<Page>): PageUpdate => {
  const { content, ...rest } = updates;
  return {
    ...rest,
    ...(content ? { content: blocksToJson(content) } : {}),
  };
};

export function usePages(notebookId: string) {
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
      return (data || []).map(mapPage);
    },
  });

  const createPage = useMutation({
    mutationFn: async (input: string | { title: string; content: Block[]; notebookId: string } = "Nova anotação") => {
      const title = typeof input === "string" ? input : input.title || "Nova anotação";
      const content = typeof input === "string" ? [] : input.content || [];
      const targetNotebookId = typeof input === "string" ? notebookId! : input.notebookId || notebookId!;
      const maxPos = query.data?.length || 0;
      const { data, error } = await supabase
        .from("pages")
        .insert({
          title,
          notebook_id: targetNotebookId,
          user_id: user!.id,
          position: maxPos,
          content: blocksToJson(content),
        })
        .select()
        .single();
      if (error) throw error;
      return mapPage(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-pages"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Page> & { id: string }) => {
      const { error } = await supabase.from("pages").update(mapPageUpdate(updates)).eq("id", id);
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
      toast.success("Anotação excluída!");
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
          content: blocksToJson(page.content),
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
      toast.success("Anotação duplicada!");
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
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-pages"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
    },
  });

  return { ...query, createPage, updatePage, deletePage, duplicatePage, toggleFavorite };
}

export function useFavoritePages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favorite-pages", user.id],
    enabled: !!user,
    queryFn: async (): Promise<Page[]> => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("is_favorite", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPage);
    },
  });
}

export function useAllPages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-pages", user.id],
    enabled: !!user,
    queryFn: async (): Promise<Page[]> => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPage);
    },
  });
}
