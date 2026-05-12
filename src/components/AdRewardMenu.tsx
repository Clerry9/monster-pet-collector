import { motion, AnimatePresence } from "framer-motion";
import { Gift, Coins, Zap, Dice5, Sparkles, X, Play, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AD_REWARDS, AdRewardKind, formatCooldown, useAdRewards } from "@/hooks/useAdRewards";

function iconFor(kind: AdRewardKind) {
  switch (kind) {
    case "energy_50":     return <Zap size={28} className="text-yellow-300" />;
    case "coins_200":     return <Coins size={28} className="text-amber-400" />;
    case "roulette_spin": return <Sparkles size={28} className="text-fuchsia-300" />;
    case "card_pack":     return <Dice5 size={28} className="text-blue-300" />;
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

export function AdRewardMenu({ open, onClose, onChanged }: Props) {
  const ads = useAdRewards(onChanged);

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative bg-gradient-to-b from-card to-background border-2 border-primary/40 rounded-2xl p-5 max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent mb-2 shadow-lg">
              <Gift className="text-primary-foreground" size={28} />
            </div>
            <h2 className="text-2xl font-bold font-display">Free Rewards</h2>
            <p className="text-xs text-muted-foreground">
              Watch a short ad to claim — completely optional.
            </p>
          </div>

          <div className="grid gap-2.5">
            {AD_REWARDS.map((cfg) => {
              const cd = ads.cooldownLeft(cfg);
              const left = cfg.dailyCap - ads.todayCount(cfg.kind);
              const ready = ads.canClaim(cfg);
              const isBusy = ads.busy === cfg.kind;
              const capped = left <= 0;
              return (
                <div
                  key={cfg.kind}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    ready
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card/40 opacity-80"
                  }`}
                >
                  <div className="shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    {iconFor(cfg.kind)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold font-display">{cfg.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {cfg.description}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {capped
                        ? `Daily limit reached (${cfg.dailyCap}/day)`
                        : cd > 0
                        ? `Next in ${formatCooldown(cd)}`
                        : `${left} of ${cfg.dailyCap} left today`}
                    </div>
                  </div>
                  <button
                    onClick={() => ads.watchAndClaim(cfg.kind)}
                    disabled={!ready || isBusy}
                    className="shrink-0 px-3 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.03] active:scale-[0.97] transition-transform shadow"
                  >
                    {isBusy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Play size={14} fill="currentColor" />
                    )}
                    {isBusy ? "Watching" : "Watch"}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-card/60"
          >
            No thanks
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Pulsing button for TopHud / nav. */
export function AdRewardLauncher({ onOpen }: { onOpen: () => void }) {
  const ads = useAdRewards();
  const [pulse, setPulse] = useState(false);
  useEffect(() => { setPulse(ads.anyAvailable); }, [ads.anyAvailable]);
  return (
    <button
      onClick={onOpen}
      aria-label="Free rewards"
      className={`relative w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform ${
        pulse ? "ring-2 ring-primary/60 animate-pulse" : ""
      }`}
    >
      <Gift size={18} />
      {pulse && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 border-2 border-background" />
      )}
    </button>
  );
}