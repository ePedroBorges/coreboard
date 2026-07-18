import { Check, Lock, Play, Volume2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { AppSoundStyle, SOUND_CATEGORIES, SOUND_PRESETS } from "@/lib/soundEffects";
import { cn } from "@/lib/utils";

export function SoundLibrary({ value, isPro, onSelect, onPreview }: {
  value: AppSoundStyle;
  isPro: boolean;
  onSelect: (style: AppSoundStyle, pro: boolean) => void;
  onPreview: (style: AppSoundStyle) => void;
}) {
  const activePreset = SOUND_PRESETS.find((preset) => preset.id === value);
  return (
    <Accordion type="single" collapsible defaultValue={activePreset?.category || "essential"} className="overflow-hidden rounded-md border border-border/60">
      {SOUND_CATEGORIES.map((category) => {
        const presets = SOUND_PRESETS.filter((preset) => preset.category === category.id);
        return <AccordionItem key={category.id} value={category.id} className="border-border/60 px-3 last:border-b-0">
          <AccordionTrigger className="gap-3 py-3 text-left hover:no-underline">
            <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-semibold">{category.label}{category.id === "gaming" && <Badge className="h-5 px-1.5 text-[10px]">PRO</Badge>}</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">{category.description}</span></span>
          </AccordionTrigger>
          <AccordionContent className="pb-3"><div className="grid gap-2 sm:grid-cols-2">{presets.map((preset) => {
            const active = preset.id === value;
            const locked = preset.pro && !isPro;
            return <div key={preset.id} className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border p-3", active ? "border-primary bg-primary/10" : "border-border/60 bg-background/35")}>
              <button type="button" onClick={() => onPreview(preset.id)} className="flex h-9 w-9 items-center justify-center rounded bg-primary/10 text-primary" title={`Ouvir ${preset.label}`}><Play className="h-4 w-4" /></button>
              <button type="button" className="min-w-0 text-left" onClick={() => onSelect(preset.id, preset.pro)}><span className="flex items-center gap-1.5 text-sm font-semibold">{preset.label}{locked && <Lock className="h-3 w-3" />}</span><span className="mt-0.5 block text-xs text-muted-foreground">{preset.description}</span></button>
              {active ? <Check className="h-4 w-4 text-primary" /> : <Volume2 className="h-4 w-4 text-muted-foreground/50" />}
            </div>;
          })}</div></AccordionContent>
        </AccordionItem>;
      })}
    </Accordion>
  );
}
