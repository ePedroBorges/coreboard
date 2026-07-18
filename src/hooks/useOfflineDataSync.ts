import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { flushOfflineOperations } from "@/lib/offlineData";
import { nativeStorage } from "@/lib/nativeStorage";

const CACHE_PREFIXES = new Set(["notebooks", "pages", "favorite-pages", "all-pages", "tasks"]);
const cacheKey = (userId: string) => `vistaQueryCache:${userId}`;

type CachedQuery = {
  queryKey: readonly unknown[];
  data: unknown;
};

export function useOfflineDataSync(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let persistTimer: number | undefined;

    nativeStorage.getItem(cacheKey(userId)).then((raw) => {
      if (!active || !raw) return;
      try {
        const cachedQueries = JSON.parse(raw) as CachedQuery[];
        cachedQueries.forEach(({ queryKey, data }) => {
          if (queryClient.getQueryData(queryKey) === undefined) {
            queryClient.setQueryData(queryKey, data);
          }
        });
      } catch {
        void nativeStorage.removeItem(cacheKey(userId));
      }
    });

    const persist = () => {
      const queries: CachedQuery[] = queryClient.getQueryCache().getAll()
        .filter((query) => (
          CACHE_PREFIXES.has(String(query.queryKey[0]))
          && query.queryKey.includes(userId)
          && query.state.data !== undefined
        ))
        .map((query) => ({ queryKey: query.queryKey, data: query.state.data }));
      void nativeStorage.setItem(cacheKey(userId), JSON.stringify(queries));
    };

    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      window.clearTimeout(persistTimer);
      persistTimer = window.setTimeout(persist, 250);
    });

    const sync = async () => {
      const synced = await flushOfflineOperations(userId);
      if (!active || synced === 0) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notebooks"] }),
        queryClient.invalidateQueries({ queryKey: ["pages"] }),
        queryClient.invalidateQueries({ queryKey: ["favorite-pages"] }),
        queryClient.invalidateQueries({ queryKey: ["all-pages"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
      toast.success(`${synced} ${synced === 1 ? "alteração sincronizada" : "alterações sincronizadas"}.`);
    };

    window.addEventListener("online", sync);
    void sync();

    return () => {
      active = false;
      window.clearTimeout(persistTimer);
      unsubscribe();
      window.removeEventListener("online", sync);
      persist();
    };
  }, [queryClient, userId]);
}
