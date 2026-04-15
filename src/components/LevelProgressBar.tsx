import { motion } from "framer-motion";
import { getLevelProgress } from "@/data/levels";

interface LevelProgressBarProps {
  xp: number;
  level: number;
}

export function LevelProgressBar({ xp, level }: LevelProgressBarProps) {
  const { current, next, progress, xpInLevel, xpNeeded } = getLevelProgress(xp);

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{current.emoji}</span>
          <span className="font-display text-xs text-foreground">
            Lv.{current.id} {current.name}
          </span>
        </div>
        {next && (
          <span className="text-[10px] text-muted-foreground font-body">
            {xpInLevel}/{xpNeeded} XP
          </span>
        )}
        {!next && (
          <span className="text-[10px] text-accent font-body font-bold">MAX LEVEL ✨</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-3 rounded-full bg-card border border-border overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, hsl(${current.accentColor}), hsl(${current.accentColor} / 0.6))`,
            boxShadow: `0 0 8px hsl(${current.accentColor} / 0.4)`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Theme bonus */}
      <div className="mt-1 flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground font-body italic">
          {current.tileBonus}
        </span>
        {next && (
          <span className="text-[10px] text-muted-foreground/50 font-body">
            • Next: {next.emoji} {next.name}
          </span>
        )}
      </div>
    </div>
  );
}
