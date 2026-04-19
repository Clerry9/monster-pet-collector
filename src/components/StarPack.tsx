import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface StarPackProps {
  coins: number;
  onBuy: (cost: number, stars: number) => void;
}

const PACKS = [
  { id: "small", stars: 1, cost: 250, emoji: "⭐", label: "Single Star" },
  { id: "bundle", stars: 5, cost: 1000, emoji: "🌟", label: "Card Flip Bundle", best: true },
  { id: "mega", stars: 15, cost: 2700, emoji: "💫", label: "Mega Star Pack" },
];

export function StarPack({ coins, onBuy }: StarPackProps) {
  const handleBuy = (cost: number, stars: number) => {
    if (coins < cost) {
      toast.error("Not enough coins");
      return;
    }
    onBuy(cost, stars);
    toast.success(`+${stars} ⭐ added!`);
  };

  return (
    <div className="panel-wood p-3 space-y-2">
      <div className="flex items-center justify-center gap-2 font-display text-sm text-cream-light">
        <Star size={14} fill="currentColor" /> ISLAND STAR PACK <Star size={14} fill="currentColor" />
      </div>
      <p className="text-center text-[10px] font-display text-cream/70">
        Skip the grind — 5 ⭐ = free card flip
      </p>
      <div className="grid grid-cols-3 gap-2">
        {PACKS.map((p) => {
          const canAfford = coins >= p.cost;
          return (
            <motion.button
              key={p.id}
              whileTap={canAfford ? { scale: 0.95 } : undefined}
              onClick={() => handleBuy(p.cost, p.stars)}
              disabled={!canAfford}
              className={`relative rounded-xl border-2 border-wood-dark p-2 flex flex-col items-center gap-1 bg-cream/95 transition
                ${canAfford ? "hover:bg-cream shadow-chunky-sm" : "opacity-50 cursor-not-allowed"}`}
            >
              {p.best && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[8px] font-display bg-candy-red text-cream-light border border-wood-dark">
                  BEST
                </span>
              )}
              <span className="text-2xl" aria-hidden>{p.emoji}</span>
              <span className="font-display text-xs text-wood-dark leading-tight">{p.label}</span>
              <span className="font-display text-sm text-wood-dark">+{p.stars} ⭐</span>
              <span className="pill-gold text-[10px] px-2 py-0.5">{p.cost} 🪙</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
