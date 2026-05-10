import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Coins, Clock } from "lucide-react";
import { sfxDiceTick, sfxCoinGain, sfxLevelUp } from "@/lib/sfx";
import { drawRandomCard, GameCard } from "@/data/cards";

const STORAGE_KEY = "luckyRoulette.lastFreeSpinAt.v1";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const PAID_SPIN_COST = 100;

export type LuckyRouletteRewardKind =
  | "coins"
  | "coins_jackpot"
  | "rolls"
  | "card_flip"
  | "free_card"
  | "island_star"
  | "season_xp"
  | "double_coins";

export interface LuckyRouletteReward {
  kind: LuckyRouletteRewardKind;
  amount: number;
  emoji: string;
  label: string;
  card?: GameCard;
}

const POOL: { weight: number; build: () => LuckyRouletteReward }[] = [
  { weight: 30, build: () => ({ kind: "coins", amount: 100 + Math.floor(Math.random() * 200), emoji: "🪙", label: "Coins" }) },
  { weight: 18, build: () => ({ kind: "coins", amount: 300 + Math.floor(Math.random() * 400), emoji: "💰", label: "Coin Stash" }) },
  { weight: 14, build: () => ({ kind: "rolls", amount: 3 + Math.floor(Math.random() * 6), emoji: "⚡", label: "Free Rolls" }) },
  { weight: 10, build: () => ({ kind: "season_xp", amount: 5 + Math.floor(Math.random() * 10), emoji: "🌟", label: "Season XP" }) },
  { weight: 8,  build: () => ({ kind: "card_flip", amount: 1, emoji: "🃏", label: "Free Card Flip" }) },
  { weight: 7,  build: () => ({ kind: "island_star", amount: 1, emoji: "⭐", label: "Island Star" }) },
  { weight: 6,  build: () => ({ kind: "double_coins", amount: 500, emoji: "✨", label: "2× Coin Bonus" }) },
  { weight: 5,  build: () => {
      const card = drawRandomCard();
      return { kind: "free_card", amount: 1, emoji: "🎴", label: `Card: ${card.name}`, card };
    } },
  { weight: 2,  build: () => ({ kind: "coins_jackpot", amount: 1500 + Math.floor(Math.random() * 2500), emoji: "💎", label: "JACKPOT!" }) },
];

function pickReward(): LuckyRouletteReward {
  const total = POOL.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of POOL) {
    r -= p.weight;
    if (r <= 0) return p.build();
  }
  return POOL[0].build();
}

const STRIP = POOL.flatMap((p) => Array.from({ length: p.weight > 10 ? 3 : 2 }, () => p.build()));

function readLastFreeSpin(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch { return 0; }
}
function writeLastFreeSpin(ts: number) {
  try { localStorage.setItem(STORAGE_KEY, String(ts)); } catch { /* ignore */ }
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  open: boolean;
  coins: number;
  onClose: () => void;
  onClaim: (r: LuckyRouletteReward, paid: boolean) => void;
  onSpendCoins: (amount: number) => boolean;
}

type Phase = "idle" | "spin" | "result";

export function LuckyRouletteModal({ open, coins, onClose, onClaim, onSpendCoins }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reward, setReward] = useState<LuckyRouletteReward | null>(null);
  const [tickIdx, setTickIdx] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [lastFree, setLastFree] = useState(() => readLastFreeSpin());
  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("idle");
    setReward(null);
    setLastFree(readLastFreeSpin());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    // Focus management — focus the primary action when opening
    const t = window.setTimeout(() => spinBtnRef.current?.focus(), 50);
    return () => { window.clearInterval(id); window.clearTimeout(t); };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const remainingMs = Math.max(0, lastFree + COOLDOWN_MS - now);
  const freeAvailable = remainingMs <= 0;

  const startSpin = (paid: boolean) => {
    if (phase === "spin") return;
    if (paid) {
      if (!onSpendCoins(PAID_SPIN_COST)) return;
    } else {
      if (!freeAvailable) return;
      const ts = Date.now();
      writeLastFreeSpin(ts);
      setLastFree(ts);
    }
    const r = pickReward();
    setReward(r);
    setPhase("spin");
    setTickIdx(0);
    let i = 0;
    let interval = 70;
    const step = () => {
      sfxDiceTick();
      setTickIdx((n) => n + 1);
      i++;
      interval = i < 12 ? 70 : i < 18 ? 130 : i < 22 ? 220 : 320;
      if (i >= 24) {
        if (tickRef.current) { clearTimeout(tickRef.current); tickRef.current = null; }
        setPhase("result");
        if (r.kind === "coins_jackpot") sfxLevelUp(); else sfxCoinGain();
        if (navigator.vibrate) navigator.vibrate([20, 30, 60]);
        return;
      }
      tickRef.current = setTimeout(step, interval);
    };
    tickRef.current = setTimeout(step, interval);
  };

  const handleClaim = () => {
    if (!reward) return;
    const paid = !freeAvailable; // we burned the free spin if it was available
    onClaim(reward, paid && phase === "result" ? true : false);
    setPhase("idle");
    setReward(null);
  };

  if (!open) return null;

  const visible = STRIP[tickIdx % STRIP.length];
  const canPaid = coins >= PAID_SPIN_COST;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lucky-roulette-title"
      >
        <motion.div
          initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.7, y: 30 }}
          transition={{ type: "spring", damping: 16 }}
          className="panel-wood relative w-full max-w-sm p-5 text-center"
          style={{ background: "radial-gradient(ellipse at top, hsl(var(--gold) / 0.45), hsl(var(--wood)))" }}
        >
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 icon-tile-gold w-8 h-8 flex items-center justify-center"
            aria-label="Close roulette"
          >
            <X size={16} />
          </button>

          <div className="flex items-center justify-center gap-2 mb-2 text-cream-light">
            <Sparkles size={16} className="text-gold" aria-hidden />
            <h2 id="lucky-roulette-title" className="font-display text-base tracking-wide">LUCKY ROULETTE</h2>
            <Sparkles size={16} className="text-gold" aria-hidden />
          </div>
          <p className="text-[11px] font-display text-cream/80 mb-3">
            {phase === "result" ? "You won a prize!" : phase === "spin" ? "Spinning..." : "1 free spin every 24 hours"}
          </p>

          <div
            className="relative mx-auto h-32 w-32 rounded-2xl border-4 border-gold bg-cream/95 shadow-chunky-sm flex items-center justify-center overflow-hidden"
            role="status"
            aria-live="polite"
            aria-label={phase === "result" && reward ? `Won ${reward.amount} ${reward.label}` : phase === "spin" ? "Spinning roulette" : "Roulette ready"}
          >
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
                  aria-hidden
                >
                  {visible.emoji}
                </motion.div>
              ) : phase === "result" && reward ? (
                <motion.div
                  key="result"
                  initial={{ scale: 0.4, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 9 }}
                  className="text-7xl drop-shadow-[0_4px_0_hsl(var(--wood-dark))]"
                  aria-hidden
                >
                  {reward.emoji}
                </motion.div>
              ) : (
                <motion.div key="idle" className="text-6xl" aria-hidden>🎰</motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4 min-h-[3rem]">
            {phase === "result" && reward && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                <div className="font-display text-lg text-cream-light">{reward.label}</div>
                <div className="font-display text-2xl text-gold drop-shadow-[0_2px_0_hsl(var(--wood-dark))]">
                  +{reward.amount} {reward.emoji}
                </div>
              </motion.div>
            )}
          </div>

          {phase === "result" ? (
            <button
              ref={spinBtnRef}
              onClick={handleClaim}
              className="btn-press mt-4 w-full py-2.5 rounded-full font-display text-base"
              autoFocus
            >
              CLAIM REWARD
            </button>
          ) : (
            <div className="mt-4 space-y-2">
              <button
                ref={spinBtnRef}
                onClick={() => startSpin(false)}
                disabled={!freeAvailable || phase === "spin"}
                className="btn-press w-full py-2.5 rounded-full font-display text-base disabled:opacity-50 flex items-center justify-center gap-2"
                aria-label={freeAvailable ? "Spin for free" : `Free spin in ${fmt(remainingMs)}`}
              >
                {freeAvailable ? (
                  <>🎰 FREE SPIN</>
                ) : (
                  <><Clock size={14} aria-hidden /> Free in {fmt(remainingMs)}</>
                )}
              </button>
              <button
                onClick={() => startSpin(true)}
                disabled={!canPaid || phase === "spin"}
                className="w-full py-2 rounded-full font-display text-[12px] border-2 border-gold bg-wood-dark text-cream-light disabled:opacity-40 hover:bg-wood-dark/80 flex items-center justify-center gap-2"
                aria-label={`Extra spin for ${PAID_SPIN_COST} coins`}
                title={!canPaid ? `Need ${PAID_SPIN_COST} coins` : `Spend ${PAID_SPIN_COST} coins`}
              >
                <Coins size={14} aria-hidden /> EXTRA SPIN — {PAID_SPIN_COST}
              </button>
              <p className="text-[10px] font-display text-cream/70">
                Win coins, rolls, cards, season XP, and island prizes!
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
