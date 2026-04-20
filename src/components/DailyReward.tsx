import { motion, AnimatePresence } from "framer-motion";
import { Gift, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DailyRewardProps {
  open: boolean;
  streak: number;
  reward: number;
  onClaim: () => void;
  onDismiss: () => void;
  alreadyClaimed: boolean;
}

const DAILY_REWARDS = [25, 50, 100, 175, 275, 400, 750];

export function DailyReward({ open, streak, reward, onClaim, onDismiss, alreadyClaimed }: DailyRewardProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
        role="dialog"
        aria-modal="true"
        aria-label="Daily reward"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6"
        >
          <button
            onClick={onDismiss}
            aria-label="Close daily reward"
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center gap-4 text-center">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
              aria-hidden="true"
            >
              <Gift className="h-16 w-16 text-accent" />
            </motion.div>

            <h2 className="font-display text-2xl text-foreground text-glow-green">
              Daily Reward!
            </h2>

            <div className="flex items-center gap-2 text-accent">
              <Flame className="h-5 w-5 text-destructive" aria-hidden="true" />
              <span className="font-body text-lg font-bold">
                {streak} day streak!
              </span>
            </div>

            {/* 7-day reward track */}
            <div className="grid w-full grid-cols-7 gap-1" role="list" aria-label="7-day reward track">
              {DAILY_REWARDS.map((amount, i) => {
                const dayNum = i + 1;
                const isCurrent = (streak % 7 || 7) === dayNum;
                const isPast = !alreadyClaimed
                  ? dayNum < (streak % 7 || 7)
                  : dayNum <= (streak % 7 || 7);

                return (
                  <div
                    key={i}
                    role="listitem"
                    aria-label={`Day ${dayNum}: ${amount} coins${isCurrent && !alreadyClaimed ? " (today)" : isPast ? " (claimed)" : ""}`}
                    className={`flex flex-col items-center rounded-lg border px-1 py-2 text-xs transition-all ${
                      isCurrent && !alreadyClaimed
                        ? "border-primary bg-primary/20 box-glow-green"
                        : isPast
                        ? "border-muted bg-muted/50 opacity-50"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="font-bold text-muted-foreground">D{dayNum}</span>
                    <span className="text-2xl" aria-hidden="true">🪙</span>
                    <span className="font-extrabold text-accent">{amount}</span>
                  </div>
                );
              })}
            </div>

            {alreadyClaimed ? (
              <p className="text-sm text-muted-foreground font-body">
                Already claimed today! Come back tomorrow 🎉
              </p>
            ) : (
              <>
                <p className="text-lg font-body">
                  Collect <span className="font-extrabold text-accent">{reward}</span> <span aria-hidden="true">🪙</span><span className="sr-only">coins</span> today!
                </p>
                <Button
                  onClick={onClaim}
                  className="w-full bg-primary text-primary-foreground font-bold text-lg py-6 box-glow-green hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Claim Reward!
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
