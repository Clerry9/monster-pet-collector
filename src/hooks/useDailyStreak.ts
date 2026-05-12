import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DailyStreakRow {
  current_streak: number;
  best_streak: number;
  last_claim_date: string | null;
}

export interface ClaimResult {
  current_streak: number;
  best_streak: number;
  reward_coins: number;
  reward_rolls: number;
  reward_energy: number;
  already_claimed: boolean;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useDailyStreak() {
  const { user } = useAuth();
  const [row, setRow] = useState<DailyStreakRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [lastClaim, setLastClaim] = useState<ClaimResult | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("daily_streaks")
      .select("current_streak,best_streak,last_claim_date")
      .eq("user_id", user.id)
      .maybeSingle();
    setRow(
      data ?? { current_streak: 0, best_streak: 0, last_claim_date: null },
    );
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Auto-prompt on session start when not yet claimed today
  useEffect(() => {
    if (!row || !user) return;
    if (row.last_claim_date !== todayUtc()) {
      const t = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(t);
    }
  }, [row, user]);

  const claim = useCallback(async () => {
    if (!user) return null;
    setLoading(true);
    try {
      // @ts-expect-error - rpc name not yet in generated types
      const { data, error } = await supabase.rpc("claim_daily_streak");
      if (error) throw error;
      const result = (Array.isArray(data) ? data[0] : data) as ClaimResult;
      setLastClaim(result);
      await refresh();
      return result;
    } finally {
      setLoading(false);
    }
  }, [user, refresh]);

  const canClaimToday = !!row && row.last_claim_date !== todayUtc();

  return { row, loading, open, setOpen, claim, lastClaim, canClaimToday, refresh };
}