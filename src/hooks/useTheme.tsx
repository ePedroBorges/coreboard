import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  COLOR_SCHEMES,
  ColorScheme,
  FONT_FAMILIES,
  FontFamily,
  Mode,
  VISUAL_THEMES,
  VisualTheme,
} from "@/lib/appearance";
import { nativeStorage, readBrowserStorage } from "@/lib/nativeStorage";

const APPEARANCE_STORAGE_KEY = "vista_tasks_appearance_v2";
const MODE_STORAGE_KEY = "vista_tasks_theme";
const SCHEME_STORAGE_KEY = "vista_tasks_theme_variant";
const VISUAL_THEME_STORAGE_KEY = "vista_tasks_visual_theme";
const REDUCED_MOTION_STORAGE_KEY = "vista_tasks_reduced_motion";
const ENHANCED_EFFECTS_STORAGE_KEY = "vista_tasks_enhanced_effects";
const LEGACY_THEME_STORAGE_KEY = "smartnotes-theme";

export interface AppearanceSnapshot {
  version: 2;
  updatedAt: number;
  theme: Mode;
  colorScheme: ColorScheme;
  visualTheme: VisualTheme;
  fontFamily: FontFamily;
  reducedMotion: boolean;
  enhancedEffects: boolean;
}

const defaultAppearance = (): AppearanceSnapshot => ({
  version: 2,
  updatedAt: 0,
  theme: "dark",
  colorScheme: "default",
  visualTheme: "studio",
  fontFamily: "inter",
  reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  enhancedEffects: true,
});

function parseAppearance(raw: string | null): AppearanceSnapshot | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AppearanceSnapshot>;
    if (value.version !== 2 || (value.theme !== "light" && value.theme !== "dark")) return null;
    if (!COLOR_SCHEMES.includes(value.colorScheme as ColorScheme)) return null;
    if (!VISUAL_THEMES.includes(value.visualTheme as VisualTheme)) return null;
    return {
      ...defaultAppearance(),
      ...value,
      fontFamily: FONT_FAMILIES.includes(value.fontFamily as FontFamily) ? value.fontFamily as FontFamily : "inter",
      updatedAt: Number(value.updatedAt) || 0,
    };
  } catch {
    return null;
  }
}

function readLegacyLocal(): AppearanceSnapshot {
  const fallback = defaultAppearance();
  const mode = readBrowserStorage(MODE_STORAGE_KEY) || readBrowserStorage(LEGACY_THEME_STORAGE_KEY);
  const scheme = readBrowserStorage(SCHEME_STORAGE_KEY);
  const visual = readBrowserStorage(VISUAL_THEME_STORAGE_KEY);
  const reduced = readBrowserStorage(REDUCED_MOTION_STORAGE_KEY);
  const enhanced = readBrowserStorage(ENHANCED_EFFECTS_STORAGE_KEY);
  return {
    ...fallback,
    theme: mode === "light" || mode === "dark" ? mode : fallback.theme,
    colorScheme: COLOR_SCHEMES.includes(scheme as ColorScheme) ? scheme as ColorScheme : fallback.colorScheme,
    visualTheme: VISUAL_THEMES.includes(visual as VisualTheme) ? visual as VisualTheme : fallback.visualTheme,
    reducedMotion: reduced === null ? fallback.reducedMotion : reduced === "true",
    enhancedEffects: enhanced === null ? fallback.enhancedEffects : enhanced === "true",
  };
}

function readInitialAppearance() {
  return parseAppearance(readBrowserStorage(APPEARANCE_STORAGE_KEY)) || readLegacyLocal();
}

async function persistAppearance(snapshot: AppearanceSnapshot) {
  const serialized = JSON.stringify(snapshot);
  await Promise.all([
    nativeStorage.setItem(APPEARANCE_STORAGE_KEY, serialized),
    nativeStorage.setItem(MODE_STORAGE_KEY, snapshot.theme),
    nativeStorage.setItem(SCHEME_STORAGE_KEY, snapshot.colorScheme),
    nativeStorage.setItem(VISUAL_THEME_STORAGE_KEY, snapshot.visualTheme),
    nativeStorage.setItem(REDUCED_MOTION_STORAGE_KEY, String(snapshot.reducedMotion)),
    nativeStorage.setItem(ENHANCED_EFFECTS_STORAGE_KEY, String(snapshot.enhancedEffects)),
    nativeStorage.removeItem(LEGACY_THEME_STORAGE_KEY),
  ]);
}

interface ThemeContextType {
  storageHydrated: boolean;
  hasUnsavedAppearance: boolean;
  theme: Mode;
  setTheme: (mode: Mode) => void;
  toggleTheme: () => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  visualTheme: VisualTheme;
  setVisualTheme: (theme: VisualTheme) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
  enhancedEffects: boolean;
  setEnhancedEffects: (enabled: boolean) => void;
  saveAppearance: (overrides?: Partial<AppearanceSnapshot>) => Promise<void>;
  restoreSavedAppearance: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readInitialAppearance, []);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [savedAppearance, setSavedAppearance] = useState(initial);
  const [theme, setTheme] = useState<Mode>(initial.theme);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(initial.colorScheme);
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(initial.visualTheme);
  const [fontFamily, setFontFamily] = useState<FontFamily>(initial.fontFamily);
  const [reducedMotion, setReducedMotion] = useState(initial.reducedMotion);
  const [enhancedEffects, setEnhancedEffects] = useState(initial.enhancedEffects);

  const apply = useCallback((snapshot: AppearanceSnapshot) => {
    setTheme(snapshot.theme);
    setColorScheme(snapshot.colorScheme);
    setVisualTheme(snapshot.visualTheme);
    setFontFamily(snapshot.fontFamily);
    setReducedMotion(snapshot.reducedMotion);
    setEnhancedEffects(snapshot.enhancedEffects);
  }, []);

  useEffect(() => {
    let active = true;
    nativeStorage.getItem(APPEARANCE_STORAGE_KEY).then(async (nativeRaw) => {
      if (!active) return;
      const local = parseAppearance(readBrowserStorage(APPEARANCE_STORAGE_KEY));
      const native = parseAppearance(nativeRaw);
      const resolved = local && native
        ? (local.updatedAt >= native.updatedAt ? local : native)
        : local || native || readLegacyLocal();
      apply(resolved);
      setSavedAppearance(resolved);
      await persistAppearance(resolved);
      if (active) setStorageHydrated(true);
    }).catch(() => setStorageHydrated(true));
    return () => { active = false; };
  }, [apply]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    COLOR_SCHEMES.forEach((scheme) => root.classList.remove(`scheme-${scheme}`, `theme-${scheme}`));
    VISUAL_THEMES.forEach((item) => root.classList.remove(`visual-${item}`));
    FONT_FAMILIES.forEach((font) => root.classList.remove(`font-${font}`));
    root.classList.add(`scheme-${colorScheme}`, `visual-${visualTheme}`, `font-${fontFamily}`);
    root.classList.toggle("reduce-motion", reducedMotion);
    root.classList.toggle("enhanced-effects", enhancedEffects);
  }, [colorScheme, enhancedEffects, fontFamily, reducedMotion, theme, visualTheme]);

  const currentAppearance = useMemo<AppearanceSnapshot>(() => ({
    version: 2,
    updatedAt: savedAppearance.updatedAt,
    theme,
    colorScheme,
    visualTheme,
    fontFamily,
    reducedMotion,
    enhancedEffects,
  }), [colorScheme, enhancedEffects, fontFamily, reducedMotion, savedAppearance.updatedAt, theme, visualTheme]);

  const appearanceSignature = (value: AppearanceSnapshot) => JSON.stringify({
    theme: value.theme,
    colorScheme: value.colorScheme,
    visualTheme: value.visualTheme,
    fontFamily: value.fontFamily,
    reducedMotion: value.reducedMotion,
    enhancedEffects: value.enhancedEffects,
  });
  const hasUnsavedAppearance = appearanceSignature(currentAppearance) !== appearanceSignature(savedAppearance);

  const saveAppearance = useCallback(async (overrides: Partial<AppearanceSnapshot> = {}) => {
    const next: AppearanceSnapshot = { ...currentAppearance, ...overrides, version: 2, updatedAt: Date.now() };
    apply(next);
    await persistAppearance(next);
    setSavedAppearance(next);
  }, [apply, currentAppearance]);

  const restoreSavedAppearance = useCallback(() => apply(savedAppearance), [apply, savedAppearance]);

  const value = useMemo<ThemeContextType>(() => ({
    storageHydrated,
    hasUnsavedAppearance,
    theme,
    setTheme,
    toggleTheme: () => setTheme((current) => current === "dark" ? "light" : "dark"),
    colorScheme,
    setColorScheme,
    visualTheme,
    setVisualTheme,
    fontFamily,
    setFontFamily,
    reducedMotion,
    setReducedMotion,
    enhancedEffects,
    setEnhancedEffects,
    saveAppearance,
    restoreSavedAppearance,
  }), [colorScheme, enhancedEffects, fontFamily, hasUnsavedAppearance, reducedMotion, restoreSavedAppearance, saveAppearance, storageHydrated, theme, visualTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
