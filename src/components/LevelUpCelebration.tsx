import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LevelTheme } from "@/data/levels";
import { sfxLevelUp } from "@/lib/sfx";

interface LevelUpCelebrationProps {
  level: LevelTheme | null;
  onComplete: () => void;
}

// Generate confetti particles
function generateConfetti(count: number) {
  const colors = [
    "hsl(45, 93%, 47%)",
    "hsl(142, 71%, 45%)",
    "hsl(271, 76%, 53%)",
    "hsl(199, 89%, 48%)",
    "hsl(25, 95%, 53%)",
    "hsl(50, 100%, 64%)",
    "hsl(0, 0%, 100%)",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.5 + Math.random() * 1.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
    drift: (Math.random() - 0.5) * 60,
    shape: Math.random() > 0.5 ? "circle" : "rect",
  }));
}

export function LevelUpCelebration({ level, onComplete }: LevelUpCelebrationProps) {
  const [confetti] = useState(() => generateConfetti(50));

  useEffect(() => {
    if (!level) return;
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [level, onComplete]);

  return (
    <AnimatePresence>
      {level && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onComplete}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Confetti */}
          {confetti.map((p) => (
            <motion.div
              key={p.id}
              className="absolute top-0"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.shape === "rect" ? p.size * 1.5 : p.size,
                backgroundColor: p.color,
                borderRadius: p.shape === "circle" ? "50%" : "2px",
              }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{
                y: "110vh",
                opacity: [1, 1, 0],
                rotate: p.rotation + 720,
                x: p.drift,
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeIn",
              }}
            />
          ))}

          {/* Center card */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-3 px-8 py-6 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-2xl"
            initial={{ scale: 0.3, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: -30 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
          >
            {/* Glow ring */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                boxShadow: `0 0 40px hsl(${level.accentColor} / 0.4), 0 0 80px hsl(${level.accentColor} / 0.2)`,
              }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />

            <motion.span
              className="text-5xl"
              animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {level.emoji}
            </motion.span>

            <motion.div
              className="font-display text-lg text-accent tracking-wide uppercase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Level Up!
            </motion.div>

            <motion.div
              className="font-display text-2xl text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{ color: `hsl(${level.accentColor})` }}
            >
              Lv.{level.id} {level.name}
            </motion.div>

            <motion.div
              className="text-xs font-body text-muted-foreground italic text-center max-w-[200px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {level.tileBonus}
            </motion.div>

            <motion.div
              className="mt-1 text-[10px] text-muted-foreground/60 font-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Tap to continue
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
