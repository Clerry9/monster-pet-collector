/**
 * UI scale prefs — user-tunable font size & monster-card scale.
 * - Font scale multiplies the root <html> font-size so all rem units scale.
 * - Card scale is exposed as the CSS variable `--ui-card-scale` so card
 *   components can opt-in by multiplying widths/font sizes against it.
 */
const LS_KEY = "lov_ui_scale";

export interface UiScale {
  /** 0.85 – 1.4, default 1 */
  fontScale: number;
  /** 0.85 – 1.5, default 1 */
  cardScale: number;
}

const DEFAULTS: UiScale = { fontScale: 1, cardScale: 1 };
const BASE_FONT_PX = 16;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function getUiScale(): UiScale {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<UiScale>;
    return {
      fontScale: clamp(Number(parsed.fontScale) || 1, 0.85, 2.0),
      cardScale: clamp(Number(parsed.cardScale) || 1, 0.85, 1.75),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setUiScale(next: Partial<UiScale>): UiScale {
  const merged = { ...getUiScale(), ...next };
  merged.fontScale = clamp(merged.fontScale, 0.85, 2.0);
  merged.cardScale = clamp(merged.cardScale, 0.85, 1.75);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
  applyUiScale(merged);
  window.dispatchEvent(new CustomEvent("lov:ui-scale", { detail: merged }));
  return merged;
}

export function applyUiScale(p: UiScale = getUiScale()) {
  const el = document.documentElement;
  el.style.fontSize = `${BASE_FONT_PX * p.fontScale}px`;
  el.style.setProperty("--ui-font-scale", String(p.fontScale));
  el.style.setProperty("--ui-card-scale", String(p.cardScale));
}

export function subscribeUiScale(cb: (p: UiScale) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<UiScale>).detail);
  window.addEventListener("lov:ui-scale", handler);
  return () => window.removeEventListener("lov:ui-scale", handler);
}

export function resetUiScale(): UiScale {
  return setUiScale({ ...DEFAULTS });
}