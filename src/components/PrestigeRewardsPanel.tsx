import { Crown, Lock, Check } from "lucide-react";
import { getPrestigeTier, PRESTIGE_BONUS_PER_TIER, PRESTIGE_INTERVAL } from "@/data/levels";

interface Props {
  level: number;
}

const TIERS_TO_SHOW = 6;

export function PrestigeRewardsPanel({ level }: Props) {
  const currentTier = getPrestigeTier(level);

  const rows = Array.from({ length: TIERS_TO_SHOW }, (_, i) => {
    const tier = i + 1;
    const requiredLevel = tier * PRESTIGE_INTERVAL;
    const bonusPct = Math.round(tier * PRESTIGE_BONUS_PER_TIER * 100);
    const unlocked = currentTier >= tier;
    const levelsRemaining = Math.max(0, requiredLevel - level);
    return { tier, requiredLevel, bonusPct, unlocked, levelsRemaining };
  });

  return (
    <div>
      <h3 className="font-display text-xl text-foreground text-glow-purple mb-1 flex items-center gap-2">
        <Crown className="text-amber-400" size={20} />
        Prestige Rewards
      </h3>
      <p className="text-xs text-muted-foreground font-body mb-3">
        Reach milestone levels to permanently boost every coin payout.
      </p>
      <div className="rounded-xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-card p-2 space-y-1.5">
        {rows.map(({ tier, requiredLevel, bonusPct, unlocked, levelsRemaining }) => (
          <div
            key={tier}
            className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
              unlocked
                ? "border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-yellow-600/10"
                : "border-border bg-background/40"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {unlocked ? (
                <div className="rounded-full bg-amber-400 p-1 shrink-0">
                  <Check size={10} className="text-amber-950" strokeWidth={3} />
                </div>
              ) : (
                <div className="rounded-full bg-muted p-1 shrink-0">
                  <Lock size={10} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-bold font-body ${unlocked ? "text-amber-300" : "text-foreground"}`}>
                  Prestige Tier {tier}
                </span>
                <span className="text-[10px] text-muted-foreground font-body">
                  {unlocked ? `Level ${requiredLevel} reached` : `${levelsRemaining} levels to go`}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-sm font-extrabold font-display ${unlocked ? "text-amber-300" : "text-primary"}`}>
                +{bonusPct}%
              </div>
              <div className="text-[10px] text-muted-foreground font-body">coin bonus</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
