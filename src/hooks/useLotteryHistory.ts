import { useCallback, useEffect, useState } from "react";

export interface LotteryHistoryEntry {
  at: number;
  monsterId: string;
  tileType: string;
  tileLabel: string;
  emoji: string;
  value: number;
  /** Lucky-energy bonus that the wheel rolled this spin (if any). */
  luckyEnergy?: number;
}

const KEY = "lov_lottery_history_v1";
const MAX = 20;

function read(): LotteryHistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch { return []; }
}

function write(entries: LotteryHistoryEntry[]) {
  try { sessionStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX))); }
  catch { /* ignore */ }
}

/**
 * In-session ring buffer of lottery landings + lucky-energy bonuses.
 * Resets when the tab closes. Use for the on-board "Last spins" list.
 */
export function useLotteryHistory() {
  const [entries, setEntries] = useState<LotteryHistoryEntry[]>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setEntries(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const append = useCallback((entry: LotteryHistoryEntry) => {
    setEntries((cur) => {
      const next = [entry, ...cur].slice(0, MAX);
      write(next);
      return next;
    });
  }, []);

  const attachLuckyEnergy = useCallback((monsterId: string, amount: number) => {
    setEntries((cur) => {
      if (cur.length === 0) return cur;
      // Attach to the most recent landing for this monster.
      const idx = cur.findIndex((e) => e.monsterId === monsterId);
      if (idx < 0) return cur;
      const next = [...cur];
      next[idx] = { ...next[idx], luckyEnergy: amount };
      write(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    write([]);
  }, []);

  return { entries, append, attachLuckyEnergy, clear };
}