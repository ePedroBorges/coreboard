export type AppSoundStyle = "soft" | "zen" | "arcade" | "digital";

export function playAppSound(kind: "complete" | "create" | "preview", enabled: boolean, style: AppSoundStyle) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();
    const notesByStyle: Record<AppSoundStyle, number[]> = {
      soft: kind === "complete" ? [440, 587.33] : [392],
      zen: kind === "complete" ? [329.63, 493.88] : [329.63],
      arcade: kind === "complete" ? [523.25, 659.25, 783.99] : [392, 523.25],
      digital: kind === "complete" ? [440, 659.25, 880] : [440, 659.25],
    };
    const notes = notesByStyle[style];
    const now = context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = style === "arcade" ? "square" : style === "digital" ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      const start = now + index * 0.075;
      gain.gain.setValueAtTime(style === "arcade" ? 0.035 : style === "zen" ? 0.018 : 0.025, start);
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
    const validStyles: AppSoundStyle[] = ["soft", "zen", "arcade", "digital"];
    playAppSound(kind, Boolean(settings.soundEnabled), validStyles.includes(settings.soundStyle as AppSoundStyle) ? settings.soundStyle as AppSoundStyle : "soft");
  } catch {
    // Preferências inválidas não interferem nas mutações de dados.
  }
}
