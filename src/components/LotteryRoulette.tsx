import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { TileType } from "@/hooks/useGameState";

const ICONS: Record<TileType | "card", string> = {
  coins: "🪙",
  bonus: "⚡",
  chest: "🎁",
  food: "🍖",
  skull: "💀",
  star: "⭐",
  card: "🃏",
};

const REEL: string[] = ["🪙", "⚡", "🎁", "🍖", "⭐", "🃏", "🪙", "⚡"];

interface LotteryRouletteProps {
  /** Whether to spin (true while dice is rolling / monster hopping) */
  spinning: boolean;
  /** Final reward icon to land on; null = hidden */
  result: TileType | "card" | null;
  className?: string;
}

/**
 * Tiny horizontal reel that floats above the active monster's head while
 * a roll is in flight, then snaps to the actual reward icon when the
 * monster lands.
 */
export function LotteryRoulette({ spinning, result, className = "" }: LotteryRouletteProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!spinning) return;
    const id = setInterval(() => setTick((t) => t + 1), 90);
    return () => clearInterval(id);
  }, [spinning]);

  if (!spinning && !result) return null;

  const showIcon = spinning ? REEL[tick % REEL.length] : result ? ICONS[result] : "🎁";

  return (
    <AnimatePresence>
      <motion.div
        key="lottery"
        initial={{ opacity: 0, y: 8, scale: 0.6 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.4 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className={`pointer-events-none flex items-center justify-center rounded-full border-2 border-gold bg-card/95 shadow-chunky w-12 h-12 text-2xl ${className}`}
        aria-hidden="true"
      >
        <motion.span
          key={showIcon}
          initial={{ scale: spinning ? 0.7 : 1.4, rotate: spinning ? -20 : 0 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: spinning ? 0.09 : 0.35 }}
        >
          {showIcon}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
}