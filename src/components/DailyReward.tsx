import { forwardRef, useEffect, useState } from "react";
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
  currentDay?: number;
  /** Milliseconds until the next claim is available (0 when claimable now). */
  nextClaimMs?: number;
}

const DAILY_REWARDS = [25, 50, 100, 175, 275, 400, 750];

function fmt(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const DailyReward = forwardRef<HTMLDivElement, DailyRewardProps>(function DailyReward(
  { open, streak, reward, onClaim, onDismiss, alreadyClaimed, currentDay, nextClaimMs = 0 },
  _ref,
) {
  // Tick once a second so the countdown reads live.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!open || !alreadyClaimed) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [open, alreadyClaimed]);
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
                const isCurrent = (currentDay ?? (streak % 7 || 7)) === dayNum;
                const isPast = !alreadyClaimed
                  ? dayNum < (streak % 7 || 7)
                  : dayNum <= (streak % 7 || 7);

                return (
                  <div
                    key={i}
                    role="listitem"
                    aria-label={`Day ${dayNum}: ${amount} coins${isCurrent && !alreadyClaimed ? " (today)" : isPast ? " (claimed)" : ""}`}
                    className={`flex flex-col items-center rounded-lg border px-1 py-2 text-xs transition-all ${
                      isCurrent
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
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm text-muted-foreground font-body">
                  Already claimed! Next reward in
                </p>
                <p
                  className="font-display text-2xl tabular-nums text-accent"
                  role="timer"
                  aria-live="polite"
                  aria-label={`Next daily reward in ${fmt(nextClaimMs)}`}
                >
                  {fmt(nextClaimMs)}
                </p>
              </div>
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
});
