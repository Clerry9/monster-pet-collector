import { motion } from "framer-motion";
import { getAvailableBets } from "@/data/levels";

interface BetSelectorProps {
  coins: number;
  currentBet: number;
  onSetBet: (mult: number) => void;
}

export function BetSelector({ coins, currentBet, onSetBet }: BetSelectorProps) {
  const available = getAvailableBets(coins);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground font-body whitespace-nowrap">Bet:</span>
      <div className="flex items-center gap-1 flex-wrap">
        {available.map((mult) => (
          <motion.button
            key={mult}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSetBet(mult)}
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-body transition-all ${
              currentBet === mult
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {mult}x
          </motion.button>
        ))}
      </div>
    </div>
  );
}
