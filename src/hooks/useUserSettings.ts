import { useCallback, useEffect, useMemo, useState } from "react";
import { nativeStorage } from "@/lib/nativeStorage";
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
  hasSeenOnboarding: boolean;
  validationChecklist: ValidationChecklist;
  soundEnabled: boolean;
  soundStyle: AppSoundStyle;
  profile: UserProfile;
  profileSyncPending: boolean;
}

const defaultSettings: UserSettings = {
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
    const raw = window.localStorage.getItem(settingsKey(userId));
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return { ...defaultSettings, ...parsed, profile: { ...defaultSettings.profile, ...parsed.profile } };
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
      if (!active) return;
      const localRaw = window.localStorage.getItem(settingsKey(userId));
      if (localRaw) {
        void nativeStorage.setItem(settingsKey(userId), localRaw);
        return;
      }
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as Partial<UserSettings>;
        const stored = { ...defaultSettings, ...parsed, profile: { ...defaultSettings.profile, ...parsed.profile } } as UserSettings;
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
        profile: updates.profile ? { ...current.profile, ...updates.profile } : current.profile,
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
    writeLocalSettings(userId, { ...settings, profileSyncPending: false });
    return true;
  } catch {
    return false;
  }
}
