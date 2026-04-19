import { motion } from "framer-motion";
import { getLevelProgress } from "@/data/levels";

interface LevelProgressBarProps {
  xp: number;
  level: number;
}

export function LevelProgressBar({ xp, level }: LevelProgressBarProps) {
  const { current, next, progress, xpInLevel, xpNeeded } = getLevelProgress(xp);

  return (
    <div className="w-full max-w-md flex items-center gap-2" role="region" aria-label="Level progress">
      {/* Level badge */}
      <div className="pill-gold flex flex-col items-center justify-center w-12 h-12 rounded-full leading-none shrink-0">
        <span className="text-[8px] font-body font-bold tracking-wider">LV</span>
        <span className="font-display text-lg">{current.id}</span>
      </div>

      {/* Bar */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-display text-xs text-wood-dark">
            <span aria-hidden="true">{current.emoji}</span> {current.name}
          </span>
          {next ? (
            <span className="text-[10px] font-display text-wood-dark/80">
              {xpInLevel}/{xpNeeded}
            </span>
          ) : (
            <span className="text-[10px] font-display text-candy-red">MAX ✨</span>
          )}
        </div>

        <div
          className="relative h-4 rounded-full bg-wood border-[3px] border-wood-dark overflow-hidden shadow-chunky-sm"
          role="progressbar"
          aria-valuenow={next ? xpInLevel : xpNeeded}
          aria-valuemin={0}
          aria-valuemax={next ? xpNeeded : xpNeeded}
          aria-label={next ? `Level ${current.id} progress: ${xpInLevel} of ${xpNeeded} XP` : `Maximum level reached`}
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: `linear-gradient(180deg, hsl(48 100% 72%), hsl(var(--gold)) 55%, hsl(var(--gold-deep)))`,
              boxShadow: `inset 0 2px 0 hsl(50 100% 85% / 0.7)`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
