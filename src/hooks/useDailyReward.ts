import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Server-validated daily reward. Wraps the `claim_daily_streak` RPC so that
 * all streak/cooldown enforcement happens on the database (no localStorage
 * gating that the client could bypass).
 */
const DAILY_REWARDS = [25, 50, 100, 175, 275, 400, 750];

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useDailyReward(_addCoins: (n: number) => void, opts?: { autoOpen?: boolean }) {
  const autoOpen = opts?.autoOpen ?? true;
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [streak, setStreak] = useState(1);
  const [lastClaimDate, setLastClaimDate] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const today = todayUtc();
  const alreadyClaimed = lastClaimDate === today;
  const reward = DAILY_REWARDS[(((alreadyClaimed ? streak : streak) - 1 + 7) % 7)];

  // Load server-side streak state
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("daily_streaks")
        .select("current_streak,last_claim_date")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const s = data?.current_streak ?? 0;
      const last = data?.last_claim_date ?? null;
      // If last claim wasn't yesterday or today, the next claim resets to 1
      const nextStreak =
        last === today ? s : last && new Date(last).getTime() >= Date.now() - 36 * 3600 * 1000 ? s + 1 : 1;
      setStreak(Math.max(1, nextStreak));
      setLastClaimDate(last);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user, today]);

  // Auto-show after load if not yet claimed today
  useEffect(() => {
    if (!loaded || !autoOpen || alreadyClaimed) return;
    const t = setTimeout(() => setShowModal(true), 800);
    return () => clearTimeout(t);
  }, [loaded, autoOpen, alreadyClaimed]);

  const claim = useCallback(async () => {
    if (!user || alreadyClaimed) return;
    const { data, error } = await (supabase as any).rpc("claim_daily_streak");
    if (error) return;
    const result = Array.isArray(data) ? data[0] : data;
    if (result && !result.already_claimed) {
      setStreak(result.current_streak);
      setLastClaimDate(today);
    }
    setShowModal(false);
  }, [user, alreadyClaimed, today]);

  const dismiss = useCallback(() => setShowModal(false), []);
  const openModal = useCallback(() => setShowModal(true), []);

  return { showModal, streak, reward, alreadyClaimed, claim, dismiss, openModal };
}
