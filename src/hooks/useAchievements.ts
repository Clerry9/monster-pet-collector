import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AchievementDef {
  code: string;
  title: string;
  description: string;
  target: number;
  reward_kind: string;
  reward_amount: number;
  sort_order: number;
}

export interface UserAchievement {
  code: string;
  progress: number;
  completed_at: string | null;
  claimed_at: string | null;
}

export interface AchievementWithProgress extends AchievementDef {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

/**
 * Tracks player progress against the achievements catalog.
 * Progress is computed from current game state (rolls, level, cards, streak)
 * and persisted in `user_achievements` so completion can be claimed.
 */
export function useAchievements(stats: {
  totalRolls: number;
  level: number;
  uniqueCards: number;
  bestStreak: number;
  lifetimeCoins: number;
}) {
  const { user } = useAuth();
  const [defs, setDefs] = useState<AchievementDef[]>([]);
  const [progress, setProgress] = useState<Record<string, UserAchievement>>({});
  const [loading, setLoading] = useState(true);

  // Load catalog
  useEffect(() => {
    void (async () => {
      const { data } = await (supabase as any)
        .from("achievements_def")
        .select("*")
        .eq("enabled", true)
        .order("sort_order");
      setDefs((data ?? []) as AchievementDef[]);
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("user_achievements")
      .select("code,progress,completed_at,claimed_at")
      .eq("user_id", user.id);
    const map: Record<string, UserAchievement> = {};
    for (const r of (data ?? []) as UserAchievement[]) map[r.code] = r;
    setProgress(map);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Map achievement code -> current progress value
  const computeProgress = useCallback(
    (code: string): number => {
      switch (code) {
        case "first_roll":
        case "rolls_100":
        case "rolls_1000":
          return stats.totalRolls;
        case "cards_5":
        case "cards_25":
        case "cards_100":
          return stats.uniqueCards;
        case "level_5":
        case "level_25":
        case "level_50":
          return stats.level;
        case "streak_7":
        case "streak_30":
          return stats.bestStreak;
        case "coins_10k":
          return stats.lifetimeCoins;
        default:
          return 0;
      }
    },
    [stats],
  );

  // Sync progress to backend whenever stats change
  useEffect(() => {
    if (!user || loading || defs.length === 0) return;
    const updates: Array<{ code: string; progress: number; completed: boolean }> = [];
    for (const def of defs) {
      const cur = computeProgress(def.code);
      const existing = progress[def.code];
      const completed = cur >= def.target;
      if (!existing || existing.progress !== Math.min(cur, def.target) || (completed && !existing.completed_at)) {
        updates.push({ code: def.code, progress: Math.min(cur, def.target), completed });
      }
    }
    if (updates.length === 0) return;

    void (async () => {
      const rows = updates.map((u) => ({
        user_id: user.id,
        code: u.code,
        progress: u.progress,
        completed_at: u.completed ? new Date().toISOString() : null,
      }));
      const { error } = await (supabase as any)
        .from("user_achievements")
        .upsert(rows, { onConflict: "user_id,code" });
      if (!error) {
        // Toast newly completed
        for (const u of updates) {
          if (u.completed && !progress[u.code]?.completed_at) {
            const def = defs.find((d) => d.code === u.code);
            if (def) {
              toast.success(`Achievement: ${def.title}`, {
                description: `Claim +${def.reward_amount} ${def.reward_kind}`,
              });
            }
          }
        }
        await refresh();
      }
    })();
  }, [stats, defs, user, progress, loading, computeProgress, refresh]);

  const claim = useCallback(
    async (code: string) => {
      if (!user) return;
      const { error } = await (supabase as any).rpc("claim_achievement", { p_code: code });
      if (error) {
        toast.error(error.message ?? "Could not claim");
        return;
      }
      const def = defs.find((d) => d.code === code);
      if (def) {
        toast.success("Reward claimed!", {
          description: `+${def.reward_amount} ${def.reward_kind}`,
        });
      }
      await refresh();
    },
    [user, defs, refresh],
  );

  const list: AchievementWithProgress[] = defs.map((d) => {
    const ua = progress[d.code];
    return {
      ...d,
      progress: ua?.progress ?? 0,
      completed: !!ua?.completed_at,
      claimed: !!ua?.claimed_at,
    };
  });

  const unclaimedCount = list.filter((a) => a.completed && !a.claimed).length;

  return { list, claim, loading, unclaimedCount, refresh };
}