import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_NOTE_TAGS } from "@/lib/noteUtils";
import { useState } from "react";

interface TagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  compact: boolean;
}

export function TagSelector({ value, onChange, compact }: TagSelectorProps) {
  const [customTag, setCustomTag] = useState("");
  const selected = new Set(value);

  const toggleTag = (tag: string) => {
    if (selected.has(tag)) {
      onChange(value.filter((item) => item !== tag));
      return;
    }
    onChange([...value, tag]);
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (!tag) return;
    if (!selected.has(tag)) onChange([...value, tag]);
    setCustomTag("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {DEFAULT_NOTE_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              selected.has(tag)
                "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-background/45 text-muted-foreground hover:text-foreground"
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 rounded-full">
              {tag}
              <button type="button" onClick={() => toggleTag(tag)} aria-label={`Remover tag ${tag}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {!compact && (
        <div className="flex gap-2">
          <Input
            value={customTag}
            onChange={(event) => setCustomTag(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addCustomTag()}
            placeholder="Tag personalizada"
            className="h-9"
          />
          <Button type="button" variant="outline" size="sm" className="h-9 gap-1" onClick={addCustomTag}>
            <Plus className="h-3.5 w-3.5" />
            Tag
          </Button>
        </div>
      )}
    </div>
  );
}
