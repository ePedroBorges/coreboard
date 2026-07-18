import { CheckCircle2, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  APPEARANCE_THEME_CATEGORIES,
  APPEARANCE_THEME_PRESETS,
  AppearanceThemePreset,
  ColorScheme,
  Mode,
  VisualTheme,
  findAppearanceThemePreset,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

interface ThemeLibraryProps {
  mode: Mode;
  colorScheme: ColorScheme;
  visualTheme: VisualTheme;
  isPro: boolean;
  onSelect: (preset: AppearanceThemePreset) => void;
}

export function ThemeLibrary({ mode, colorScheme, visualTheme, isPro, onSelect }: ThemeLibraryProps) {
  const activePreset = findAppearanceThemePreset({ mode, colorScheme, visualTheme });
  const defaultCategory = activePreset?.category || "essential";

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-primary/25 bg-primary/5 p-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="min-w-0 flex-1"><p className="text-xs font-medium text-muted-foreground">Prévia em tempo real</p><p className="truncate text-sm font-semibold text-foreground">{activePreset?.label || "Personalizado"}</p></div>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        </div>
        <ThemeStage preset={activePreset || APPEARANCE_THEME_PRESETS[0]} />
      </div>

      <Accordion type="single" collapsible defaultValue={defaultCategory} className="overflow-hidden rounded-md border border-border/60">
        {APPEARANCE_THEME_CATEGORIES.map((category) => {
          const presets = APPEARANCE_THEME_PRESETS.filter((preset) => preset.category === category.id);
          const activeInCategory = presets.some((preset) => preset.id === activePreset?.id);

          return (
            <AccordionItem key={category.id} value={category.id} className="border-border/60 px-3 last:border-b-0">
              <AccordionTrigger className="gap-3 py-3 text-left hover:no-underline">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {category.label}
                    {category.id !== "essential" && category.id !== "productivity" && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">PRO</Badge>
                    )}
                    {activeInCategory && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
                  <span className="mt-0.5 block text-xs font-normal leading-5 text-muted-foreground">{category.description}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {presets.map((preset) => {
                    const active = preset.id === activePreset?.id;
                    const locked = preset.pro && !isPro;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onSelect(preset)}
                        className={cn(
                          "group grid min-h-24 grid-cols-[5.25rem_minmax(0,1fr)] gap-3 rounded-md border p-3 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/55",
                          active ? "border-primary bg-primary/7 shadow-sm ring-1 ring-primary/35" : "border-border/60 bg-background/35",
                        )}
                        aria-pressed={active}
                      >
                        <ThemePreview preset={preset} />
                        <span className="min-w-0 self-center">
                          <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
                            {preset.label}
                            {preset.animated && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                            {preset.pro && <Badge variant={locked ? "outline" : "secondary"} className="h-4 px-1 text-[10px]">PRO</Badge>}
                            {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{preset.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function ThemeStage({ preset }: { preset: AppearanceThemePreset }) {
  return <div
    className={cn("appearance-theme-stage", preset.animated && "is-animated")}
    style={{ "--preview-background": preset.preview[0], "--preview-surface": preset.preview[1], "--preview-accent": preset.preview[2] } as React.CSSProperties}
    aria-label={`Prévia do tema ${preset.label}`}
  >
    <div className="appearance-theme-stage__sidebar"><span /><span /><span /><span /></div>
    <div className="appearance-theme-stage__content">
      <div className="appearance-theme-stage__header"><strong>VISTA</strong><i /></div>
      <div className="appearance-theme-stage__stats"><span /><span /><span /></div>
      <div className="appearance-theme-stage__task"><div><strong>Tarefa em foco</strong><small>Hoje · Prioridade média</small></div><button>Concluir</button></div>
    </div>
  </div>;
}

function ThemePreview({ preset, active = false }: { preset: AppearanceThemePreset; active?: boolean }) {
  return (
    <span
      className={cn("appearance-theme-preview", preset.animated && "is-animated", active && "is-active")}
      style={{
        "--preview-background": preset.preview[0],
        "--preview-surface": preset.preview[1],
        "--preview-accent": preset.preview[2],
      } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className="appearance-theme-preview__rail" />
      <span className="appearance-theme-preview__canvas">
        <span className="appearance-theme-preview__bar" />
        <span className="appearance-theme-preview__line" />
        <span className="appearance-theme-preview__panel" />
      </span>
    </span>
  );
}
