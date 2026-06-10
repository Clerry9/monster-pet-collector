import { useCallback, useEffect, useState } from "react";
import type { Reward } from "@/data/rewardPool";

export interface HistoryEntry {
  emoji: string;
  label: string;
  amount: number;
  kind: string;
  /** Epoch ms */
  at: number;
}

const KEY = "island.preview.history.v1";
const MAX = 12;

function read(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(entries: HistoryEntry[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX))); } catch {}
}

/**
 * Local-only rolling history of the player's last island-landing prize wins.
 * Kept in localStorage so it survives reloads but never leaves the device.
 */
export function useIslandPreviewHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setEntries(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const push = useCallback((reward: Reward) => {
    const entry: HistoryEntry = {
      emoji: reward.emoji,
      label: reward.label,
      amount: reward.amount,
      kind: reward.kind,
      at: Date.now(),
    };
    setEntries((prev) => {
      const next = [entry, ...prev].slice(0, MAX);
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    write([]);
  }, []);

  return { entries, push, clear };
}