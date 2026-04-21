import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentSeason, Season } from "@/data/seasons";

export interface SeasonProgress {
  seasonInstanceId: string;
  symbols: number;
  passPurchased: boolean;
  claimedTiers: number[];
  cardsUnlocked: string[];
}

const DEFAULT: SeasonProgress = {
  seasonInstanceId: "",
  symbols: 0,
  passPurchased: false,
  claimedTiers: [],
  cardsUnlocked: [],
};

export function useSeason() {
  const { user } = useAuth();
  const [info, setInfo] = useState(getCurrentSeason());
  const [progress, setProgress] = useState<SeasonProgress>({ ...DEFAULT, seasonInstanceId: info.seasonInstanceId });
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Refresh time every minute (for countdown + auto rotation)
  useEffect(() => {
    const t = setInterval(() => {
      const next = getCurrentSeason();
      setNow(Date.now());
      setInfo((cur) => (cur.seasonInstanceId !== next.seasonInstanceId ? next : cur));
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  // Load progress for the current season
  useEffect(() => {
    if (!user) {
      setProgress({ ...DEFAULT, seasonInstanceId: info.seasonInstanceId });
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("season_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("season_id", info.seasonInstanceId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setProgress({
          seasonInstanceId: info.seasonInstanceId,
          symbols: data.symbols,
          passPurchased: data.pass_purchased,
          claimedTiers: data.claimed_tiers ?? [],
          cardsUnlocked: data.cards_unlocked ?? [],
        });
      } else {
        // Lazy create row
        await supabase.from("season_progress").insert({
          user_id: user.id,
          season_id: info.seasonInstanceId,
        });
        setProgress({ ...DEFAULT, seasonInstanceId: info.seasonInstanceId });
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user, info.seasonInstanceId]);

  // Realtime sync for pass purchase via webhook
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`season-${user.id}`, { config: { private: true } })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "season_progress", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as any;
          if (row.season_id !== info.seasonInstanceId) return;
          setProgress({
            seasonInstanceId: row.season_id,
            symbols: row.symbols,
            passPurchased: row.pass_purchased,
            claimedTiers: row.claimed_tiers ?? [],
            cardsUnlocked: row.cards_unlocked ?? [],
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, info.seasonInstanceId]);

  const persist = useCallback(
    async (next: SeasonProgress) => {
      setProgress(next);
      if (!user) return;
      await supabase
        .from("season_progress")
        .update({
          symbols: next.symbols,
          pass_purchased: next.passPurchased,
          claimed_tiers: next.claimedTiers,
          cards_unlocked: next.cardsUnlocked,
        })
        .eq("user_id", user.id)
        .eq("season_id", next.seasonInstanceId);
    },
    [user]
  );

  const addSymbols = useCallback(
    (amount: number) => {
      const multiplier = progress.passPurchased ? 2 : 1;
      const next = { ...progress, symbols: progress.symbols + amount * multiplier };
      void persist(next);
      return amount * multiplier;
    },
    [progress, persist]
  );

  const claimTier = useCallback(
    (tier: number) => {
      if (progress.claimedTiers.includes(tier)) return false;
      const next = { ...progress, claimedTiers: [...progress.claimedTiers, tier] };
      void persist(next);
      return true;
    },
    [progress, persist]
  );

  const markCardUnlocked = useCallback(
    (cardId: string) => {
      if (progress.cardsUnlocked.includes(cardId)) return;
      const next = { ...progress, cardsUnlocked: [...progress.cardsUnlocked, cardId] };
      void persist(next);
    },
    [progress, persist]
  );

  return {
    season: info.season,
    seasonInstanceId: info.seasonInstanceId,
    startsAt: info.startsAt,
    endsAt: info.endsAt,
    msRemaining: Math.max(0, info.endsAt - now),
    progress,
    loaded,
    addSymbols,
    claimTier,
    markCardUnlocked,
  };
}

export type SeasonHook = ReturnType<typeof useSeason>;
export type { Season };
