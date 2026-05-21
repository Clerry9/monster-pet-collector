/**
 * Accessibility preferences — reduced motion + high contrast.
 * Persisted to localStorage and applied to <html> data-attributes so the
 * matching CSS rules in index.css take effect.
 */
const LS_KEY = "lov_a11y_prefs";

export interface A11yPrefs {
  reducedMotion: boolean;
  highContrast: boolean;
  notifications: boolean;
}

const DEFAULTS: A11yPrefs = { reducedMotion: false, highContrast: false, notifications: false };

export function getA11yPrefs(): A11yPrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setA11yPrefs(next: Partial<A11yPrefs>): A11yPrefs {
  const merged = { ...getA11yPrefs(), ...next };
  try { localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
  applyA11yPrefs(merged);
  window.dispatchEvent(new CustomEvent("lov:a11y-prefs", { detail: merged }));
  return merged;
}

export function applyA11yPrefs(p: A11yPrefs = getA11yPrefs()) {
  const el = document.documentElement;
  if (p.reducedMotion) el.setAttribute("data-reduced-motion", "true");
  else el.removeAttribute("data-reduced-motion");
  if (p.highContrast) el.setAttribute("data-contrast", "high");
  else el.removeAttribute("data-contrast");
}

export function subscribeA11yPrefs(cb: (p: A11yPrefs) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<A11yPrefs>).detail);
  window.addEventListener("lov:a11y-prefs", handler);
  return () => window.removeEventListener("lov:a11y-prefs", handler);
}
