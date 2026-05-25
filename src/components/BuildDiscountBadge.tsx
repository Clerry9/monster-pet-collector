import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hammer, X } from "lucide-react";

interface Props {
  /** Active discount percent (e.g. 25). Null/0 hides the badge. */
  percent: number | null;
  /** Epoch ms when the discount expires. */
  expiresAt: number | null;
  /** User dismissed the badge for this discount. */
  onClose: () => void;
  /** Open the spot where the discount applies (Season → Build a Monster Hut). */
  onOpenBuild: () => void;
}

/**
 * Small floating chip that surfaces an active −X% build cost discount.
 * Renders bottom-left above the dock and can be dismissed with an X.
 */
export function BuildDiscountBadge({ percent, expiresAt, onClose, onOpenBuild }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!percent || !expiresAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [percent, expiresAt]);

  if (!percent || !expiresAt) return null;
  const remaining = Math.max(0, expiresAt - now);
  if (remaining <= 0) return null;
  const m = Math.floor(remaining / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000).toString().padStart(2, "0");

  return (
    <AnimatePresence>
      <motion.div
        key={`${expiresAt}`}
        initial={{ opacity: 0, y: 8, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        className="fixed z-30 left-2 bottom-[140px] sm:bottom-[150px] flex items-center gap-1"
        role="status"
        aria-label={`Active ${percent}% build cost discount. ${m}:${s} remaining. Tap to use.`}
      >
        <button
          type="button"
          onClick={onOpenBuild}
          className="flex items-center gap-1 rounded-full bg-emerald-600/95 border-2 border-emerald-900 px-2 py-0.5 text-cream-light font-display shadow-chunky-sm hover:scale-105 active:scale-95 transition-transform"
          title="Tap to open the Build a Monster Hut menu"
        >
          <Hammer size={11} aria-hidden="true" />
          <span className="text-[10px] leading-none">−{percent}%</span>
          <span className="text-[9px] leading-none opacity-90 tabular-nums">{m}:{s}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-5 h-5 rounded-full bg-wood-dark/90 border border-cream-light/40 text-cream-light flex items-center justify-center hover:bg-wood-dark"
          aria-label="Dismiss discount badge"
        >
          <X size={10} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}