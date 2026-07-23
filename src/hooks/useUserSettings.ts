import { useCallback, useEffect, useMemo, useState } from "react";
import { nativeStorage, readBrowserStorage } from "@/lib/nativeStorage";
import { AppSoundStyle } from "@/lib/soundEffects";
import { supabase } from "@/integrations/supabase/client";

export type ValidationChecklist = Record<string, boolean>;

export interface UserProfile {
  fullName: string;
  cpf: string;
  phone: string;
  birthDate: string;
}

export interface UserSettings {
  updatedAt: number;
  hasSeenOnboarding: boolean;
  validationChecklist: ValidationChecklist;
  soundEnabled: boolean;
  soundStyle: AppSoundStyle;
  profile: UserProfile;
  profileSyncPending: boolean;
}

const defaultSettings: UserSettings = {
  updatedAt: 0,
  hasSeenOnboarding: false,
  validationChecklist: {},
  soundEnabled: false,
  soundStyle: "soft",
  profile: { fullName: "", cpf: "", phone: "", birthDate: "" },
  profileSyncPending: false,
};

export const getUserSettingsKey = (userId: string) => `vistaUserSettings:${userId}`;
const settingsKey = getUserSettingsKey;
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
    const raw = readBrowserStorage(settingsKey(userId));
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return { ...defaultSettings, ...parsed, profile: { ...defaultSettings.profile, ...parsed.profile } };
  } catch {
    return defaultSettings;
  }
};

const writeLocalSettings = (userId: string | undefined, settings: UserSettings) => {
  if (!userId || typeof window === "undefined") return Promise.resolve();
  return nativeStorage.setItem(settingsKey(userId), JSON.stringify(settings));
};

export function useUserSettings(userId?: string) {
  const [settings, setSettings] = useState<UserSettings>(() => readLocalSettings(userId));

  useEffect(() => {
    setSettings(readLocalSettings(userId));
    if (!userId) return;
    let active = true;
    nativeStorage.getItem(settingsKey(userId)).then((raw) => {
      if (!active) return;
      const localRaw = readBrowserStorage(settingsKey(userId));
      try {
        const localParsed = localRaw ? JSON.parse(localRaw) as Partial<UserSettings> : null;
        const nativeParsed = raw ? JSON.parse(raw) as Partial<UserSettings> : null;
        const parsed = localParsed && nativeParsed
          ? ((localParsed.updatedAt || 0) >= (nativeParsed.updatedAt || 0) ? localParsed : nativeParsed)
          : localParsed || nativeParsed;
        if (!parsed) return;
        const stored = { ...defaultSettings, ...parsed, profile: { ...defaultSettings.profile, ...parsed.profile } } as UserSettings;
        void nativeStorage.setItem(settingsKey(userId), JSON.stringify(stored));
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
        updatedAt: Date.now(),
        validationChecklist: updates.validationChecklist || current.validationChecklist,
        profile: updates.profile ? { ...current.profile, ...updates.profile } : current.profile,
      };
      void writeLocalSettings(userId, next);
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
        updatedAt: Date.now(),
        validationChecklist: {
          ...current.validationChecklist,
          [itemId]: checked,
        },
      };
      void writeLocalSettings(userId, next);
      return next;
    });
  }, [userId]);

  const forceSaveSettings = useCallback(async (nextSettings: UserSettings) => {
    if (!userId) return;
    const next = { ...nextSettings, updatedAt: Date.now() };
    setSettings(next);
    await writeLocalSettings(userId, next);
  }, [userId]);

  return useMemo(() => ({
    settings,
    setHasSeenOnboarding,
    setChecklistItem,
    updateSettings,
    forceSaveSettings,
  }), [forceSaveSettings, settings, setChecklistItem, setHasSeenOnboarding, updateSettings]);
}

export async function syncPendingUserProfile(userId: string) {
  const raw = await nativeStorage.getItem(settingsKey(userId))
    || (typeof window !== "undefined" ? window.localStorage.getItem(settingsKey(userId)) : null);
  if (!raw) return false;
  try {
    const settings = JSON.parse(raw) as UserSettings;
    if (!settings.profileSyncPending || !settings.profile) return false;
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: settings.profile.fullName,
        cpf: settings.profile.cpf,
        phone: settings.profile.phone,
        birth_date: settings.profile.birthDate,
      },
    });
    if (error) throw error;
    await writeLocalSettings(userId, { ...settings, updatedAt: Date.now(), profileSyncPending: false });
    return true;
  } catch {
    return false;
  }
}
