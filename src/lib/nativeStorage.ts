import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const memoryStorage = new Map<string, string>();

export const nativeStorage = {
  getItem: async (key: string) => {
    if (typeof window !== "undefined" && window.vistaStorage) return window.vistaStorage.getItem(key);
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStorage.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    if (typeof window !== "undefined" && window.vistaStorage) return window.vistaStorage.setItem(key, value);
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
      return;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    memoryStorage.set(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window !== "undefined" && window.vistaStorage) return window.vistaStorage.removeItem(key);
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key });
      return;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    memoryStorage.delete(key);
  },
};
