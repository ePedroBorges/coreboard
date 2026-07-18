export type Mode = "dark" | "light";
export type ColorScheme =
  | "default"
  | "ocean"
  | "focus"
  | "midnight"
  | "sunset"
  | "forest"
  | "mono"
  | "luminous"
  | "rgb";
export type VisualTheme =
  | "studio"
  | "journal"
  | "compact"
  | "anime"
  | "comic"
  | "noir-gold"
  | "ivory-gold"
  | "blockcraft";

export const COLOR_SCHEMES: ColorScheme[] = [
  "default", "ocean", "focus", "midnight", "sunset", "forest", "mono", "luminous", "rgb",
];
export const VISUAL_THEMES: VisualTheme[] = [
  "studio", "journal", "compact", "anime", "comic", "noir-gold", "ivory-gold", "blockcraft",
];
export const PRO_COLOR_SCHEMES: ColorScheme[] = ["midnight", "sunset", "forest", "mono", "luminous", "rgb"];
export const PRO_VISUAL_THEMES: VisualTheme[] = ["anime", "comic", "noir-gold", "ivory-gold", "blockcraft"];

export type AppearanceThemeCategory = "essential" | "productivity" | "atmosphere" | "signature" | "dynamic";

export interface AppearanceThemePreset {
  id: string;
  label: string;
  description: string;
  category: AppearanceThemeCategory;
  mode: Mode;
  colorScheme: ColorScheme;
  visualTheme: VisualTheme;
  pro: boolean;
  animated?: boolean;
  enhancedEffects?: boolean;
  preview: [string, string, string];
}

export const APPEARANCE_THEME_CATEGORIES: Array<{
  id: AppearanceThemeCategory;
  label: string;
  description: string;
}> = [
  { id: "essential", label: "Essenciais", description: "Temas leves e versáteis para qualquer rotina." },
  { id: "productivity", label: "Produtividade", description: "Contraste e densidade pensados para foco prolongado." },
  { id: "atmosphere", label: "Atmosferas Pro", description: "Cores, luz e profundidade para dar personalidade ao app." },
  { id: "signature", label: "Coleções Pro", description: "Identidades completas com tipografia, contornos e superfícies próprias." },
  { id: "dynamic", label: "Temas dinâmicos Pro", description: "Gradientes vivos e movimento contínuo com controle de conforto." },
];

export const APPEARANCE_THEME_PRESETS: AppearanceThemePreset[] = [
  { id: "anchorlab", label: "AnchorLab Studio", description: "Escuro preciso com ciano e violeta.", category: "essential", mode: "dark", colorScheme: "default", visualTheme: "studio", pro: false, preview: ["#07111f", "#0f1d2e", "#00aaff"] },
  { id: "ocean", label: "Oceano", description: "Azuis serenos para leitura e planejamento.", category: "essential", mode: "dark", colorScheme: "ocean", visualTheme: "studio", pro: false, preview: ["#071426", "#102a43", "#38bdf8"] },
  { id: "journal", label: "Papel aberto", description: "Leitura clara, tipografia editorial e mais respiro.", category: "essential", mode: "light", colorScheme: "ocean", visualTheme: "journal", pro: false, preview: ["#f7f7f5", "#ffffff", "#2563eb"] },
  { id: "focus", label: "Foco", description: "Verde equilibrado com hierarquia discreta.", category: "productivity", mode: "dark", colorScheme: "focus", visualTheme: "studio", pro: false, preview: ["#07140e", "#102219", "#22c55e"] },
  { id: "compact", label: "Compacto", description: "Mais informação visível e controles enxutos.", category: "productivity", mode: "dark", colorScheme: "focus", visualTheme: "compact", pro: false, preview: ["#111318", "#1b1e24", "#22c55e"] },
  { id: "midnight", label: "Studio Violet", description: "Violeta profundo com acabamento tecnológico.", category: "atmosphere", mode: "dark", colorScheme: "midnight", visualTheme: "studio", pro: true, enhancedEffects: true, preview: ["#09071a", "#18112d", "#a78bfa"] },
  { id: "sunset", label: "Pulse Coral", description: "Calor visual sem perder legibilidade.", category: "atmosphere", mode: "dark", colorScheme: "sunset", visualTheme: "studio", pro: true, enhancedEffects: true, preview: ["#1b0b0c", "#2a1415", "#fb7185"] },
  { id: "forest", label: "Signal Mint", description: "Profundidade verde para sessoes longas.", category: "atmosphere", mode: "dark", colorScheme: "forest", visualTheme: "studio", pro: true, enhancedEffects: true, preview: ["#06130f", "#10251d", "#2dd4bf"] },
  { id: "graphite", label: "Graphite", description: "Monocromático, concentrado e minimalista.", category: "atmosphere", mode: "dark", colorScheme: "mono", visualTheme: "compact", pro: true, preview: ["#090a0c", "#1a1b1f", "#d4d4d8"] },
  { id: "luminous", label: "Luz polar", description: "Ciano elétrico com profundidade luminosa.", category: "atmosphere", mode: "dark", colorScheme: "luminous", visualTheme: "studio", pro: true, enhancedEffects: true, preview: ["#06131a", "#0d2430", "#67e8f9"] },
  { id: "anime", label: "Anime Neon", description: "Ângulos, contraste e energia de painel futurista.", category: "signature", mode: "dark", colorScheme: "midnight", visualTheme: "anime", pro: true, enhancedEffects: true, preview: ["#090b18", "#151833", "#ff4fd8"] },
  { id: "comic", label: "Desenho", description: "Contornos fortes e sombras de ilustração.", category: "signature", mode: "light", colorScheme: "sunset", visualTheme: "comic", pro: true, preview: ["#fff7e8", "#ffffff", "#ff5c35"] },
  { id: "noir-gold", label: "Ouro Noir", description: "Preto profundo, ouro e acabamento editorial.", category: "signature", mode: "dark", colorScheme: "default", visualTheme: "noir-gold", pro: true, enhancedEffects: true, preview: ["#070707", "#12100b", "#d4af37"] },
  { id: "ivory-gold", label: "Ouro Claro", description: "Branco elegante com detalhes dourados.", category: "signature", mode: "light", colorScheme: "default", visualTheme: "ivory-gold", pro: true, preview: ["#ffffff", "#f7f5ef", "#b58a19"] },
  { id: "blockcraft", label: "Mundo de Blocos", description: "Geometria pixelada e superfícies inspiradas em blocos.", category: "signature", mode: "dark", colorScheme: "focus", visualTheme: "blockcraft", pro: true, preview: ["#18221a", "#293b29", "#71b84b"] },
  { id: "rgb-flow", label: "RGB Flow", description: "Espectro contínuo percorrendo realces e superfícies.", category: "dynamic", mode: "dark", colorScheme: "rgb", visualTheme: "studio", pro: true, animated: true, enhancedEffects: true, preview: ["#07111f", "#22d3ee", "#ec4899"] },
  { id: "aurora", label: "Aurora Pulse", description: "Luz polar em movimento com contornos neon.", category: "dynamic", mode: "dark", colorScheme: "rgb", visualTheme: "anime", pro: true, animated: true, enhancedEffects: true, preview: ["#080b18", "#22d3ee", "#a855f7"] },
];

export function findAppearanceThemePreset(input: {
  mode: Mode;
  colorScheme: ColorScheme;
  visualTheme: VisualTheme;
}) {
  return APPEARANCE_THEME_PRESETS.find((preset) =>
    preset.mode === input.mode
    && preset.colorScheme === input.colorScheme
    && preset.visualTheme === input.visualTheme
  );
}

export const COLOR_SCHEME_META: Record<
  ColorScheme,
  { label: string; description: string; swatches: [string, string]; pro: boolean; animated?: boolean }
> = {
  default: { label: "AnchorLab", description: "Ciano preciso com violeta", swatches: ["#00aaff", "#a855f7"], pro: false },
  ocean: { label: "Oceano", description: "Azul sereno para rotinas longas", swatches: ["#2563eb", "#06b6d4"], pro: false },
  focus: { label: "Foco", description: "Verde equilibrado e discreto", swatches: ["#22c55e", "#14b8a6"], pro: false },
  midnight: { label: "Studio Violet", description: "Violeta profundo e tecnológico", swatches: ["#8b5cf6", "#d946ef"], pro: true },
  sunset: { label: "Pulse Coral", description: "Coral enérgico e equilibrado", swatches: ["#f97360", "#f43f5e"], pro: true },
  forest: { label: "Signal Mint", description: "Verde nítido e concentrado", swatches: ["#10b981", "#2dd4bf"], pro: true },
  mono: { label: "Graphite", description: "Contraste neutro e minimalista", swatches: ["#a1a1aa", "#52525b"], pro: true },
  luminous: { label: "Luminoso", description: "Ciano elétrico com realces de luz", swatches: ["#22d3ee", "#f0f9ff"], pro: true },
  rgb: { label: "RGB Flow", description: "Acentos vivos que mudam suavemente", swatches: ["#22c55e", "#ec4899"], pro: true, animated: true },
};

export const VISUAL_THEME_META: Record<
  VisualTheme,
  { label: string; description: string; pro: boolean; preview: [string, string, string] }
> = {
  studio: { label: "Studio", description: "Visual original, sóbrio e versátil", pro: false, preview: ["#07111f", "#0f1d2e", "#00aaff"] },
  journal: { label: "Caderno", description: "Leitura aberta, títulos editoriais e mais respiro", pro: false, preview: ["#f7f7f5", "#ffffff", "#2563eb"] },
  compact: { label: "Compacto", description: "Mais informação visível com controles enxutos", pro: false, preview: ["#111318", "#1b1e24", "#22c55e"] },
  anime: { label: "Anime Neon", description: "Traços angulares, contraste e energia visual", pro: true, preview: ["#090b18", "#151833", "#ff4fd8"] },
  comic: { label: "Desenho", description: "Contornos marcantes e sombras ilustradas", pro: true, preview: ["#fff7e8", "#ffffff", "#ff5c35"] },
  "noir-gold": { label: "Ouro Noir", description: "Preto profundo, ouro e acabamento editorial", pro: true, preview: ["#070707", "#12100b", "#d4af37"] },
  "ivory-gold": { label: "Ouro Claro", description: "Branco elegante com detalhes dourados", pro: true, preview: ["#ffffff", "#f7f5ef", "#b58a19"] },
  blockcraft: { label: "Mundo de Blocos", description: "Geometria pixelada inspirada em jogos de blocos", pro: true, preview: ["#18221a", "#293b29", "#71b84b"] },
};
