import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RouletteHistoryEntry {
  /** Server-issued spin id; used to claim rewards idempotently. */
  id?: string;
  at: number;
  pickedSlot: number;
  landedSlot: number;
  rewardLabel: string;
  rewardEmoji: string;
  rewardKind?: string;
  rewardAmount?: number;
  pickedLabel: string;
  pickedEmoji: string;
  won: boolean;
  paid: boolean;
  claimedAt?: number | null;
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

/** Persisted ring buffer of the player's last lucky-roulette spins.
 *  Falls back to localStorage offline; signed-in users mirror to Supabase
 *  so history follows them across devices. */
export function useRouletteHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<RouletteHistoryEntry[]>(() => readEntries());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_STORAGE_KEY) setEntries(readEntries());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Pull server history on login + subscribe to realtime changes.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("roulette_spins")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(MAX_ENTRIES);
      if (cancelled || !data) return;
      const mapped: RouletteHistoryEntry[] = data.map((r: any) => ({
        id: r.id,
        at: Date.parse(r.created_at),
        pickedSlot: r.picked_slot,
        landedSlot: r.landed_slot,
        rewardLabel: r.reward_label,
        rewardEmoji: r.reward_emoji,
        rewardKind: r.reward_kind,
        rewardAmount: r.reward_amount,
        pickedLabel: r.picked_label,
        pickedEmoji: r.picked_emoji,
        won: r.won,
        paid: r.paid,
        claimedAt: r.claimed_at ? Date.parse(r.claimed_at) : null,
      }));
      setEntries(mapped);
      writeEntries(mapped);
    };
    fetchHistory();
    const channel = supabase
      .channel(`roulette_spins:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "roulette_spins", filter: `user_id=eq.${user.id}` },
        () => { fetchHistory(); },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);

  const append = useCallback((entry: RouletteHistoryEntry) => {
    setEntries((cur) => {
      const next = [entry, ...cur].slice(0, MAX_ENTRIES);
      writeEntries(next);
      return next;
    });
    if (user) {
      supabase
        .from("roulette_spins")
        .insert({
          user_id: user.id,
          picked_slot: entry.pickedSlot,
          landed_slot: entry.landedSlot,
          reward_label: entry.rewardLabel,
          reward_emoji: entry.rewardEmoji,
          reward_kind: entry.rewardKind ?? "unknown",
          reward_amount: entry.rewardAmount ?? 0,
          picked_label: entry.pickedLabel,
          picked_emoji: entry.pickedEmoji,
          won: entry.won,
          paid: entry.paid,
        })
        .select("id")
        .single()
        .then(({ data }) => {
          if (!data?.id) return;
          setEntries((cur) => {
            // Attach the server id to the most-recent matching entry.
            const idx = cur.findIndex((e) => e.at === entry.at && !e.id);
            if (idx < 0) return cur;
            const next = [...cur];
            next[idx] = { ...next[idx], id: data.id };
            writeEntries(next);
            return next;
          });
        });
    }
  }, [user]);

  const clear = useCallback(() => {
    setEntries([]);
    writeEntries([]);
    if (user) {
      supabase.from("roulette_spins").delete().eq("user_id", user.id).then(() => {});
    }
  }, [user]);

  /** Marks the spin as locally claimed so the receipt button disables. */
  const markClaimed = useCallback((id: string) => {
    setEntries((cur) => {
      const next = cur.map((e) => e.id === id ? { ...e, claimedAt: Date.now() } : e);
      writeEntries(next);
      return next;
    });
  }, []);

  return { entries, append, clear, markClaimed };
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