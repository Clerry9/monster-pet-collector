import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SHARED_POOL, type RewardTemplate } from "@/data/rewardPool";

interface OverrideRow {
  static_label: string;
  weight: number;
  min_amount: number | null;
  max_amount: number | null;
  emoji: string | null;
  enabled: boolean;
}

/** Returns the shared reward pool with admin overrides applied. */
export function useRewardPool() {
  const [overrides, setOverrides] = useState<Record<string, OverrideRow>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchOverrides = async () => {
      const { data } = await supabase
        .from("reward_pool_overrides")
        .select("*");
      if (cancelled) return;
      const map: Record<string, OverrideRow> = {};
      (data ?? []).forEach((row: any) => { map[row.static_label] = row; });
      setOverrides(map);
      setLoaded(true);
    };
    fetchOverrides();
    const channel = supabase
      .channel("reward_pool_overrides")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reward_pool_overrides" },
        () => { fetchOverrides(); },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  const merged: RewardTemplate[] = SHARED_POOL.map((t) => {
    const o = overrides[t.staticLabel];
    if (!o) return t;
    if (!o.enabled) return { ...t, weight: 0 };
    const emoji = o.emoji || t.emoji;
    const minA = o.min_amount;
    const maxA = o.max_amount;
    const build = (minA != null && maxA != null && maxA >= minA)
      ? () => {
          const baseline = t.build();
          const span = maxA - minA + 1;
          return {
            ...baseline,
            emoji,
            amount: minA + Math.floor(Math.random() * span),
          };
        }
      : t.build;
    return { ...t, weight: Math.max(0, o.weight), emoji, build };
  });

  return { pool: merged, loaded };
}
