import { SHARED_POOL, RewardTemplate } from "@/data/rewardPool";
import { useRouletteHistory } from "@/hooks/useRouletteHistory";

type Tier = "common" | "rare" | "epic" | "legendary";

function tierFor(t: RewardTemplate): Tier {
  if (t.weight >= 25) return "common";
  if (t.weight >= 14) return "rare";
  if (t.weight >= 7) return "epic";
  return "legendary";
}

const tierBadge: Record<Tier, string> = {
  common: "bg-muted text-muted-foreground",
  rare: "bg-primary/20 text-primary",
  epic: "bg-secondary/20 text-secondary",
  legendary: "bg-accent/20 text-accent",
};
const tierBorder: Record<Tier, string> = {
  common: "border-muted-foreground/30",
  rare: "border-primary",
  epic: "border-secondary",
  legendary: "border-accent",
};

const TIER_ORDER: Tier[] = ["common", "rare", "epic", "legendary"];

export function CoinRewardGallery() {
  const { entries } = useRouletteHistory();
  const totalWeight = SHARED_POOL.reduce((s, t) => s + t.weight, 0);
  const seenLabels = new Set(entries.map((e) => e.rewardLabel));

  const grouped: Record<Tier, RewardTemplate[]> = { common: [], rare: [], epic: [], legendary: [] };
  SHARED_POOL.forEach((t) => grouped[tierFor(t)].push(t));

  const totalCollected = SHARED_POOL.filter((t) => seenLabels.has(t.staticLabel)).length;
  const overallPct = Math.round((totalCollected / SHARED_POOL.length) * 100);

  return (
    <div className="w-full" role="region" aria-label="Reward gallery">
      <div className="mb-4 flex items-end justify-between gap-2">
        <h3 className="font-display text-2xl text-foreground text-glow-orange">Reward Album</h3>
        <div className="text-right">
          <div className="font-display text-lg text-accent leading-none">{overallPct}%</div>
          <div className="text-[10px] text-muted-foreground font-body">
            {totalCollected} / {SHARED_POOL.length} discovered
          </div>
        </div>
      </div>

      {totalCollected === 0 && (
        <p className="mb-4 rounded-lg border border-dashed border-border bg-card/40 p-3 text-xs text-muted-foreground">
          Spin the Lucky Roulette to discover rewards. Each prize you land on
          will fill its slot below with rarity and odds info.
        </p>
      )}

      {TIER_ORDER.map((tier) => {
        const items = grouped[tier];
        if (items.length === 0) return null;
        const tierCollected = items.filter((t) => seenLabels.has(t.staticLabel)).length;
        const pct = Math.round((tierCollected / items.length) * 100);
        return (
          <section key={tier} className="mb-5" aria-label={`${tier} rewards`}>
            <header className="mb-2 flex items-center justify-between">
              <h4 className={`font-display text-base text-foreground flex items-center gap-2 capitalize`}>
                {tier}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierBadge[tier]}`}>
                  {tierCollected}/{items.length}
                </span>
              </h4>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} aria-hidden />
                </div>
                <span className="text-[11px] font-bold text-accent tabular-nums">{pct}%</span>
              </div>
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="list">
              {items.map((t) => {
                const seen = seenLabels.has(t.staticLabel);
                const odds = Math.round((t.weight / totalWeight) * 1000) / 10;
                return (
                  <div
                    key={t.staticLabel}
                    role="listitem"
                    className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 bg-card ${tierBorder[tier]} ${seen ? "" : "opacity-60"}`}
                    aria-label={seen
                      ? `${t.staticLabel}, ${tier}, ${odds}% odds. Collected.`
                      : `${t.staticLabel}, ${tier}, ${odds}% odds. Not yet discovered.`}
                  >
                    <div className="text-3xl" aria-hidden>{seen ? t.emoji : "❓"}</div>
                    <span className="text-xs font-bold font-body text-foreground text-center">
                      {seen ? t.staticLabel : "???"}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{odds}% odds</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tierBadge[tier]}`}>
                      {seen ? "✓ collected" : "locked"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}