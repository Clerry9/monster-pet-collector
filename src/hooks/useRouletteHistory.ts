import { useCallback, useEffect, useState } from "react";

export interface RouletteHistoryEntry {
  at: number;
  pickedSlot: number;
  landedSlot: number;
  rewardLabel: string;
  rewardEmoji: string;
  pickedLabel: string;
  pickedEmoji: string;
  won: boolean;
  paid: boolean;
}

export const HISTORY_STORAGE_KEY = "luckyRoulette.history.v1";
const MAX_ENTRIES = 10;

function readEntries(): RouletteHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ENTRIES);
  } catch { return []; }
}

function writeEntries(entries: RouletteHistoryEntry[]) {
  try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES))); }
  catch { /* ignore */ }
}

/** Persisted ring buffer of the player's last lucky-roulette spins. */
export function useRouletteHistory() {
  const [entries, setEntries] = useState<RouletteHistoryEntry[]>(() => readEntries());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_STORAGE_KEY) setEntries(readEntries());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const append = useCallback((entry: RouletteHistoryEntry) => {
    setEntries((cur) => {
      const next = [entry, ...cur].slice(0, MAX_ENTRIES);
      writeEntries(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    writeEntries([]);
  }, []);

  return { entries, append, clear };
}

export function formatRelativeTime(ts: number, nowMs: number = Date.now()): string {
  const diff = Math.max(0, nowMs - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}