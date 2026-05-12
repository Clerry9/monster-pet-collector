import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { showRewardedAd, initAds } from "@/lib/ads";
import { toast } from "sonner";

export type AdRewardKind = "energy_50" | "coins_200" | "roulette_spin" | "card_pack";

export interface AdRewardConfig {
  kind: AdRewardKind;
  label: string;
  description: string;
  cooldownMs: number;
  dailyCap: number;
}

export const AD_REWARDS: AdRewardConfig[] = [
  { kind: "energy_50",    label: "+50 Energy",    description: "Refill stamina to keep rolling", cooldownMs: 30 * 60 * 1000,        dailyCap: 6 },
  { kind: "coins_200",    label: "+200 Coins",    description: "Bonus coins for the shop",        cooldownMs: 30 * 60 * 1000,        dailyCap: 6 },
  { kind: "roulette_spin",label: "Free Spin",     description: "1 Lucky Roulette spin",           cooldownMs: 24 * 60 * 60 * 1000,   dailyCap: 1 },
  { kind: "card_pack",    label: "Free Card",     description: "1 free card flip",                cooldownMs: 24 * 60 * 60 * 1000,   dailyCap: 1 },
];

interface StatusRow {
  reward_kind: AdRewardKind;
  last_claim_at: string | null;
  today_count: number;
}

export function useAdRewards(onChanged?: () => void) {
  const { user } = useAuth();
  const [status, setStatus] = useState<Record<AdRewardKind, StatusRow>>(
    {} as Record<AdRewardKind, StatusRow>,
  );
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<AdRewardKind | null>(null);

  useEffect(() => { void initAds(); }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).rpc("get_ad_reward_status");
    const map = {} as Record<AdRewardKind, StatusRow>;
    for (const r of (data ?? []) as StatusRow[]) map[r.reward_kind] = r;
    setStatus(map);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const cooldownLeft = (cfg: AdRewardConfig): number => {
    const last = status[cfg.kind]?.last_claim_at;
    if (!last) return 0;
    const elapsed = now - new Date(last).getTime();
    return Math.max(0, cfg.cooldownMs - elapsed);
  };

  const todayCount = (kind: AdRewardKind) => status[kind]?.today_count ?? 0;

  const canClaim = (cfg: AdRewardConfig) =>
    busy === null && cooldownLeft(cfg) === 0 && todayCount(cfg.kind) < cfg.dailyCap;

  const watchAndClaim = useCallback(
    async (kind: AdRewardKind) => {
      if (!user) return false;
      setBusy(kind);
      try {
        const ok = await showRewardedAd();
        if (!ok) {
          toast("Ad skipped — no reward granted");
          return false;
        }
        const { error } = await (supabase as any).rpc("claim_ad_reward", { p_kind: kind });
        if (error) {
          toast.error(error.message ?? "Could not grant reward");
          return false;
        }
        const cfg = AD_REWARDS.find((r) => r.kind === kind);
        toast.success("Reward granted!", { description: cfg?.label });
        await refresh();
        onChanged?.();
        return true;
      } finally {
        setBusy(null);
      }
    },
    [user, refresh, onChanged],
  );

  const anyAvailable = AD_REWARDS.some((cfg) => canClaim(cfg));

  return { status, busy, cooldownLeft, todayCount, canClaim, watchAndClaim, anyAvailable, refresh };
}

export function formatCooldown(ms: number): string {
  if (ms <= 0) return "Ready";
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}