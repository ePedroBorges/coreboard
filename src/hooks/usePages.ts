import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Block, Page } from "@/types/notes";
import { toast } from "sonner";
import { Database, Json } from "@/integrations/supabase/types";
import { executeOrQueue, hasNetworkConnection } from "@/lib/offlineData";

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

const updateCachedPages = (
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  updater: (pages: Page[]) => Page[],
) => {
  queryClient.setQueriesData<Page[]>({
    predicate: (query) => (
      ["pages", "favorite-pages", "all-pages"].includes(String(query.queryKey[0]))
      && query.queryKey.includes(userId)
    ),
  }, (current) => current ? updater(current) : current);
};

export function usePages(notebookId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pages", user?.id, notebookId],
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
    mutationFn: async (input: string | { title?: string; content?: Block[]; notebookId?: string } = "Nova anotação") => {
      const title = typeof input === "string" ? input : input.title || "Nova anotação";
      const content = typeof input === "string" ? [] : input.content || [];
      const targetNotebookId = typeof input === "string" ? notebookId! : input.notebookId || notebookId!;
      const maxPos = query.data?.length || 0;
      const now = new Date().toISOString();
      const payload = {
        id: crypto.randomUUID(),
        title,
        notebook_id: targetNotebookId,
        user_id: user!.id,
        position: maxPos,
        content: blocksToJson(content),
        is_favorite: false,
        created_at: now,
        updated_at: now,
      };
      const result = await executeOrQueue<PageRow>(user!.id, {
        table: "pages",
        action: "upsert",
        recordId: payload.id,
        payload,
      }, async () => supabase.from("pages").insert(payload).select().single());
      return mapPage(result.data || payload as PageRow);
    },
    onSuccess: (page) => {
      updateCachedPages(queryClient, user!.id, (pages) => pages.some((current) => current.id === page.id) ? pages : [page, ...pages]);
      if (!hasNetworkConnection()) {
        toast.success("Anotação salva no dispositivo. Será sincronizada quando a conexão voltar.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-pages"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Page> & { id: string }) => {
      const payload = { ...mapPageUpdate(updates), updated_at: new Date().toISOString() };
      await executeOrQueue<null>(user!.id, {
        table: "pages",
        action: "update",
        recordId: id,
        payload: payload as Record<string, unknown>,
      }, async () => {
        const { error } = await supabase.from("pages").update(payload).eq("id", id);
        return { data: null, error };
      });
      return { id, updates };
    },
    onSuccess: ({ id, updates }) => {
      updateCachedPages(queryClient, user!.id, (pages) => pages.map((page) => page.id === id ? { ...page, ...updates, updated_at: new Date().toISOString() } : page));
      if (!hasNetworkConnection()) return;
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-pages"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      await executeOrQueue<null>(user!.id, {
        table: "pages",
        action: "delete",
        recordId: id,
      }, async () => {
        const { error } = await supabase.from("pages").delete().eq("id", id);
        return { data: null, error };
      });
      return id;
    },
    onSuccess: (id) => {
      updateCachedPages(queryClient, user!.id, (pages) => pages.filter((page) => page.id !== id));
      if (!hasNetworkConnection()) {
        toast.success("Anotação removida no dispositivo.");
        return;
      }
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
      const now = new Date().toISOString();
      const payload = {
        id: crypto.randomUUID(),
        title: `${page.title} (cópia)`,
        notebook_id: page.notebook_id,
        user_id: user!.id,
        position: maxPos,
        content: blocksToJson(page.content),
        is_favorite: false,
        created_at: now,
        updated_at: now,
      };
      const result = await executeOrQueue<PageRow>(user!.id, {
        table: "pages",
        action: "upsert",
        recordId: payload.id,
        payload,
      }, async () => supabase.from("pages").insert(payload).select().single());
      return mapPage(result.data || payload as PageRow);
    },
    onSuccess: (page) => {
      updateCachedPages(queryClient, user!.id, (pages) => pages.some((current) => current.id === page.id) ? pages : [page, ...pages]);
      if (!hasNetworkConnection()) {
        toast.success("Cópia salva no dispositivo.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
      toast.success("Anotação duplicada!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      await executeOrQueue<null>(user!.id, {
        table: "pages",
        action: "update",
        recordId: id,
        payload: { is_favorite, updated_at: new Date().toISOString() },
      }, async () => {
        const { error } = await supabase.from("pages").update({ is_favorite }).eq("id", id);
        return { data: null, error };
      });
      return { id, is_favorite };
    },
    onSuccess: ({ id, is_favorite }) => {
      updateCachedPages(queryClient, user!.id, (pages) => pages.map((page) => page.id === id ? { ...page, is_favorite } : page));
      if (!hasNetworkConnection()) return;
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
    queryKey: ["favorite-pages", user?.id],
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
    queryKey: ["all-pages", user?.id],
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
