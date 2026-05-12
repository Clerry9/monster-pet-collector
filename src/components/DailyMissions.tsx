import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Gift, Loader2 } from "lucide-react";
import { useDailyMissions } from "@/hooks/useDailyMissions";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
}

const REWARD_EMOJI: Record<string, string> = {
  coins: "🪙",
  rolls: "🎲",
  energy: "⚡",
};

export function DailyMissionsModal({ open, onClose }: Props) {
  const { list, loading, claim, claimingCode } = useDailyMissions();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Daily missions"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-card border-4 border-wood-dark shadow-chunky p-5"
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl flex items-center gap-2">
                <Target size={18} /> Daily Missions
              </h2>
              <button
                onClick={onClose}
                aria-label="Close daily missions"
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              3 fresh missions every day. Complete them and tap Claim to grab the reward.
            </p>

            {loading && <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>}

            <div className="space-y-3">
              {list.map((m) => {
                const pct = Math.min(100, Math.round((m.progress / Math.max(1, m.target)) * 100));
                const completed = m.progress >= m.target;
                const claimed = !!m.claimed_at;
                const emoji = REWARD_EMOJI[m.reward_kind ?? ""] ?? "🎁";
                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border-2 p-3 ${
                      claimed
                        ? "border-wood-dark/30 bg-muted/40 opacity-70"
                        : completed
                          ? "border-gold bg-gold/10"
                          : "border-wood-dark/40 bg-background"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{m.title ?? m.code}</div>
                        <div className="text-[11px] text-muted-foreground">{m.description}</div>
                      </div>
                      <div className="text-[11px] font-display whitespace-nowrap flex items-center gap-1">
                        <span aria-hidden>{emoji}</span>
                        +{m.reward_amount ?? 0}
                      </div>
                    </div>
                    <Progress value={pct} className="h-2 my-1.5" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {Math.min(m.progress, m.target)}/{m.target}
                      </span>
                      <Button
                        size="sm"
                        variant={claimed ? "ghost" : completed ? "default" : "outline"}
                        disabled={!completed || claimed || claimingCode === m.code}
                        onClick={() => claim(m.code)}
                        className="h-7 text-xs"
                      >
                        {claimingCode === m.code ? (
                          <Loader2 size={12} className="mr-1 animate-spin" />
                        ) : (
                          <Gift size={12} className="mr-1" />
                        )}
                        {claimed
                          ? "Claimed"
                          : claimingCode === m.code
                            ? "Claiming…"
                            : completed
                              ? "Claim"
                              : "In progress"}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!loading && list.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">
                  No missions today — check back tomorrow!
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface LauncherProps {
  onClick: () => void;
  unclaimedCount?: number;
  className?: string;
}

export function DailyMissionsLauncher({ onClick, unclaimedCount = 0, className = "" }: LauncherProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Daily missions${unclaimedCount > 0 ? `, ${unclaimedCount} ready to claim` : ""}`}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-wood-dark bg-card hover:bg-muted transition ${className}`}
    >
      <Target size={16} aria-hidden="true" />
      {unclaimedCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-wood-dark text-[10px] font-bold flex items-center justify-center">
          {unclaimedCount}
        </span>
      )}
    </button>
  );
}
