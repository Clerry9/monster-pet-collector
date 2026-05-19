import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Server-validated daily reward. Wraps the `claim_daily_streak` RPC so that
 * all streak/cooldown enforcement happens on the database (no localStorage
 * gating that the client could bypass).
 */
const DAILY_REWARDS = [25, 50, 100, 175, 275, 400, 750];
const DAY_MS = 24 * 60 * 60 * 1000;

function msUntilNextClaim(claimedAt: string | null): number {
  if (!claimedAt) return 0;
  const then = Date.parse(claimedAt);
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, then + DAY_MS - Date.now());
}

export function useDailyReward(_addCoins: (n: number) => void, opts?: { autoOpen?: boolean }) {
  const autoOpen = opts?.autoOpen ?? true;
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [streak, setStreak] = useState(1);
  const [lastClaimedAt, setLastClaimedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Session-scoped guard so we only auto-open the modal once per page load.
  const autoOpenedOnceRef = useRef(false);

  useEffect(() => {
    // Tick every second so the 24h countdown ticks down live in the UI.
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const nextClaimMs = msUntilNextClaim(lastClaimedAt);
  const alreadyClaimed = nextClaimMs > 0;
  const reward = DAILY_REWARDS[(((alreadyClaimed ? streak : streak) - 1 + 7) % 7)];

  // Load server-side streak state. We deliberately do NOT depend on `now`
  // here — re-fetching every second would also cause the auto-open effect
  // below to re-fire and randomly reopen the modal.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("daily_streaks")
        .select("current_streak,last_claim_date,updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const s = data?.current_streak ?? 0;
      const last = data?.last_claim_date ?? null;
      const claimedAt = data?.updated_at ?? (last ? `${last}T00:00:00.000Z` : null);
      // If last claim wasn't yesterday or today, the next claim resets to 1
      const nextStreak = claimedAt && Date.parse(claimedAt) > Date.now() - 48 * 3600 * 1000 ? s + (msUntilNextClaim(claimedAt) > 0 ? 0 : 1) : 1;
      setStreak(Math.max(1, nextStreak));
      setLastClaimedAt(claimedAt);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Auto-show after load if not yet claimed today — at most ONCE per session.
  useEffect(() => {
    if (!loaded || !autoOpen || alreadyClaimed) return;
    if (autoOpenedOnceRef.current) return;
    autoOpenedOnceRef.current = true;
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
      setLastClaimedAt(new Date().toISOString());
    }
    setShowModal(false);
  }, [user, alreadyClaimed]);

  const dismiss = useCallback(() => setShowModal(false), []);
  const openModal = useCallback(() => setShowModal(true), []);

  return { showModal, streak, reward, alreadyClaimed, nextClaimMs, currentDay: ((streak - 1) % 7) + 1, claim, dismiss, openModal };
}
