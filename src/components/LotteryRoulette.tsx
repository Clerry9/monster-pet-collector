import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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
  /**
   * Fired once per spin when the lucky-energy bonus triggers (~8% chance).
   * The reel will visibly land on ⚡ and the callback receives the bonus
   * energy amount to grant.
   */
  onLuckyEnergy?: (amount: number) => void;
}

/**
 * Tiny horizontal reel that floats above the active monster's head while
 * a roll is in flight, then snaps to the actual reward icon when the
 * monster lands.
 */
export function LotteryRoulette({ spinning, result, className = "", onLuckyEnergy }: LotteryRouletteProps) {
  const [tick, setTick] = useState(0);
  // Roll a lucky-energy bonus once per spin cycle (the 0→1 spinning edge).
  // When set, we override the landed icon to ⚡ and fire the callback on stop.
  const [luckyEnergy, setLuckyEnergy] = useState<number | null>(null);
  const wasSpinningRef = useRef(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (spinning && !wasSpinningRef.current) {
      // Rising edge — roll a fresh lucky bonus (~8% chance: 5 / 10 / 15⚡).
      firedRef.current = false;
      const r = Math.random();
      if (r < 0.08) {
        const amt = r < 0.015 ? 15 : r < 0.04 ? 10 : 5;
        setLuckyEnergy(amt);
      } else {
        setLuckyEnergy(null);
      }
    }
    wasSpinningRef.current = spinning;
  }, [spinning]);

  useEffect(() => {
    if (!spinning) return;
    const id = setInterval(() => setTick((t) => t + 1), 90);
    return () => clearInterval(id);
  }, [spinning]);

  // Once the spin stops with a server result, fire the bonus callback (idempotent per spin).
  useEffect(() => {
    if (!spinning && result && luckyEnergy && !firedRef.current) {
      firedRef.current = true;
      onLuckyEnergy?.(luckyEnergy);
    }
  }, [spinning, result, luckyEnergy, onLuckyEnergy]);

  if (!spinning && !result) return null;

  const landedIcon = luckyEnergy ? "⚡" : result ? ICONS[result] : "🎁";
  const showIcon = spinning ? REEL[tick % REEL.length] : landedIcon;

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
        {!spinning && luckyEnergy && (
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: -18 }}
            transition={{ duration: 0.5 }}
            className="absolute -top-1 text-[10px] font-display text-yellow-300 drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]"
          >
            +{luckyEnergy}⚡
          </motion.span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}