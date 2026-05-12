import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ParticleBurst } from "@/components/effects/Particles";

export type CelebrationKind = "energy" | "coins" | "card" | "crit" | "star" | null;

const KEY = "lov_celebrations_enabled";
export function getCelebrationsEnabled(): boolean {
  try { return localStorage.getItem(KEY) !== "0"; } catch { return true; }
}
export function setCelebrationsEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* ignore */ }
}

const CONFIG: Record<Exclude<CelebrationKind, null>, { emoji: string; label: string; color: string }> = {
  energy: { emoji: "⚡", label: "ENERGY!",     color: "from-amber-300 to-yellow-500" },
  coins:  { emoji: "🪙", label: "COIN HAUL!",  color: "from-yellow-300 to-amber-500" },
  card:   { emoji: "🃏", label: "NEW CARD!",   color: "from-violet-300 to-fuchsia-500" },
  crit:   { emoji: "💥", label: "CRIT!",       color: "from-rose-300 to-red-500" },
  star:   { emoji: "⭐", label: "ISLAND STAR!", color: "from-sky-300 to-indigo-500" },
};

interface Props {
  kind: CelebrationKind;
  onDone?: () => void;
}

/**
 * Quick full-screen celebration overlay. Respects the user toggle.
 * Auto-dismisses after ~1.4s.
 */
export function RewardCelebration({ kind, onDone }: Props) {
  const [shown, setShown] = useState<CelebrationKind>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!kind) return;
    if (!getCelebrationsEnabled()) { onDone?.(); return; }
    setShown(kind);
    setBurst((b) => b + 1);
    const t = window.setTimeout(() => {
      setShown(null);
      onDone?.();
    }, 1400);
    return () => window.clearTimeout(t);
  }, [kind, onDone]);

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          aria-hidden="true"
        >
          <ParticleBurst trigger={burst} count={28} emoji={CONFIG[shown].emoji} />
          <motion.div
            className={`relative px-8 py-4 rounded-2xl bg-gradient-to-br ${CONFIG[shown].color} border-4 border-wood-dark shadow-chunky`}
            initial={{ scale: 0.4, rotate: -12 }}
            animate={{ scale: [0.4, 1.15, 1], rotate: [-12, 6, 0] }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 font-display text-2xl text-wood-dark drop-shadow-[0_2px_0_rgba(255,255,255,0.4)]">
              <motion.span
                animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: 1 }}
                className="text-4xl"
              >
                {CONFIG[shown].emoji}
              </motion.span>
              {CONFIG[shown].label}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
