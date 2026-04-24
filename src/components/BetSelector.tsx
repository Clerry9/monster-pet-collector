import { motion } from "framer-motion";
import { getAvailableBets } from "@/data/levels";

interface BetSelectorProps {
  coins: number;
  currentBet: number;
  onSetBet: (mult: number) => void;
  /** Real energy resource — when provided, the ⚡ pill reflects current/cap. */
  energy?: number;
  energyCap?: number;
}

export function BetSelector({ coins, currentBet, onSetBet, energy, energyCap }: BetSelectorProps) {
  const available = getAvailableBets(coins);
  // Real energy if provided, otherwise fall back to the legacy bet-relative pill.
  const useReal = typeof energy === "number" && typeof energyCap === "number" && energyCap > 0;
  const cur = useReal ? Math.min(energy!, energyCap!) : currentBet;
  const max = useReal ? energyCap! : (available[available.length - 1] ?? 1);
  const overflow = useReal ? Math.max(0, energy! - energyCap!) : 0;
  const energyPct = Math.max(6, Math.min(100, Math.round((cur / max) * 100)));

  return (
    <div className="flex items-center gap-3" role="radiogroup" aria-label="Bet multiplier">
      {/* Energy pill */}
      <div
        className="pill-energy flex items-center gap-1.5 px-3 py-1.5 min-w-[120px]"
        title={useReal ? `Energy refills 1 every 3 minutes up to ${energyCap}` : undefined}
      >
        <span aria-hidden="true">⚡</span>
        <div className="flex-1 h-1.5 rounded-full bg-wood-dark/40 overflow-hidden">
          <motion.div
            className="h-full bg-cream-light rounded-full"
            initial={false}
            animate={{ width: `${energyPct}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          />
        </div>
        <span className="text-[11px] font-display leading-none">
          {useReal ? `${energy}/${energyCap}` : `${currentBet}/${max}`}
          {overflow > 0 && <span className="ml-1 text-[9px] opacity-90">+{overflow}</span>}
        </span>
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
