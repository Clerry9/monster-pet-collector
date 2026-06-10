/**
 * User preferences for the island-landing prize reveal — sound on/off
 * and haptic intensity (off | light | medium | strong). Persisted to
 * localStorage with a tiny pub/sub so the Settings dialog and the HUD
 * stay in sync without prop drilling.
 */

/**
 * Back-compat alias — older code referenced the four-step enum.
 * New UI uses a fine-grained 0–100 % slider stored in `hapticPct`.
 */
export type HapticIntensity = "off" | "light" | "medium" | "strong";

export interface RewardFeedbackPrefs {
  sound: boolean;
  /** 0 = off, 100 = max. Maps linearly to vibrate-pattern scale. */
  hapticPct: number;
}

const KEY = "reward.feedback.v2";
const LEGACY_KEY = "reward.feedback.v1";
const DEFAULTS: RewardFeedbackPrefs = { sound: true, hapticPct: 60 };

const ENUM_TO_PCT: Record<HapticIntensity, number> = {
  off: 0, light: 35, medium: 60, strong: 100,
};

let cached: RewardFeedbackPrefs | null = null;
const listeners = new Set<(p: RewardFeedbackPrefs) => void>();

function read(): RewardFeedbackPrefs {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    const sound = typeof parsed.sound === "boolean" ? parsed.sound : DEFAULTS.sound;
    let hapticPct: number;
    if (typeof parsed.hapticPct === "number") {
      hapticPct = parsed.hapticPct;
    } else if (typeof parsed.haptic === "string" && parsed.haptic in ENUM_TO_PCT) {
      hapticPct = ENUM_TO_PCT[parsed.haptic as HapticIntensity];
    } else {
      hapticPct = DEFAULTS.hapticPct;
    }
    return { sound, hapticPct: Math.max(0, Math.min(100, Math.round(hapticPct))) };
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
  const merged = { ...getRewardFeedbackPrefs(), ...patch };
  const next: RewardFeedbackPrefs = {
    sound: merged.sound,
    hapticPct: Math.max(0, Math.min(100, Math.round(merged.hapticPct))),
  };
  cached = next;
  write(next);
  listeners.forEach((l) => { try { l(next); } catch {} });
}

export function subscribeRewardFeedback(fn: (p: RewardFeedbackPrefs) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Map a 0-100 % preference to a vibrate-duration multiplier (0..1.6). */
export function hapticScalePct(pct: number): number {
  const clamped = Math.max(0, Math.min(100, pct));
  return (clamped / 100) * 1.6;
}

/** Vibrate honoring the user's fine-grained intensity preference. Safe everywhere. */
export function vibrateWithPrefs(pattern: number | number[]): void {
  try {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    const prefs = getRewardFeedbackPrefs();
    const scale = hapticScalePct(prefs.hapticPct);
    if (scale <= 0) return;
    const scaled = Array.isArray(pattern)
      ? pattern.map((n) => Math.max(0, Math.round(n * scale)))
      : Math.max(0, Math.round(pattern * scale));
    (navigator as Navigator).vibrate(scaled);
  } catch { /* no-op */ }
}