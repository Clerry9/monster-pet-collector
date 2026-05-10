import { useEffect, useState } from "react";

export const LUCKY_STORAGE_KEY = "luckyRoulette.lastFreeSpinAt.v1";
export const LUCKY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function readLastFreeSpin(): number {
  try {
    const v = localStorage.getItem(LUCKY_STORAGE_KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch { return 0; }
}

export function writeLastFreeSpin(ts: number) {
  try { localStorage.setItem(LUCKY_STORAGE_KEY, String(ts)); } catch { /* ignore */ }
}

/**
 * Tracks the lucky-roulette free-spin cooldown. Ticks every second so any
 * surface (the modal button, the side-rail badge, an a11y label) can show
 * a live countdown without a separate timer.
 */
export function useLuckyRouletteCooldown() {
  const [lastFree, setLastFree] = useState<number>(() => readLastFreeSpin());
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LUCKY_STORAGE_KEY) setLastFree(readLastFreeSpin());
    };
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, []);

  const remainingMs = Math.max(0, lastFree + LUCKY_COOLDOWN_MS - now);
  const freeAvailable = remainingMs <= 0;

  const consumeFreeSpin = () => {
    const ts = Date.now();
    writeLastFreeSpin(ts);
    setLastFree(ts);
  };

  return { freeAvailable, remainingMs, consumeFreeSpin };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}