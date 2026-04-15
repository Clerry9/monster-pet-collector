import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface CoinCounterProps {
  coins: number;
}

export function CoinCounter({ coins }: CoinCounterProps) {
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
      className="relative flex items-center gap-2 rounded-full bg-card px-5 py-2.5 box-glow-orange"
      role="status"
      aria-label={`${coins.toLocaleString()} coins`}
      aria-live="polite"
    >
      <span className="text-2xl" aria-hidden="true">🪙</span>
      <motion.span
        key={coins}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className="text-xl font-extrabold text-accent font-body"
      >
        {coins.toLocaleString()}
      </motion.span>
      <AnimatePresence>
        {showDelta && delta > 0 && (
          <motion.span
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            className="absolute -top-2 right-4 text-sm font-bold text-primary"
            aria-hidden="true"
          >
            +{delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
