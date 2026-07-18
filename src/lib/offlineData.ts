import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { nativeStorage } from "@/lib/nativeStorage";

export type OfflineTable = "notebooks" | "pages" | "weekly_tasks" | "task_pending_reasons";
export type OfflineAction = "upsert" | "update" | "delete";

export interface OfflineOperation {
  id: string;
  table: OfflineTable;
  action: OfflineAction;
  recordId: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

type SupabaseResult<T> = Promise<{
  data: T | null;
  error: { message: string; code?: string } | null;
}>;

const queueKey = (userId: string) => `vistaOfflineQueue:${userId}`;

const readQueue = async (userId: string): Promise<OfflineOperation[]> => {
  try {
    const raw = await nativeStorage.getItem(queueKey(userId));
    return raw ? JSON.parse(raw) as OfflineOperation[] : [];
  } catch {
    return [];
  }
};

const writeQueue = (userId: string, operations: OfflineOperation[]) =>
  nativeStorage.setItem(queueKey(userId), JSON.stringify(operations));

export const hasNetworkConnection = () =>
  typeof navigator === "undefined" || navigator.onLine !== false;

export const isNetworkError = (error: unknown) => {
  if (!hasNetworkConnection()) return true;
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return /failed to fetch|network|offline|load failed|timeout|timed out|503|504/i.test(message);
};

export async function queueOfflineOperation(
  userId: string,
  operation: Omit<OfflineOperation, "id" | "createdAt">,
) {
  const current = await readQueue(userId);
  current.push({
    ...operation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  await writeQueue(userId, current);
}

export async function executeOrQueue<T>(
  userId: string,
  operation: Omit<OfflineOperation, "id" | "createdAt">,
  execute: () => SupabaseResult<T>,
) {
  if (!hasNetworkConnection()) {
    await queueOfflineOperation(userId, operation);
    return { data: null, queued: true };
  }

  const result = await execute();
  if (!result.error) return { data: result.data, queued: false };
  if (!isNetworkError(result.error)) throw new Error(result.error.message);

  await queueOfflineOperation(userId, operation);
  return { data: null, queued: true };
}

async function applyOperation(operation: OfflineOperation) {
  const payload = operation.payload || {};
  switch (operation.table) {
    case "notebooks": {
      if (operation.action === "delete") return supabase.from("notebooks").delete().eq("id", operation.recordId);
      if (operation.action === "update") return supabase.from("notebooks").update(payload as Database["public"]["Tables"]["notebooks"]["Update"]).eq("id", operation.recordId);
      return supabase.from("notebooks").upsert(payload as Database["public"]["Tables"]["notebooks"]["Insert"]);
    }
    case "pages": {
      if (operation.action === "delete") return supabase.from("pages").delete().eq("id", operation.recordId);
      if (operation.action === "update") return supabase.from("pages").update(payload as Database["public"]["Tables"]["pages"]["Update"]).eq("id", operation.recordId);
      return supabase.from("pages").upsert(payload as Database["public"]["Tables"]["pages"]["Insert"]);
    }
    case "weekly_tasks": {
      if (operation.action === "delete") return supabase.from("weekly_tasks").delete().eq("id", operation.recordId);
      if (operation.action === "update") return supabase.from("weekly_tasks").update(payload as Database["public"]["Tables"]["weekly_tasks"]["Update"]).eq("id", operation.recordId);
      return supabase.from("weekly_tasks").upsert(payload as Database["public"]["Tables"]["weekly_tasks"]["Insert"]);
    }
    case "task_pending_reasons": {
      if (operation.action === "delete") return supabase.from("task_pending_reasons").delete().eq("id", operation.recordId);
      if (operation.action === "update") return supabase.from("task_pending_reasons").update(payload as Database["public"]["Tables"]["task_pending_reasons"]["Update"]).eq("id", operation.recordId);
      return supabase.from("task_pending_reasons").upsert(payload as Database["public"]["Tables"]["task_pending_reasons"]["Insert"]);
    }
  }
}

export async function flushOfflineOperations(userId: string) {
  if (!hasNetworkConnection()) return 0;
  const operations = await readQueue(userId);
  if (operations.length === 0) return 0;

  let completed = 0;
  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];
    const result = await applyOperation(operation);
    if (result.error) {
      await writeQueue(userId, operations.slice(index));
      if (isNetworkError(result.error)) return completed;
      console.error("Falha ao sincronizar alteração offline", operation, result.error);
      return completed;
    }
    completed += 1;
  }

  await writeQueue(userId, []);
  return completed;
}
