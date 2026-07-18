import { Check, Lock, Type } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { FONT_CATEGORIES, FONT_PRESETS, FontFamily } from "@/lib/appearance";
import { cn } from "@/lib/utils";

export function FontLibrary({ value, isPro, onSelect }: {
  value: FontFamily;
  isPro: boolean;
  onSelect: (font: FontFamily, pro: boolean) => void;
}) {
  const active = FONT_PRESETS.find((preset) => preset.id === value);
  return (
    <Accordion type="single" collapsible defaultValue={active?.category || "essential"} className="overflow-hidden rounded-md border border-border/60">
      {FONT_CATEGORIES.map((category) => {
        const presets = FONT_PRESETS.filter((preset) => preset.category === category.id);
        return <AccordionItem key={category.id} value={category.id} className="border-border/60 px-3 last:border-b-0">
          <AccordionTrigger className="gap-3 py-3 text-left hover:no-underline"><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-semibold">{category.label}{category.id === "expressive" && <Badge className="h-5 px-1.5 text-[10px]">PRO</Badge>}</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">{category.description}</span></span></AccordionTrigger>
          <AccordionContent className="pb-3"><div className="grid gap-2 sm:grid-cols-2">{presets.map((preset) => {
            const selected = preset.id === value;
            const locked = preset.pro && !isPro;
            return <button key={preset.id} type="button" onClick={() => onSelect(preset.id, preset.pro)} className={cn("grid min-h-24 grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-md border p-3 text-left", selected ? "border-primary bg-primary/10" : "border-border/60 bg-background/35 hover:border-primary/45")}>
              <span className="flex h-12 w-12 items-center justify-center rounded bg-primary/8 text-xl text-primary" style={{ fontFamily: preset.sampleStyle }}>Aa</span>
              <span className="min-w-0"><span className="flex items-center gap-1.5 text-sm font-semibold">{preset.label}{locked && <Lock className="h-3 w-3" />}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground" style={{ fontFamily: preset.sampleStyle }}>{preset.description}</span></span>
              {selected ? <Check className="h-4 w-4 text-primary" /> : <Type className="h-4 w-4 text-muted-foreground/50" />}
            </button>;
          })}</div></AccordionContent>
        </AccordionItem>;
      })}
    </Accordion>
  );
}
