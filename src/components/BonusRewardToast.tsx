import { AnimatePresence, motion } from "framer-motion";
import type { BonusReward } from "@/lib/bonusRewards";
import { useEffect, useRef } from "react";

interface Props {
  reward: BonusReward | null;
  onDone: () => void;
}

/**
 * Animated celebratory toast that pops in the center of the screen when a
 * per-roll bonus reward triggers. Auto-dismisses after 1.8s.
 */
export function BonusRewardToast({ reward, onDone }: Props) {
  // Stash onDone in a ref so parent re-renders (per-second energy timer, etc.)
  // don't restart the auto-dismiss timer and leave the toast stuck on screen.
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  const handledRef = useRef<BonusReward | null>(null);
  useEffect(() => {
    if (!reward) { handledRef.current = null; return; }
    if (handledRef.current === reward) return;
    handledRef.current = reward;
    const t = window.setTimeout(() => onDoneRef.current?.(), 1800);
    return () => window.clearTimeout(t);
  }, [reward]);

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          key={reward.kind + reward.amount}
          initial={{ opacity: 0, y: 40, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          className="fixed left-1/2 top-1/3 -translate-x-1/2 z-[90] pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-600 border-4 border-wood-dark shadow-chunky">
            <span className="text-3xl" aria-hidden="true">{reward.emoji}</span>
            <span className="font-display text-lg text-cream-light drop-shadow-[0_1px_0_rgba(0,0,0,0.7)]">
              {reward.label}
            </span>
            <span className="text-[10px] font-body text-cream-light/90">
              {reward.description}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}