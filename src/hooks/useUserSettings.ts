import { useCallback, useEffect, useMemo, useState } from "react";
import { nativeStorage } from "@/lib/nativeStorage";

export type ValidationChecklist = Record<string, boolean>;

export interface UserSettings {
  hasSeenOnboarding: boolean;
  validationChecklist: ValidationChecklist;
}

const defaultSettings: UserSettings = {
  hasSeenOnboarding: false,
  validationChecklist: {},
};

const settingsKey = (userId: string) => `vistaUserSettings:${userId}`;
const onboardingMarkerKey = (userId: string) => `vistaShowOnboarding:${userId}`;

export const markOnboardingForNewUser = (userId?: string) => {
  if (!userId || typeof window === "undefined") return;
  window.localStorage.setItem(onboardingMarkerKey(userId), "true");
};

export const shouldShowInitialOnboarding = (userId?: string) => {
  if (!userId || typeof window === "undefined") return false;
  return window.localStorage.getItem(onboardingMarkerKey(userId)) === "true";
};

export const clearInitialOnboardingMarker = (userId?: string) => {
  if (!userId || typeof window === "undefined") return;
  window.localStorage.removeItem(onboardingMarkerKey(userId));
};

const readLocalSettings = (userId?: string): UserSettings => {
  if (!userId || typeof window === "undefined") return defaultSettings;
  try {
    const raw = window.localStorage.getItem(settingsKey(userId));
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

const writeLocalSettings = (userId: string | undefined, settings: UserSettings) => {
  if (!userId || typeof window === "undefined") return;
  const serialized = JSON.stringify(settings);
  window.localStorage.setItem(settingsKey(userId), serialized);
  void nativeStorage.setItem(settingsKey(userId), serialized);
};

export function useUserSettings(userId?: string) {
  const [settings, setSettings] = useState<UserSettings>(() => readLocalSettings(userId));

  useEffect(() => {
    setSettings(readLocalSettings(userId));
    if (!userId) return;
    let active = true;
    nativeStorage.getItem(settingsKey(userId)).then((raw) => {
      if (!active || !raw) return;
      try {
        const stored = { ...defaultSettings, ...JSON.parse(raw) } as UserSettings;
        window.localStorage.setItem(settingsKey(userId), JSON.stringify(stored));
        setSettings(stored);
      } catch {
        // Mantém as configurações locais válidas quando o registro nativo estiver corrompido.
      }
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    if (!userId) return;
    setSettings((current) => {
      const next = {
        ...current,
        ...updates,
        validationChecklist: updates.validationChecklist || current.validationChecklist,
      };
      writeLocalSettings(userId, next);
      return next;
    });
  }, [userId]);

  const setHasSeenOnboarding = useCallback((seen: boolean) => {
    updateSettings({ hasSeenOnboarding: seen });
  }, [updateSettings]);

  const setChecklistItem = useCallback((itemId: string, checked: boolean) => {
    if (!userId) return;
    setSettings((current) => {
      const next = {
        ...current,
        validationChecklist: {
          ...current.validationChecklist,
          [itemId]: checked,
        },
      };
      writeLocalSettings(userId, next);
      return next;
    });
  }, [userId]);

  return useMemo(() => ({
    settings,
    setHasSeenOnboarding,
    setChecklistItem,
    updateSettings,
  }), [settings, setChecklistItem, setHasSeenOnboarding, updateSettings]);
}
