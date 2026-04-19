import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface CoinCounterProps {
  coins: number;
  onAdd?: () => void;
}

export function CoinCounter({ coins, onAdd }: CoinCounterProps) {
  const [prevCoins, setPrevCoins] = useState(coins);
  const [showDelta, setShowDelta] = useState(false);
  const delta = coins - prevCoins;

  useEffect(() => {
    if (coins !== prevCoins) {
      setShowDelta(true);
      const t = setTimeout(() => {
        setShowDelta(false);
        setPrevCoins(coins);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [coins, prevCoins]);

  return (
    <div
      className="relative pill-gold flex items-center gap-1.5 pl-2 pr-1 py-1"
      role="status"
      aria-label={`${coins.toLocaleString()} coins`}
      aria-live="polite"
    >
      <span className="text-lg drop-shadow-sm" aria-hidden="true">🪙</span>
      <motion.span
        key={coins}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className="text-base font-display tracking-wide"
      >
        {coins.toLocaleString()}
      </motion.span>
      <button
        onClick={onAdd}
        aria-label="Add coins"
        className="ml-1 w-6 h-6 rounded-full bg-candy-red text-primary-foreground border-2 border-wood-dark font-display text-base leading-none flex items-center justify-center shadow-chunky-sm active:translate-y-0.5"
      >
        +
      </button>
      <AnimatePresence>
        {showDelta && delta > 0 && (
          <motion.span
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            className="absolute -top-2 right-4 text-sm font-display text-candy-red"
            aria-hidden="true"
          >
            +{delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
