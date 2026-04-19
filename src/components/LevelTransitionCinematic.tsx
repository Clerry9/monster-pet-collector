import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LevelTransitionCinematicProps {
  /** Increments whenever level changes — drives a one-shot cinematic. */
  levelId: number;
  /** CSS color for accent rays. */
  accentColor?: string;
}

/**
 * Plays a brief fade-out/pan/fade-in overlay on top of the 3D board
 * whenever `levelId` changes — gives the impression of the camera
 * panning to a brand-new island.
 */
export function LevelTransitionCinematic({ levelId, accentColor = "hsl(var(--primary))" }: LevelTransitionCinematicProps) {
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const [prevLevel, setPrevLevel] = useState(levelId);

  useEffect(() => {
    if (levelId === prevLevel) return;
    setPrevLevel(levelId);
    setActiveKey(Date.now());
    const t = setTimeout(() => setActiveKey(null), 1400);
    return () => clearTimeout(t);
  }, [levelId, prevLevel]);

  return (
    <AnimatePresence>
      {activeKey !== null && (
        <motion.div
          key={activeKey}
          className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Full fade veil */}
          <motion.div
            className="absolute inset-0 bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            transition={{ duration: 1.4, times: [0, 0.45, 1], ease: "easeInOut" }}
          />
          {/* Horizontal pan streaks (suggests camera movement) */}
          <motion.div
            className="absolute inset-y-0 w-[140%]"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)`,
            }}
            initial={{ x: "-40%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 1.2, ease: [0.22, 0.9, 0.3, 1] }}
          />
          {/* Vignette swipe */}
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 50% 55%, transparent 30%, ${accentColor}22 70%, hsl(var(--background)) 100%)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            transition={{ duration: 1.4, times: [0, 0.4, 1] }}
          />
          {/* Tiny "Level X" badge bottom-center */}
          <motion.div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card/90 border-2 border-wood-dark shadow-chunky-sm font-display text-xs"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.4, times: [0, 0.25, 0.75, 1] }}
            style={{ color: accentColor }}
          >
            ✦ Level {levelId} ✦
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
