import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";

type Mode = "dark" | "light";
export type ThemeVariant = "default" | "ocean" | "focus" | "midnight" | "sunset" | "forest" | "mono";

const MODE_STORAGE_KEY = "vista_tasks_theme";
const VARIANT_STORAGE_KEY = "vista_tasks_theme_variant";
const LEGACY_THEME_STORAGE_KEY = "smartnotes-theme";

const VARIANTS: ThemeVariant[] = ["default", "ocean", "focus", "midnight", "sunset", "forest", "mono"];

export const PRO_THEME_VARIANTS: ThemeVariant[] = ["midnight", "sunset", "forest", "mono"];

export const THEME_VARIANT_META: Record<
  ThemeVariant,
  { label: string; description: string; swatch: string; pro: boolean }
> = {
  default: { label: "AnchorLab", description: "Ciano, marinho e violeta", swatch: "#00aaff", pro: false },
  ocean: { label: "Oceano", description: "Azul sereno para rotinas longas", swatch: "#2563eb", pro: false },
  focus: { label: "Foco", description: "Verde equilibrado e discreto", swatch: "#22c55e", pro: false },
  midnight: { label: "Studio Violet", description: "Violeta profundo e tecnológico", swatch: "#8b5cf6", pro: true },
  sunset: { label: "Pulse Coral", description: "Coral energético e equilibrado", swatch: "#f97360", pro: true },
  forest: { label: "Signal Mint", description: "Verde nítido e concentrado", swatch: "#10b981", pro: true },
  mono: { label: "Graphite", description: "Contraste neutro e minimalista", swatch: "#a1a1aa", pro: true },
};

interface ThemeContextType {
  theme: Mode;
  toggleTheme: () => void;
  variant: ThemeVariant;
  setVariant: (v: ThemeVariant) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Mode>(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "dark";
  });
  const [variant, setVariantState] = useState<ThemeVariant>(() => {
    const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
    return VARIANTS.includes(stored as ThemeVariant) ? (stored as ThemeVariant) : "default";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    VARIANTS.forEach((v) => root.classList.remove(`theme-${v}`));
    root.classList.add(`theme-${variant}`);
    localStorage.setItem(MODE_STORAGE_KEY, theme);
    localStorage.setItem(VARIANT_STORAGE_KEY, variant);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  }, [theme, variant]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      variant,
      setVariant: setVariantState,
    }),
    [theme, variant],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
