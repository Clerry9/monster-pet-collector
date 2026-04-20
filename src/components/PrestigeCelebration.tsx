import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfxLevelUp } from "@/lib/sfx";
import { PRESTIGE_BONUS_PER_TIER } from "@/data/levels";

interface PrestigeCelebrationProps {
  tier: number | null;
  onComplete: () => void;
}

function generateStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 1.6 + Math.random() * 1.8,
    size: 6 + Math.random() * 10,
  }));
}

export function PrestigeCelebration({ tier, onComplete }: PrestigeCelebrationProps) {
  const [stars] = useState(() => generateStars(40));

  useEffect(() => {
    if (!tier) return;
    sfxLevelUp();
    const t = setTimeout(onComplete, 5200);
    return () => clearTimeout(t);
  }, [tier, onComplete]);

  if (!tier) return null;

  const totalBonusPct = Math.round(tier * PRESTIGE_BONUS_PER_TIER * 100);
  const milestoneLevel = tier * 100;

  return (
    <AnimatePresence>
      {tier && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-auto overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={onComplete}
          role="dialog"
          aria-label={`Prestige tier ${tier} reached at level ${milestoneLevel}`}
        >
          {/* Cosmic backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-background to-purple-950" />
          <div className="absolute inset-0 bg-background/70" />

          {/* Pulsing radial gold */}
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, hsl(45 100% 60% / 0.45), transparent 55%)",
            }}
            animate={{ scale: [0.8, 1.4, 1.1], opacity: [0.4, 1, 0.7] }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
          />

          {/* Twinkling stars */}
          {stars.map((s) => (
            <motion.div
              key={s.id}
              className="absolute rounded-full bg-yellow-300"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: s.size,
                height: s.size,
                boxShadow: "0 0 12px hsl(45 100% 70%)",
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0.4, 1, 0], scale: [0, 1.2, 1, 1.3, 0.6] }}
              transition={{ duration: s.duration, delay: s.delay, repeat: Infinity }}
            />
          ))}

          {/* Sweeping light rays */}
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.div
              key={`ray-${i}`}
              className="absolute top-1/2 left-1/2 origin-left"
              style={{
                width: "70vmax",
                height: "6px",
                background: "linear-gradient(90deg, hsl(45 100% 65% / 0.55), transparent)",
                transform: `rotate(${i * 22.5}deg)`,
              }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: [0, 0.7, 0.3], scaleX: 1 }}
              transition={{ duration: 1.8, delay: 0.4 + i * 0.04, ease: "easeOut" }}
            />
          ))}

          {/* Center medallion */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-4 px-10 py-10 rounded-3xl border-2 border-yellow-400/60 bg-card/95 backdrop-blur-md shadow-2xl mx-6 max-w-sm"
            initial={{ scale: 0.2, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 11, stiffness: 180, delay: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 rounded-3xl"
              style={{
                boxShadow: "0 0 80px hsl(45 100% 60% / 0.6), 0 0 160px hsl(45 100% 60% / 0.3)",
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />

            <motion.div
              className="font-display text-xs tracking-[0.4em] uppercase"
              style={{ color: "hsl(45 100% 70%)" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              Prestige Unlocked
            </motion.div>

            <motion.div
              className="text-7xl drop-shadow-[0_0_18px_hsl(45_100%_60%)]"
              animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
              transition={{ duration: 1.4, delay: 0.7 }}
            >
              👑
            </motion.div>

            <motion.div
              className="font-display text-4xl text-center"
              style={{ color: "hsl(45 100% 65%)" }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              Tier {tier}
            </motion.div>

            <motion.div
              className="font-display text-base text-foreground tracking-widest uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.05 }}
            >
              Level {milestoneLevel} reached
            </motion.div>

            <motion.div
              className="mt-1 inline-flex items-center gap-2 rounded-full border-2 border-yellow-400/50 bg-yellow-400/10 px-4 py-1.5 font-display text-sm"
              style={{ color: "hsl(45 100% 70%)" }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, type: "spring", damping: 12 }}
            >
              💰 Permanent +{totalBonusPct}% coin bonus
            </motion.div>

            <motion.div
              className="text-xs font-body text-muted-foreground italic text-center max-w-[260px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              Every 100 levels grants another +5% to all coin rewards. Forever.
            </motion.div>

            <motion.div
              className="mt-2 text-[10px] text-muted-foreground/60 font-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.7 }}
            >
              Tap anywhere to continue
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
