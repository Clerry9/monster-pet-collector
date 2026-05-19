import { motion, AnimatePresence } from "framer-motion";
import { Coins, Dice5, Zap, Flame, X } from "lucide-react";
import { useDailyStreak } from "@/hooks/useDailyStreak";
import { toast } from "sonner";

const LADDER = Array.from({ length: 14 }, (_, i) => {
  const day = i + 1;
  const coins = 50 + Math.min(day, 30) * 10;
  const rolls = day % 3 === 0 ? 2 : 0;
  const energy = day % 7 === 0 ? 50 : 0;
  return { day, coins, rolls, energy };
});

function formatMs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

interface Props {
  onRewardGranted?: () => void;
}

export function DailyStreakModal({ onRewardGranted }: Props) {
  const { open, setOpen, row, claim, loading, canClaimToday, nextClaimMs, currentDay } = useDailyStreak();

  if (!open || !row) return null;

  const handleClaim = async () => {
    const r = await claim();
    if (!r) return;
    if (r.already_claimed) {
      toast("Already claimed today", { description: "Come back tomorrow." });
    } else {
      const parts = [
        r.reward_coins ? `+${r.reward_coins} coins` : null,
        r.reward_rolls ? `+${r.reward_rolls} rolls` : null,
        r.reward_energy ? `+${r.reward_energy} energy` : null,
      ].filter(Boolean);
      toast.success(`Day ${r.current_streak} streak!`, {
        description: parts.join(" · "),
      });
      onRewardGranted?.();
    }
    setOpen(false);
  };

  const today = (row.current_streak || 0) + (canClaimToday ? 1 : 0);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative bg-gradient-to-b from-card to-background border-2 border-primary/40 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
            aria-label="Close daily streak"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-rose-600 mb-2 shadow-lg">
              <Flame className="text-white" size={32} />
            </div>
            <h2 className="text-2xl font-bold font-display">Daily Streak</h2>
            <p className="text-sm text-muted-foreground">
              {canClaimToday
                ? `Claim your day ${today} reward!`
                : `Next reward in ${formatMs(nextClaimMs)} · best streak: ${row.best_streak} days`}
            </p>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {LADDER.slice(0, 7).map((d) => {
              const claimed = d.day < today;
              const current = d.day === currentDay;
              return (
                <div
                  key={d.day}
                  aria-label={`Day ${d.day}${current ? ", current day" : ""}: ${d.coins} coins${d.rolls ? ` and ${d.rolls} rolls` : ""}${d.energy ? ` and ${d.energy} energy` : ""}`}
                  className={`relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-1 ${
                    current
                      ? "border-primary bg-primary/20 ring-2 ring-primary/50 animate-pulse"
                      : claimed
                      ? "border-primary/30 bg-primary/5 opacity-60"
                      : "border-border bg-card/30"
                  }`}
                >
                  <div className="text-[10px] text-muted-foreground">D{d.day}</div>
                  {d.energy > 0 ? (
                    <Zap size={14} className="text-yellow-400" />
                  ) : d.rolls > 0 ? (
                    <Dice5 size={14} className="text-blue-400" />
                  ) : (
                    <Coins size={14} className="text-amber-400" />
                  )}
                  <div className="text-[9px] font-bold">{d.coins}</div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleClaim}
            disabled={loading || !canClaimToday}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={canClaimToday ? `Claim day ${today} daily streak reward` : `Daily streak already claimed. Next reward in ${formatMs(nextClaimMs)}`}
          >
            {loading ? "Claiming..." : canClaimToday ? "Claim Reward" : "Already claimed today"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}