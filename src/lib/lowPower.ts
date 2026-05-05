/**
 * Tiny, dependency-free pubsub for the user's "force low-power" preference.
 *
 * - Persists to localStorage under `monster.forceLowPower`.
 * - `MODE_AUTO` lets Monster3D auto-detect (small device / low FPS).
 * - `MODE_FORCE_2D` always renders the 2D fallback.
 * - `MODE_FORCE_3D` forces 3D regardless of device hints.
 *
 * Components subscribe with `subscribeLowPower` to react to changes.
 */
export type LowPowerMode = "auto" | "force-2d" | "force-3d";

const KEY = "monster.forceLowPower";
const EVT = "monster.lowPowerChange";

export function getLowPowerMode(): LowPowerMode {
  if (typeof window === "undefined") return "auto";
  const v = window.localStorage.getItem(KEY);
  if (!v) {
    window.localStorage.setItem(KEY, "force-3d");
    return "force-3d";
  }
  return v === "force-2d" || v === "force-3d" ? v : "auto";
}

export function setLowPowerMode(mode: LowPowerMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, mode);
  window.dispatchEvent(new CustomEvent(EVT));
}

export function subscribeLowPower(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  // Cross-tab sync.
  window.addEventListener("storage", (e) => { if (e.key === KEY) handler(); });
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler as EventListener);
  };
}