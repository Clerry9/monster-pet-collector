/**
 * User-tunable camera settings for IsometricBoard.
 * Persisted to localStorage; subscribers re-render when values change.
 */
export interface CameraSettings {
  deadZone: number;       // 0..0.5 — distance under which camera snaps (kills idle jitter)
  followSmoothing: number;// 0..6 — lerp rate multiplier; 0 = rigid follow (no smoothing)
  zoom: number;           // 0.5..1.5 — chase distance multiplier (lower = closer)
}

export const CAMERA_DEFAULTS: CameraSettings = {
  deadZone: 0.05,
  followSmoothing: 1.5,
  zoom: 1.0,
};

const KEY = "monster.cameraSettings";
const EVT = "monster.cameraSettingsChange";

export function getCameraSettings(): CameraSettings {
  if (typeof window === "undefined") return { ...CAMERA_DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...CAMERA_DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      deadZone: clamp(parsed.deadZone ?? CAMERA_DEFAULTS.deadZone, 0, 0.5),
      followSmoothing: clamp(parsed.followSmoothing ?? CAMERA_DEFAULTS.followSmoothing, 0, 6),
      zoom: clamp(parsed.zoom ?? CAMERA_DEFAULTS.zoom, 0.5, 1.5),
    };
  } catch {
    return { ...CAMERA_DEFAULTS };
  }
}

export function setCameraSetting<K extends keyof CameraSettings>(key: K, value: CameraSettings[K]) {
  if (typeof window === "undefined") return;
  const next = { ...getCameraSettings(), [key]: value };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function resetCameraSettings() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(CAMERA_DEFAULTS));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function subscribeCameraSettings(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  const storageHandler = (e: StorageEvent) => { if (e.key === KEY) handler(); };
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
