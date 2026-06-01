import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

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
  // Keep latest onDone in a ref so parent re-renders (e.g. the per-second
  // energy timer) don't keep resetting the auto-dismiss timer and leave the
  // popup (skull "Ouch!", etc.) stuck on screen forever.
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  const handledRef = useRef<typeof reward>(null);
  useEffect(() => {
    if (!reward) { handledRef.current = null; return; }
    if (handledRef.current === reward) return;
    handledRef.current = reward;
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[LandingRewardPopup] open", reward);
    }
    let fired = false;
    const fire = (source: "timer" | "manual") => {
      if (fired) return;
      fired = true;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug(`[LandingRewardPopup] dismiss (${source})`, reward);
      }
      onDoneRef.current?.();
    };
    const t = window.setTimeout(() => fire("timer"), 2000);
    // Stash the fire fn so the close button can invoke it.
    fireRef.current = () => fire("manual");
    return () => {
      window.clearTimeout(t);
      fireRef.current = null;
    };
  }, [reward]);
  const fireRef = useRef<(() => void) | null>(null);

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
          className="fixed left-1/2 top-1/3 -translate-x-1/2 z-[85]"
          role="status"
          aria-live="polite"
        >
          <div
            className={`relative flex flex-col items-center gap-1 px-5 py-3 pr-10 rounded-2xl border-4 border-wood-dark shadow-chunky ${
              bad
                ? "bg-gradient-to-b from-rose-500 to-red-700"
                : "bg-gradient-to-b from-amber-400 to-orange-600"
            }`}
          >
            <button
              type="button"
              onClick={() => fireRef.current?.()}
              aria-label="Dismiss reward"
              className="tap-target absolute top-1 right-1 inline-flex items-center justify-center w-8 h-8 rounded-full bg-wood-dark/40 text-cream-light hover:bg-wood-dark/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-light focus-visible:ring-offset-2"
            >
              <X size={18} aria-hidden="true" />
            </button>
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