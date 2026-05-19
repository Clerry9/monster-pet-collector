import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DailyStreakRow {
  current_streak: number;
  best_streak: number;
  last_claim_date: string | null;
  updated_at: string | null;
}

export interface ClaimResult {
  current_streak: number;
  best_streak: number;
  reward_coins: number;
  reward_rolls: number;
  reward_energy: number;
  already_claimed: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function msUntilNextClaim(claimedAt: string | null): number {
  if (!claimedAt) return 0;
  const then = Date.parse(claimedAt);
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, then + DAY_MS - Date.now());
}

export function useDailyStreak() {
  const { user } = useAuth();
  const [row, setRow] = useState<DailyStreakRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [lastClaim, setLastClaim] = useState<ClaimResult | null>(null);
  // Session-scoped guard so the modal auto-opens AT MOST once per page load.
  // Without this, every `refresh()` produced a new `row` reference and
  // re-triggered the auto-open effect, causing the modal to pop back up.
  const autoOpenedOnceRef = useRef(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("daily_streaks")
      .select("current_streak,best_streak,last_claim_date,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setRow(
      data ?? { current_streak: 0, best_streak: 0, last_claim_date: null, updated_at: null },
    );
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-prompt on session start when not yet claimed today — but only ONCE
  // per session. The user can still manually re-open via openModal/setOpen.
  useEffect(() => {
    if (!row || !user) return;
    if (autoOpenedOnceRef.current) return;
    if (msUntilNextClaim(row.updated_at) !== 0) return;
    autoOpenedOnceRef.current = true;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [row, user]);

  const claim = useCallback(async () => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("claim_daily_streak");
      if (error) throw error;
      const result = (Array.isArray(data) ? data[0] : data) as ClaimResult;
      setLastClaim(result);
      await refresh();
      return result;
    } finally {
      setLoading(false);
    }
  }, [user, refresh]);

  // Recomputed every tick so the countdown ticks down live and the
  // highlighted "current day" advances only when the 24h timer expires.
  const nextClaimMs = row ? msUntilNextClaim(row.updated_at) : 0;
  // Touch nowTick so React re-renders this hook every second.
  void nowTick;
  const canClaimToday = !!row && nextClaimMs === 0;
  const currentDay = row ? (((row.current_streak + (canClaimToday ? 1 : 0)) - 1) % 7) + 1 : 1;

  return { row, loading, open, setOpen, claim, lastClaim, canClaimToday, nextClaimMs, currentDay, refresh };
}