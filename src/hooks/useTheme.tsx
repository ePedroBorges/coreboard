import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  COLOR_SCHEMES,
  ColorScheme,
  Mode,
  VISUAL_THEMES,
  VisualTheme,
} from "@/lib/appearance";

const MODE_STORAGE_KEY = "vista_tasks_theme";
const SCHEME_STORAGE_KEY = "vista_tasks_theme_variant";
const VISUAL_THEME_STORAGE_KEY = "vista_tasks_visual_theme";
const REDUCED_MOTION_STORAGE_KEY = "vista_tasks_reduced_motion";
const ENHANCED_EFFECTS_STORAGE_KEY = "vista_tasks_enhanced_effects";
const LEGACY_THEME_STORAGE_KEY = "smartnotes-theme";

interface ThemeContextType {
  theme: Mode;
  setTheme: (mode: Mode) => void;
  toggleTheme: () => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  visualTheme: VisualTheme;
  setVisualTheme: (theme: VisualTheme) => void;
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
  enhancedEffects: boolean;
  setEnhancedEffects: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readBoolean(key: string, fallback: boolean) {
  const value = localStorage.getItem(key);
  return value === null ? fallback : value === "true";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Mode>(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "dark";
  });
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    const stored = localStorage.getItem(SCHEME_STORAGE_KEY);
    return COLOR_SCHEMES.includes(stored as ColorScheme) ? (stored as ColorScheme) : "default";
  });
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(() => {
    const stored = localStorage.getItem(VISUAL_THEME_STORAGE_KEY);
    return VISUAL_THEMES.includes(stored as VisualTheme) ? (stored as VisualTheme) : "studio";
  });
  const [reducedMotion, setReducedMotion] = useState(() =>
    readBoolean(REDUCED_MOTION_STORAGE_KEY, window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false),
  );
  const [enhancedEffects, setEnhancedEffects] = useState(() => readBoolean(ENHANCED_EFFECTS_STORAGE_KEY, true));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    COLOR_SCHEMES.forEach((scheme) => root.classList.remove(`scheme-${scheme}`, `theme-${scheme}`));
    VISUAL_THEMES.forEach((item) => root.classList.remove(`visual-${item}`));
    root.classList.add(`scheme-${colorScheme}`, `visual-${visualTheme}`);
    root.classList.toggle("reduce-motion", reducedMotion);
    root.classList.toggle("enhanced-effects", enhancedEffects);

    localStorage.setItem(MODE_STORAGE_KEY, theme);
    localStorage.setItem(SCHEME_STORAGE_KEY, colorScheme);
    localStorage.setItem(VISUAL_THEME_STORAGE_KEY, visualTheme);
    localStorage.setItem(REDUCED_MOTION_STORAGE_KEY, String(reducedMotion));
    localStorage.setItem(ENHANCED_EFFECTS_STORAGE_KEY, String(enhancedEffects));
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  }, [colorScheme, enhancedEffects, reducedMotion, theme, visualTheme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
      colorScheme,
      setColorScheme,
      visualTheme,
      setVisualTheme,
      reducedMotion,
      setReducedMotion,
      enhancedEffects,
      setEnhancedEffects,
    }),
    [colorScheme, enhancedEffects, reducedMotion, theme, visualTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
