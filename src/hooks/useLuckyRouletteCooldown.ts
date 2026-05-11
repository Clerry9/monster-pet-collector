import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
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

  // Server sync: pull latest cooldown from Supabase on auth and subscribe to
  // realtime changes so cross-device spins respect the same cooldown.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("roulette_state")
      .select("last_free_spin_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.last_free_spin_at) return;
        const ts = Date.parse(data.last_free_spin_at);
        if (!Number.isFinite(ts)) return;
        setLastFree((prev) => Math.max(prev, ts));
        writeLastFreeSpin(Math.max(readLastFreeSpin(), ts));
      });
    const channel = supabase
      .channel(`roulette_state:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "roulette_state", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { last_free_spin_at?: string | null } | null;
          const ts = row?.last_free_spin_at ? Date.parse(row.last_free_spin_at) : 0;
          if (Number.isFinite(ts) && ts > 0) {
            setLastFree((prev) => Math.max(prev, ts));
            writeLastFreeSpin(Math.max(readLastFreeSpin(), ts));
          }
        },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user]);

  const remainingMs = Math.max(0, lastFree + LUCKY_COOLDOWN_MS - now);
  const freeAvailable = remainingMs <= 0;

  const consumeFreeSpin = () => {
    const ts = Date.now();
    writeLastFreeSpin(ts);
    setLastFree(ts);
    if (user) {
      supabase
        .from("roulette_state")
        .upsert(
          { user_id: user.id, last_free_spin_at: new Date(ts).toISOString() },
          { onConflict: "user_id" },
        )
        .then(() => { /* fire and forget */ });
    }
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