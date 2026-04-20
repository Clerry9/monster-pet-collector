import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { getLevelProgress, getPrestigeTier, getPrestigeCoinMultiplier } from "@/data/levels";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LevelProgressBarProps {
  xp: number;
  level: number;
}

export function LevelProgressBar({ xp, level }: LevelProgressBarProps) {
  const { current, next, progress, xpInLevel, xpNeeded } = getLevelProgress(xp);
  const prestigeTier = getPrestigeTier(current.id);
  const coinMult = getPrestigeCoinMultiplier(current.id);
  const bonusPct = Math.round((coinMult - 1) * 100);

  return (
    <div className="w-full max-w-md flex items-center gap-2" role="region" aria-label="Level progress">
      {/* Level badge with optional prestige crown */}
      <div className="relative shrink-0">
        <div className="pill-gold flex flex-col items-center justify-center w-12 h-12 rounded-full leading-none">
          <span className="text-[8px] font-body font-bold tracking-wider">LV</span>
          <span className="font-display text-lg">{current.id}</span>
        </div>
        {prestigeTier > 0 && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 border-2 border-wood-dark flex items-center justify-center shadow-chunky-sm cursor-help"
                  aria-label={`Prestige tier ${prestigeTier}, +${bonusPct}% coin bonus`}
                >
                  <Crown className="w-3 h-3 text-wood-dark" strokeWidth={3} />
                  <span className="absolute -bottom-1 -right-1 text-[8px] font-display font-bold text-wood-dark bg-cream-light rounded-full w-3.5 h-3.5 flex items-center justify-center border border-wood-dark leading-none">
                    {prestigeTier}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <div className="space-y-1">
                  <div className="font-bold">👑 Prestige Tier {prestigeTier}</div>
                  <div className="text-xs">Permanent <span className="text-amber-500 font-bold">+{bonusPct}% coin bonus</span> on every roll.</div>
                  <div className="text-[10px] opacity-70">Earn another tier every 100 levels.</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
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
