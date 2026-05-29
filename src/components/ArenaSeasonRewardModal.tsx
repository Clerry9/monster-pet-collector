import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SeasonRewardRow {
  season_id: string;
  rank: number;
  coins: number;
  shards: number;
}

interface Props {
  rewards: SeasonRewardRow[];
  onClose: () => void;
}

export function ArenaSeasonRewardModal({ rewards, onClose }: Props) {
  const totalCoins = rewards.reduce((s, r) => s + r.coins, 0);
  const totalShards = rewards.reduce((s, r) => s + r.shards, 0);
  const bestRank = Math.min(...rewards.map((r) => r.rank));

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 18 }}
        className="rounded-2xl border-4 border-gold bg-gradient-to-b from-wood to-wood-dark p-6 max-w-sm w-full shadow-chunky text-center"
      >
        <Trophy className="mx-auto text-gold mb-2" size={48} />
        <h2 className="font-display text-2xl text-gold mb-1">Season Rewards!</h2>
        <p className="text-cream/80 text-sm mb-4">
          You finished <span className="font-display text-gold">#{bestRank}</span>
          {rewards.length > 1 ? ` across ${rewards.length} past seasons.` : " last week."}
        </p>
        <div className="space-y-1 mb-4">
          {rewards.map((r) => (
            <div key={r.season_id} className="flex justify-between text-xs text-cream/90 bg-black/30 rounded px-3 py-2">
              <span>{r.season_id} · Rank #{r.rank}</span>
              <span className="font-display text-gold">+🪙{r.coins} +✨{r.shards}</span>
            </div>
          ))}
        </div>
        <div className="font-display text-lg text-gold mb-4">
          Total: +{totalCoins} 🪙 · +{totalShards} ✨
        </div>
        <Button onClick={onClose} className="w-full font-display">Claim</Button>
      </motion.div>
    </motion.div>
  );
}