/**
 * User preferences for the island-landing prize reveal — sound on/off
 * and haptic intensity (off | light | medium | strong). Persisted to
 * localStorage with a tiny pub/sub so the Settings dialog and the HUD
 * stay in sync without prop drilling.
 */

export type HapticIntensity = "off" | "light" | "medium" | "strong";

export interface RewardFeedbackPrefs {
  sound: boolean;
  haptic: HapticIntensity;
}

const KEY = "reward.feedback.v1";
const DEFAULTS: RewardFeedbackPrefs = { sound: true, haptic: "medium" };

let cached: RewardFeedbackPrefs | null = null;
const listeners = new Set<(p: RewardFeedbackPrefs) => void>();

function read(): RewardFeedbackPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      sound: typeof parsed.sound === "boolean" ? parsed.sound : DEFAULTS.sound,
      haptic: ["off", "light", "medium", "strong"].includes(parsed.haptic)
        ? parsed.haptic
        : DEFAULTS.haptic,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(p: RewardFeedbackPrefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}

export function getRewardFeedbackPrefs(): RewardFeedbackPrefs {
  if (!cached) cached = read();
  return cached;
}

export function setRewardFeedbackPrefs(patch: Partial<RewardFeedbackPrefs>) {
  const next = { ...getRewardFeedbackPrefs(), ...patch };
  cached = next;
  write(next);
  listeners.forEach((l) => { try { l(next); } catch {} });
}

export function subscribeRewardFeedback(fn: (p: RewardFeedbackPrefs) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Haptic multiplier — 0 disables vibrate calls entirely. */
export function hapticScale(level: HapticIntensity): number {
  switch (level) {
    case "off":    return 0;
    case "light":  return 0.5;
    case "medium": return 1;
    case "strong": return 1.6;
  }
}

/** Vibrate honoring the user's haptic intensity preference. Safe everywhere. */
export function vibrateWithPrefs(pattern: number | number[]): void {
  try {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    const prefs = getRewardFeedbackPrefs();
    const scale = hapticScale(prefs.haptic);
    if (scale <= 0) return;
    const scaled = Array.isArray(pattern)
      ? pattern.map((n) => Math.max(0, Math.round(n * scale)))
      : Math.max(0, Math.round(pattern * scale));
    (navigator as Navigator).vibrate(scaled);
  } catch { /* no-op */ }
}