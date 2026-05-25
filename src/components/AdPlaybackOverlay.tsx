import { AnimatePresence, motion } from "framer-motion";
import { Tv } from "lucide-react";

/**
 * Fullscreen "ad is playing" overlay. Shown while the rewarded-ad provider
 * (CrazyGames / AdMob / 3-second demo) is delivering the spot, so the user
 * gets clear feedback that something is happening before the reward lands.
 */
export function AdPlaybackOverlay({ open, label = "Ad playing…" }: { open: boolean; label?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="adplay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 text-cream-light"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl border border-white/15 bg-black/60">
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
            >
              <Tv size={26} />
            </motion.div>
            <div className="font-display text-sm tracking-wide">{label}</div>
            <div className="text-[11px] opacity-70">Reward unlocks when the ad ends</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}