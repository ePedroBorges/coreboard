import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Notebook, Page } from "@/types/notes";
import { toast } from "sonner";
import { DEFAULT_NOTEBOOK_NAME, DEFAULT_NOTEBOOK_NAMES } from "@/lib/noteUtils";
import { createStarterContent } from "@/lib/userData";
import { executeOrQueue, hasNetworkConnection, isNetworkError, queueOfflineOperation } from "@/lib/offlineData";

const byPosition = (a: Notebook, b: Notebook) => {
  if (a.position !== b.position) return a.position - b.position;
  return a.created_at.localeCompare(b.created_at);
};

const PARENT_MARKER = "__vista_parent__:";

const getFallbackParentId = (description?: string | null) =>
  description?.startsWith(PARENT_MARKER) ? description.slice(PARENT_MARKER.length) || null : null;

const normalizeFolders = (folders: Notebook[]) => folders.map((folder) => ({
  ...folder,
  parent_id: folder.parent_id || getFallbackParentId(folder.description),
}));

export type DeleteNotebookInput = string | { id: string; targetNotebookId?: string };

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

      const normalizedNotebooks = normalizeFolders((notebooks || []) as Notebook[]);
      const wasEmpty = normalizedNotebooks.length === 0;
      const existingTitles = new Set(normalizedNotebooks.map((notebook) => notebook.title.trim().toLowerCase()));
      const defaultsToEnsure = (notebooks || []).length === 0 ? DEFAULT_NOTEBOOK_NAMES : [];
      const missingDefaults = defaultsToEnsure.filter((name) => !existingTitles.has(name.toLowerCase()));

      let allNotebooks = normalizedNotebooks;
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
        allNotebooks = [...allNotebooks, ...normalizeFolders((createdDefaults || []) as Notebook[])];
        if (wasEmpty && createdDefaults?.[0]) {
          await createStarterContent(user!.id, createdDefaults[0].id);
        }
      }

      const { data: counts } = await supabase
        .from("pages")
        .select("notebook_id");

      const countMap: Record<string, number> = {};
      counts?.forEach((page: { notebook_id: string }) => {
        countMap[page.notebook_id] = (countMap[page.notebook_id] || 0) + 1;
      });

      return allNotebooks.map((notebook) => ({
        ...notebook,
        page_count: countMap[notebook.id] || 0,
      })).sort(byPosition);
    },
  });

  const createNotebook = useMutation({
    mutationFn: async (input: string | { title: string; parentId?: string | null }) => {
      const title = typeof input === "string" ? input : input.title;
      const parentId = typeof input === "string" ? null : input.parentId || null;
      const cleanTitle = title.trim();
      if (!cleanTitle) throw new Error("Informe o nome da pasta.");
      const duplicate = query.data?.find((notebook) => notebook.title.trim().toLowerCase() === cleanTitle.toLowerCase());
      if (duplicate) return duplicate;
      const maxPos = query.data?.length || 0;
      const now = new Date().toISOString();
      const insertPayload = {
        id: crypto.randomUUID(),
        title: cleanTitle,
        user_id: user!.id,
        position: maxPos,
        description: null,
        created_at: now,
        updated_at: now,
        ...(parentId ? { parent_id: parentId } : {}),
      };
      const result = await executeOrQueue<Notebook>(user!.id, {
        table: "notebooks",
        action: "upsert",
        recordId: insertPayload.id,
        payload: insertPayload,
      }, async () => {
        let response = await supabase.from("notebooks").insert(insertPayload).select().single();
        if (response.error && parentId && /parent_id|schema cache/i.test(response.error.message)) {
          response = await supabase.from("notebooks").insert({
            ...insertPayload,
            parent_id: undefined,
            description: `${PARENT_MARKER}${parentId}`,
          }).select().single();
        }
        return { data: response.data as Notebook | null, error: response.error };
      });
      return normalizeFolders([(result.data || insertPayload) as Notebook])[0];
    },
    onSuccess: (notebook) => {
      queryClient.setQueriesData<Notebook[]>({ queryKey: ["notebooks", user!.id] }, (current) => {
        if (!current || current.some((item) => item.id === notebook.id)) return current;
        return [...current, { ...notebook, page_count: 0 }].sort(byPosition);
      });
      if (!hasNetworkConnection()) {
        toast.success("Pasta salva no dispositivo. Será sincronizada quando a conexão voltar.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Pasta criada.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateNotebook = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Notebook> & { id: string }) => {
      const cleanTitle = typeof updates.title === "string" ? updates.title.trim() : undefined;
      if (cleanTitle !== undefined) {
        if (!cleanTitle) throw new Error("Informe o nome da pasta.");
        const duplicate = query.data?.find(
          (notebook) => notebook.id !== id && notebook.title.trim().toLowerCase() === cleanTitle.toLowerCase()
        );
        if (duplicate) throw new Error("Já existe uma pasta com esse nome.");
      }
      const payload = {
        ...updates,
        ...(cleanTitle !== undefined ? { title: cleanTitle } : {}),
        updated_at: new Date().toISOString(),
      };
      await executeOrQueue<null>(user!.id, {
        table: "notebooks",
        action: "update",
        recordId: id,
        payload: payload as Record<string, unknown>,
      }, async () => {
        const { error } = await supabase.from("notebooks").update(payload).eq("id", id);
        return { data: null, error };
      });
      return { id, payload };
    },
    onSuccess: ({ id, payload }) => {
      queryClient.setQueriesData<Notebook[]>({ queryKey: ["notebooks", user!.id] }, (current) =>
        current?.map((notebook) => notebook.id === id ? { ...notebook, ...payload } : notebook));
      if (!hasNetworkConnection()) return;
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Pasta renomeada.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteNotebook = useMutation({
    mutationFn: async (input: DeleteNotebookInput) => {
      const id = typeof input === "string" ? input : input.id;
      const targetNotebookId = typeof input === "string" ? undefined : input.targetNotebookId;
      const notebook = query.data?.find((current) => current.id === id);
      if (!notebook) throw new Error("Pasta não encontrada.");
      if (notebook.title.trim().toLowerCase() === DEFAULT_NOTEBOOK_NAME.toLowerCase()) {
        throw new Error("A pasta principal não pode ser excluída.");
      }

      const childFolders = query.data?.filter((current) => current.parent_id === id) || [];
      if (childFolders.length > 0) {
        throw new Error("Mova ou exclua as subpastas antes de excluir esta pasta.");
      }

      if (!hasNetworkConnection()) {
        const cachedPages = queryClient.getQueryData<Page[]>(["all-pages", user?.id]) || [];
        const pagesToMove = cachedPages.filter((page) => page.notebook_id === id);
        if (pagesToMove.length > 0 && !targetNotebookId) {
          throw new Error("Escolha uma pasta de destino para mover as anotações antes de excluir.");
        }
        if (targetNotebookId === id) throw new Error("Escolha uma pasta de destino diferente.");
        if (targetNotebookId) {
          await Promise.all(pagesToMove.map((page) => queueOfflineOperation(user!.id, {
            table: "pages",
            action: "update",
            recordId: page.id,
            payload: { notebook_id: targetNotebookId, updated_at: new Date().toISOString() },
          })));
        }
        await queueOfflineOperation(user!.id, { table: "notebooks", action: "delete", recordId: id });
        return { id, targetNotebookId, movedPageIds: pagesToMove.map((page) => page.id) };
      }

      const { count, error: countError } = await supabase
        .from("pages")
        .select("id", { count: "exact", head: true })
        .eq("notebook_id", id);
      if (countError) throw countError;

      const pageCount = count || 0;
      if (pageCount > 0) {
        if (!targetNotebookId) {
          throw new Error("Escolha uma pasta de destino para mover as anotações antes de excluir.");
        }
        if (targetNotebookId === id) throw new Error("Escolha uma pasta de destino diferente.");
        const targetNotebook = query.data?.find((current) => current.id === targetNotebookId);
        if (!targetNotebook) throw new Error("Pasta de destino não encontrada.");

        const { error: moveError } = await supabase
          .from("pages")
          .update({ notebook_id: targetNotebookId })
          .eq("notebook_id", id);
        if (moveError) throw moveError;
      }

      const { error } = await supabase.from("notebooks").delete().eq("id", id);
      if (error && isNetworkError(error)) {
        await queueOfflineOperation(user!.id, { table: "notebooks", action: "delete", recordId: id });
        return { id, targetNotebookId, movedPageIds: [] as string[] };
      }
      if (error) throw error;
      return { id, targetNotebookId, movedPageIds: [] as string[] };
    },
    onSuccess: ({ id, targetNotebookId, movedPageIds }) => {
      queryClient.setQueriesData<Notebook[]>({ queryKey: ["notebooks", user!.id] }, (current) => current?.filter((notebook) => notebook.id !== id));
      if (targetNotebookId && movedPageIds.length > 0) {
        queryClient.setQueriesData<Page[]>({
          predicate: (cachedQuery) => (
            ["pages", "favorite-pages", "all-pages"].includes(String(cachedQuery.queryKey[0]))
            && cachedQuery.queryKey.includes(user!.id)
          ),
        }, (current) => current?.map((page) => movedPageIds.includes(page.id) ? { ...page, notebook_id: targetNotebookId } : page));
      }
      if (!hasNetworkConnection()) {
        toast.success("Pasta removida no dispositivo.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-pages"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
      toast.success("Pasta excluída.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { ...query, createNotebook, updateNotebook, deleteNotebook };
}
