import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const memoryStorage = new Map<string, string>();

export function readBrowserStorage(key: string): string | null {
  try {
    return typeof window !== "undefined" && window.localStorage
      ? window.localStorage.getItem(key)
      : memoryStorage.get(key) ?? null;
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

function mirrorBrowserStorage(key: string, value: string) {
  memoryStorage.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Native storage remains the source of truth when browser storage is unavailable.
  }
}

function removeBrowserStorage(key: string) {
  memoryStorage.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Native storage remains the source of truth when browser storage is unavailable.
  }
}

export const nativeStorage = {
  getItem: async (key: string) => {
    if (typeof window !== "undefined" && window.vistaStorage) {
      try {
        const value = await window.vistaStorage.getItem(key);
        if (value !== null) return value;
      } catch {
        // Fall through to the browser mirror when Electron storage is unavailable.
      }
    }
    if (Capacitor.isNativePlatform()) {
      try {
        const { value } = await Preferences.get({ key });
        if (value !== null) return value;
      } catch {
        // Fall through to the browser mirror when the native plugin is unavailable.
      }
    }
    return readBrowserStorage(key);
  },
  setItem: async (key: string, value: string) => {
    let persisted = false;
    if (typeof window !== "undefined" && window.vistaStorage) {
      try {
        await window.vistaStorage.setItem(key, value);
        persisted = true;
      } catch {
        // Continue to the native/browser fallback.
      }
    }
    if (Capacitor.isNativePlatform()) {
      try {
        await Preferences.set({ key, value });
        persisted = true;
      } catch {
        // Continue to the browser/memory fallback.
      }
    }
    mirrorBrowserStorage(key, value);
    if (!persisted && !memoryStorage.has(key)) memoryStorage.set(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window !== "undefined" && window.vistaStorage) {
      try { await window.vistaStorage.removeItem(key); } catch { /* use the fallback */ }
    }
    if (Capacitor.isNativePlatform()) {
      try { await Preferences.remove({ key }); } catch { /* use the fallback */ }
    }
    removeBrowserStorage(key);
  },
};
