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
