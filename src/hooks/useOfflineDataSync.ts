import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { flushOfflineOperations } from "@/lib/offlineData";
import { nativeStorage } from "@/lib/nativeStorage";
import { syncPendingUserProfile } from "@/hooks/useUserSettings";

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
    let syncing = false;
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
      if (navigator.onLine === false || syncing) return;
      syncing = true;
      try {
        const synced = await flushOfflineOperations(userId);
        await syncPendingUserProfile(userId);
        if (!active) return;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["notebooks"] }),
          queryClient.invalidateQueries({ queryKey: ["pages"] }),
          queryClient.invalidateQueries({ queryKey: ["favorite-pages"] }),
          queryClient.invalidateQueries({ queryKey: ["all-pages"] }),
          queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        ]);
        if (synced > 0) {
          toast.success(`${synced} ${synced === 1 ? "alteração sincronizada" : "alterações sincronizadas"}.`);
        }
      } finally {
        syncing = false;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void sync();
    };
    const interval = window.setInterval(() => void sync(), 5 * 60_000);
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", handleVisibility);
    void sync();

    return () => {
      active = false;
      window.clearTimeout(persistTimer);
      unsubscribe();
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(interval);
      persist();
    };
  }, [queryClient, userId]);
}
