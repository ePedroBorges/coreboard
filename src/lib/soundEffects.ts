export type AppSoundStyle = "soft" | "zen" | "click" | "minimal" | "arcade" | "digital" | "synth" | "victory";
export type SoundCategory = "essential" | "focus" | "gaming";

export interface SoundPreset {
  id: AppSoundStyle;
  label: string;
  description: string;
  category: SoundCategory;
  pro: boolean;
}

export const SOUND_CATEGORIES: Array<{ id: SoundCategory; label: string; description: string }> = [
  { id: "essential", label: "Essenciais", description: "Retornos discretos para ações do dia a dia." },
  { id: "focus", label: "Foco", description: "Sons leves para manter ritmo sem distrair." },
  { id: "gaming", label: "Gaming Pro", description: "Perfis mais marcantes para conquistas e execução." },
];

export const SOUND_PRESETS: SoundPreset[] = [
  { id: "soft", label: "Sutil", description: "Confirmação curta e equilibrada.", category: "essential", pro: false },
  { id: "click", label: "Clique", description: "Retorno seco e rápido.", category: "essential", pro: false },
  { id: "minimal", label: "Minimal", description: "Um toque quase imperceptível.", category: "focus", pro: false },
  { id: "zen", label: "Zen", description: "Tons suaves e espaçados.", category: "focus", pro: false },
  { id: "arcade", label: "Arcade", description: "Sequência retrô para concluir ações.", category: "gaming", pro: true },
  { id: "digital", label: "Digital", description: "Pulso tecnológico limpo.", category: "gaming", pro: true },
  { id: "synth", label: "Synthwave", description: "Acorde eletrônico com mais presença.", category: "gaming", pro: true },
  { id: "victory", label: "Vitória", description: "Recompensa sonora para tarefas concluídas.", category: "gaming", pro: true },
];

export function playAppSound(kind: "complete" | "create" | "preview", enabled: boolean, style: AppSoundStyle) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();
    const notesByStyle: Record<AppSoundStyle, number[]> = {
      soft: kind === "complete" ? [440, 587.33] : [392],
      zen: kind === "complete" ? [329.63, 493.88] : [329.63],
      click: kind === "complete" ? [660, 880] : [740],
      minimal: kind === "complete" ? [392, 440] : [392],
      arcade: kind === "complete" ? [523.25, 659.25, 783.99] : [392, 523.25],
      digital: kind === "complete" ? [440, 659.25, 880] : [440, 659.25],
      synth: kind === "complete" ? [220, 440, 659.25] : [220, 440],
      victory: kind === "complete" ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 783.99],
    };
    const notes = notesByStyle[style];
    const now = context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = style === "arcade" || style === "click" ? "square" : style === "digital" || style === "synth" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      const start = now + index * 0.075;
      gain.gain.setValueAtTime(style === "arcade" || style === "victory" ? 0.035 : style === "zen" || style === "minimal" ? 0.018 : 0.025, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.14);
    });
    window.setTimeout(() => void context.close(), 600);
  } catch {
    // Som é um reforço opcional e nunca deve bloquear a ação principal.
  }
}

export function playStoredUserSound(kind: "complete" | "create", userId?: string) {
  if (!userId || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(`vistaUserSettings:${userId}`);
    if (!raw) return;
    const settings = JSON.parse(raw) as { soundEnabled?: boolean; soundStyle?: AppSoundStyle };
    const validStyles: AppSoundStyle[] = SOUND_PRESETS.map((preset) => preset.id);
    playAppSound(kind, Boolean(settings.soundEnabled), validStyles.includes(settings.soundStyle as AppSoundStyle) ? settings.soundStyle as AppSoundStyle : "soft");
  } catch {
    // Preferências inválidas não interferem nas mutações de dados.
  }
}
