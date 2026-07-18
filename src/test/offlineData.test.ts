import { afterEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock("@/lib/nativeStorage", () => ({
  nativeStorage: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
    },
  },
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { hasNetworkConnection, queueOfflineOperation } from "@/lib/offlineData";

const setOnline = (online: boolean) => {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: online,
  });
};

describe("offline data queue", () => {
  afterEach(() => {
    storage.clear();
    setOnline(true);
  });

  it("detecta o estado offline do dispositivo", () => {
    setOnline(false);
    expect(hasNetworkConnection()).toBe(false);
  });

  it("salva operações separadas por usuário", async () => {
    setOnline(false);
    await queueOfflineOperation("user-a", {
      table: "weekly_tasks",
      action: "update",
      recordId: "task-1",
      payload: { title: "Trabalhar offline" },
    });

    const userQueue = JSON.parse(storage.get("vistaOfflineQueue:user-a") || "[]");
    expect(userQueue).toHaveLength(1);
    expect(userQueue[0]).toMatchObject({
      table: "weekly_tasks",
      action: "update",
      recordId: "task-1",
    });
    expect(storage.get("vistaOfflineQueue:user-b")).toBeUndefined();
  });
});
