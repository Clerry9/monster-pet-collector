import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LevelTheme } from "@/data/levels";
import { sfxLevelUp } from "@/lib/sfx";

interface LevelUpCelebrationProps {
  level: LevelTheme | null;
  onComplete: () => void;
  rolls?: number;
}

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

export function LevelUpCelebration({ level, onComplete, rolls }: LevelUpCelebrationProps) {
  const [confetti] = useState(() => generateConfetti(60));

  useEffect(() => {
    if (!level) return;
    sfxLevelUp();
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [level, onComplete]);

  return (
    <AnimatePresence>
      {level && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onComplete}
          role="dialog"
          aria-label={`Level ${level.id} ${level.name} reached`}
        >
          {/* Full-screen themed splash background */}
          <motion.div
            className={`absolute inset-0 bg-gradient-to-br ${level.bgGradient}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ backgroundColor: "hsl(var(--background))" }}
          />
          <div className="absolute inset-0 bg-background/85" />

          {/* Curtain wipe in */}
          <motion.div
            className="absolute inset-0 origin-top"
            style={{ background: `linear-gradient(180deg, hsl(${level.accentColor} / 0.35), transparent 60%)` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />

          {/* Radial glow */}
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 50% 50%, hsl(${level.accentColor} / 0.35), transparent 60%)` }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0.7], scale: [0.5, 1.2, 1] }}
            transition={{ duration: 1.2 }}
          />

          {/* Sun rays */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={`ray-${i}`}
              className="absolute top-1/2 left-1/2 origin-left"
              style={{
                width: "60vmax",
                height: "8px",
                background: `linear-gradient(90deg, hsl(${level.accentColor} / 0.5), transparent)`,
                transform: `rotate(${i * 30}deg)`,
              }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: [0, 0.6, 0.3], scaleX: 1 }}
              transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
            />
          ))}

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
              transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
            />
          ))}

          {/* Center card */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-4 px-10 py-8 rounded-3xl border-2 border-primary/30 bg-card/95 backdrop-blur-md shadow-2xl mx-6"
            initial={{ scale: 0.3, opacity: 0, y: 60 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: -30 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
          >
            <motion.div
              className="absolute inset-0 rounded-3xl"
              style={{ boxShadow: `0 0 60px hsl(${level.accentColor} / 0.5), 0 0 120px hsl(${level.accentColor} / 0.25)` }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />

            <motion.div
              className="font-display text-xs tracking-[0.4em] text-muted-foreground uppercase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Now Entering
            </motion.div>

            <motion.span
              className="text-7xl drop-shadow-lg"
              animate={{ scale: [1, 1.3, 1], rotate: [0, 12, -12, 0] }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              {level.emoji}
            </motion.span>

            <motion.div
              className="font-display text-3xl text-foreground text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{ color: `hsl(${level.accentColor})` }}
            >
              {level.name}
            </motion.div>

            <motion.div
              className="font-display text-base text-accent tracking-widest uppercase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
            >
              Level {level.id}
            </motion.div>

            <motion.div
              className="text-sm font-body text-muted-foreground italic text-center max-w-[260px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              {level.tileBonus}
            </motion.div>

            {typeof rolls === "number" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.05, type: "spring", damping: 14 }}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full border-2 border-primary/40 bg-primary/10 px-3 py-1 font-display text-xs text-foreground"
              >
                🎲 You still have <span className="text-accent font-bold">{rolls}</span> rolls
              </motion.div>
            )}

            <motion.div
              className="mt-2 text-[10px] text-muted-foreground/60 font-body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              Tap anywhere to continue
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
