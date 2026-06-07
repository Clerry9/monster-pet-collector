import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { BonusReward } from "@/lib/bonusRewards";

export interface IslandRewardSummaryData {
  reward: BonusReward;
  coinsBefore: number;
  coinsAfter: number;
  energyBefore: number;
  energyAfter: number;
  shardsBefore: number;
  shardsAfter: number;
}

interface Props {
  data: IslandRewardSummaryData | null;
  onClose: () => void;
}

const KIND_LABEL: Record<string, string> = {
  energy: "Energy Refill",
  shards: "Monster Shards",
  shards_mega: "Mega Shard Burst",
  minigame_token: "Mini-Game Token",
  build_discount: "Build Discount",
  monster_buff: "Monster Buff",
  skull: "Skull Bust",
};

function Row({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  const positive = delta > 0;
  const negative = delta < 0;
  return (
    <div className="flex items-center justify-between gap-3 py-1 font-body text-sm">
      <span className="text-cream-light/80">{label}</span>
      <span className="font-display text-cream-light">
        {before.toLocaleString()} → {after.toLocaleString()}{" "}
        <span
          className={
            positive
              ? "text-emerald-300"
              : negative
                ? "text-rose-300"
                : "text-cream-light/60"
          }
        >
          ({positive ? "+" : ""}{delta.toLocaleString()})
        </span>
      </span>
    </div>
  );
}

/**
 * Post-reward summary panel: shows the reward type and how the player's
 * balances changed (coins / energy / shards). Accessible: focus-trapping
 * not needed (single button), labelled, dismissible by button or Escape via
 * parent. Auto-dismisses are intentionally NOT applied — this is a confirm.
 */
export function IslandRewardSummary({ data, onClose }: Props) {
  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="island-reward-summary-title"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 20 }}
            transition={{ type: "spring", damping: 18, stiffness: 260 }}
            className="relative w-full max-w-sm rounded-2xl border-4 border-wood-dark bg-gradient-to-b from-amber-500 to-orange-700 p-5 shadow-chunky"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close reward summary"
              className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-wood-dark bg-cream text-wood-dark hover:bg-cream-light focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-5xl" aria-hidden="true">
                {data.reward.emoji}
              </span>
              <h2
                id="island-reward-summary-title"
                className="font-display text-xl text-cream-light drop-shadow-[0_1px_0_rgba(0,0,0,0.5)]"
              >
                {KIND_LABEL[data.reward.kind] ?? data.reward.label}
              </h2>
              <p className="font-body text-xs text-cream-light/90">
                {data.reward.description}
              </p>
            </div>

            <div className="mt-4 space-y-1 rounded-lg border-2 border-wood-dark/60 bg-wood-dark/30 px-3 py-2">
              {data.coinsAfter !== data.coinsBefore && (
                <Row label="🪙 Coins" before={data.coinsBefore} after={data.coinsAfter} />
              )}
              {data.energyAfter !== data.energyBefore && (
                <Row label="⚡ Energy" before={data.energyBefore} after={data.energyAfter} />
              )}
              {data.shardsAfter !== data.shardsBefore && (
                <Row label="💠 Shards" before={data.shardsBefore} after={data.shardsAfter} />
              )}
              {data.coinsAfter === data.coinsBefore &&
                data.energyAfter === data.energyBefore &&
                data.shardsAfter === data.shardsBefore && (
                  <p className="text-center font-body text-xs text-cream-light/80">
                    Effect applied: {data.reward.label}
                  </p>
                )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-press mt-4 w-full rounded-full py-2.5 font-display text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              GOT IT
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}