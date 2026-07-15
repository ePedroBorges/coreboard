import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Notebook } from "@/types/notes";
import { toast } from "sonner";
import { DEFAULT_NOTEBOOK_NAME, DEFAULT_NOTEBOOK_NAMES } from "@/lib/noteUtils";
import { createStarterContent } from "@/lib/userData";

const byPosition = (a: Notebook, b: Notebook) => {
  if (a.position !== b.position) return a.position - b.position;
  return a.created_at.localeCompare(b.created_at);
};

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

      const wasEmpty = (notebooks || []).length === 0;
      const existingTitles = new Set((notebooks || []).map((notebook) => notebook.title.trim().toLowerCase()));
      const defaultsToEnsure = (notebooks || []).length === 0 ? DEFAULT_NOTEBOOK_NAMES : [];
      const missingDefaults = defaultsToEnsure.filter((name) => !existingTitles.has(name.toLowerCase()));

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
      if (!cleanTitle) throw new Error("Informe o nome do caderno.");
      const duplicate = query.data?.find((notebook) => notebook.title.trim().toLowerCase() === cleanTitle.toLowerCase());
      if (duplicate) return duplicate;
      const maxPos = query.data?.length || 0;
      const insertPayload = {
        title: cleanTitle,
        user_id: user!.id,
        position: maxPos,
        ...(parentId ? { parent_id: parentId } : {}),
      };
      const { data, error } = await supabase
        .from("notebooks")
        .insert(insertPayload)
        .select()
        .single();
      if (error) {
        if (parentId && /parent_id|schema cache/i.test(error.message)) {
          throw new Error("Subpastas estarão disponíveis após a atualização do banco.");
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Caderno criado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateNotebook = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Notebook> & { id: string }) => {
      const cleanTitle = typeof updates.title === "string" ? updates.title.trim() : undefined;
      if (cleanTitle !== undefined) {
        if (!cleanTitle) throw new Error("Informe o nome do caderno.");
        const duplicate = query.data?.find(
          (notebook) => notebook.id !== id && notebook.title.trim().toLowerCase() === cleanTitle.toLowerCase()
        );
        if (duplicate) throw new Error("Já existe um caderno com esse nome.");
      }
      const { error } = await supabase.from("notebooks").update({
        ...updates,
        ...(cleanTitle !== undefined ? { title: cleanTitle } : {}),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      toast.success("Caderno renomeado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteNotebook = useMutation({
    mutationFn: async (input: DeleteNotebookInput) => {
      const id = typeof input === "string" ? input : input.id;
      const targetNotebookId = typeof input === "string" ? undefined : input.targetNotebookId;
      const notebook = query.data?.find((current) => current.id === id);
      if (!notebook) throw new Error("Caderno não encontrado.");
      if (notebook.title.trim().toLowerCase() === DEFAULT_NOTEBOOK_NAME.toLowerCase()) {
        throw new Error("O caderno Geral não pode ser excluído.");
      }

      const { count, error: countError } = await supabase
        .from("pages")
        .select("id", { count: "exact", head: true })
        .eq("notebook_id", id);
      if (countError) throw countError;

      const pageCount = count || 0;
      if (pageCount > 0) {
        if (!targetNotebookId) {
          throw new Error("Escolha um caderno de destino para mover as anotações antes de excluir.");
        }
        if (targetNotebookId === id) throw new Error("Escolha um caderno de destino diferente.");
        const targetNotebook = query.data?.find((current) => current.id === targetNotebookId);
        if (!targetNotebook) throw new Error("Caderno de destino não encontrado.");

        const { error: moveError } = await supabase
          .from("pages")
          .update({ notebook_id: targetNotebookId })
          .eq("notebook_id", id);
        if (moveError) throw moveError;
      }

      const { error } = await supabase.from("notebooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["favorite-pages"] });
      queryClient.invalidateQueries({ queryKey: ["all-pages"] });
      toast.success("Caderno excluido.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { ...query, createNotebook, updateNotebook, deleteNotebook };
}
