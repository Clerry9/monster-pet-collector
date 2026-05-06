import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { sfxDiceTick, sfxCoinGain, sfxLevelUp } from "@/lib/sfx";

export type IslandRewardKind =
  | "coins_small"
  | "coins_med"
  | "coins_jackpot"
  | "rolls"
  | "card_flip"
  | "island_star"
  | "monster_food";

export interface IslandReward {
  kind: IslandRewardKind;
  amount: number;
  emoji: string;
  label: string;
}

const POOL: { weight: number; build: () => IslandReward }[] = [
  { weight: 35, build: () => ({ kind: "coins_small", amount: 50 + Math.floor(Math.random() * 100), emoji: "🪙", label: "Coins" }) },
  { weight: 22, build: () => ({ kind: "coins_med", amount: 200 + Math.floor(Math.random() * 300), emoji: "💰", label: "Coin Stash" }) },
  { weight: 14, build: () => ({ kind: "rolls", amount: 3 + Math.floor(Math.random() * 8), emoji: "⚡", label: "Free Rolls" }) },
  { weight: 10, build: () => ({ kind: "monster_food", amount: 25 + Math.floor(Math.random() * 50), emoji: "🍖", label: "Monster Food" }) },
  { weight: 8,  build: () => ({ kind: "card_flip", amount: 1, emoji: "🃏", label: "Free Card Flip" }) },
  { weight: 8,  build: () => ({ kind: "island_star", amount: 1, emoji: "⭐", label: "Island Star" }) },
  { weight: 3,  build: () => ({ kind: "coins_jackpot", amount: 1000 + Math.floor(Math.random() * 2000), emoji: "💎", label: "JACKPOT!" }) },
];

function pickReward(): IslandReward {
  const total = POOL.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of POOL) {
    r -= p.weight;
    if (r <= 0) return p.build();
  }
  return POOL[0].build();
}

const STRIP = POOL.flatMap((p) => Array.from({ length: p.weight > 10 ? 3 : 2 }, () => p.build()));

interface Props {
  open: boolean;
  onClaim: (r: IslandReward) => void;
  onClose: () => void;
}

export function IslandRewardRoulette({ open, onClaim, onClose }: Props) {
  const [phase, setPhase] = useState<"spin" | "result">("spin");
  const reward = useMemo(() => (open ? pickReward() : null), [open]);
  const [tickIdx, setTickIdx] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("spin");
    setTickIdx(0);
    let i = 0;
    let interval = 60;
    const step = () => {
      sfxDiceTick();
      setTickIdx((n) => n + 1);
      i++;
      // Slow down progressively
      interval = i < 12 ? 70 : i < 18 ? 130 : i < 22 ? 220 : 320;
      if (i >= 24) {
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
        setPhase("result");
        if (reward?.kind === "coins_jackpot") sfxLevelUp(); else sfxCoinGain();
        if (navigator.vibrate) navigator.vibrate([20, 30, 60]);
        return;
      }
      tickRef.current = setTimeout(step, interval) as unknown as ReturnType<typeof setInterval>;
    };
    tickRef.current = setTimeout(step, interval) as unknown as ReturnType<typeof setInterval>;
    return () => {
      if (tickRef.current) { clearTimeout(tickRef.current as unknown as number); tickRef.current = null; }
    };
  }, [open, reward]);

  if (!open || !reward) return null;

  const visible = STRIP[tickIdx % STRIP.length];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.7, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.7, y: 30 }}
          transition={{ type: "spring", damping: 16 }}
          className="panel-wood relative w-full max-w-sm p-5 text-center"
          style={{ background: "radial-gradient(ellipse at top, hsl(var(--gold) / 0.45), hsl(var(--wood)))" }}
        >
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 icon-tile-gold w-8 h-8 flex items-center justify-center"
            aria-label="Close reward"
          >
            <X size={16} />
          </button>

          <div className="flex items-center justify-center gap-2 mb-2 text-cream-light">
            <Sparkles size={16} className="text-gold" />
            <h2 className="font-display text-base tracking-wide">ISLAND REWARD!</h2>
            <Sparkles size={16} className="text-gold" />
          </div>
          <p className="text-[11px] font-display text-cream/80 mb-3">
            {phase === "spin" ? "Spinning the wheel of fortune..." : "You won a prize!"}
          </p>

          <div className="relative mx-auto h-32 w-32 rounded-2xl border-4 border-gold bg-cream/95 shadow-chunky-sm flex items-center justify-center overflow-hidden">
            {/* glow ring */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: "inset 0 0 24px hsl(var(--gold) / 0.6)" }} aria-hidden />
            <AnimatePresence mode="wait">
              {phase === "spin" ? (
                <motion.div
                  key={tickIdx}
                  initial={{ y: 28, opacity: 0, scale: 0.7 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -28, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.12 }}
                  className="text-6xl"
                >
                  {visible.emoji}
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ scale: 0.4, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 9 }}
                  className="text-7xl drop-shadow-[0_4px_0_hsl(var(--wood-dark))]"
                >
                  {reward.emoji}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4 min-h-[3rem]">
            {phase === "result" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
              >
                <div className="font-display text-lg text-cream-light">
                  {reward.label}
                </div>
                <div className="font-display text-2xl text-gold drop-shadow-[0_2px_0_hsl(var(--wood-dark))]">
                  +{reward.amount} {reward.emoji}
                </div>
              </motion.div>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={phase !== "result"}
            onClick={() => onClaim(reward)}
            className="btn-press mt-4 w-full py-2.5 rounded-full font-display text-base disabled:opacity-50"
          >
            {phase === "result" ? "CLAIM REWARD" : "..."}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
