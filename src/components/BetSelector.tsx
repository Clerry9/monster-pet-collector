import { motion } from "framer-motion";
import { getAvailableBets } from "@/data/levels";

interface BetSelectorProps {
  coins: number;
  currentBet: number;
  onSetBet: (mult: number) => void;
}

export function BetSelector({ coins, currentBet, onSetBet }: BetSelectorProps) {
  const available = getAvailableBets(coins);
  // Energy bar — visualised from current bet relative to max available
  const maxBet = available[available.length - 1] ?? 1;
  const energyPct = Math.max(8, Math.round((currentBet / maxBet) * 100));

  return (
    <div className="flex items-center gap-3" role="radiogroup" aria-label="Bet multiplier">
      {/* Energy pill */}
      <div className="pill-energy flex items-center gap-1.5 px-3 py-1.5 min-w-[110px]">
        <span aria-hidden="true">⚡</span>
        <div className="flex-1 h-1.5 rounded-full bg-wood-dark/40 overflow-hidden">
          <motion.div
            className="h-full bg-cream-light rounded-full"
            initial={false}
            animate={{ width: `${energyPct}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          />
        </div>
        <span className="text-[11px] font-display leading-none">{currentBet}/{maxBet}</span>
      </div>

      {/* Bet multiplier picker — gold pills */}
      <div className="flex items-center gap-1">
        {available.map((mult) => (
          <motion.button
            key={mult}
            whileTap={{ scale: 0.9 }}
            role="radio"
            aria-checked={currentBet === mult}
            aria-label={`${mult} times multiplier`}
            onClick={() => onSetBet(mult)}
            className={`px-2.5 py-1 text-[11px] font-display leading-none rounded-full border-2 transition-all ${
              currentBet === mult
                ? "pill-gold border-wood-dark scale-105"
                : "bg-cream-light/60 border-wood-dark/60 text-wood-dark/70 hover:text-wood-dark"
            }`}
          >
            BET ×{mult}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
