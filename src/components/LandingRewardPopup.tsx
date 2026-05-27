import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export interface LandingReward {
  icon: string;
  title: string;
  subtitle?: string;
  tone?: "good" | "bad" | "neutral";
}

interface Props {
  reward: LandingReward | null;
  onDone: () => void;
}

/**
 * Brief 2-second popup shown when the monster finishes hopping, summarizing
 * what was won (or lost) on the tile it landed on. Auto-dismisses.
 */
export function LandingRewardPopup({ reward, onDone }: Props) {
  useEffect(() => {
    if (!reward) return;
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [reward, onDone]);

  const bad = reward?.tone === "bad";

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          key={reward.title + reward.icon}
          initial={{ opacity: 0, y: 30, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          className="fixed left-1/2 top-1/3 -translate-x-1/2 z-[85] pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div
            className={`flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border-4 border-wood-dark shadow-chunky ${
              bad
                ? "bg-gradient-to-b from-rose-500 to-red-700"
                : "bg-gradient-to-b from-amber-400 to-orange-600"
            }`}
          >
            <span className="text-3xl" aria-hidden="true">
              {reward.icon}
            </span>
            <span className="font-display text-lg text-cream-light drop-shadow-[0_1px_0_rgba(0,0,0,0.7)]">
              {reward.title}
            </span>
            {reward.subtitle && (
              <span className="text-[10px] font-body text-cream-light/90 text-center">
                {reward.subtitle}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}