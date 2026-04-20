import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Flame, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  coins: number;
  onPurchase: (rolls: number, coins: number) => void;
}

const STORAGE_KEY = "monster-mash-ltb";
const BUNDLE_DURATION_MS = 24 * 60 * 60 * 1000; // 24h
const BASE_PRICE = 800; // coins
const SALE_PRICE = 400; // coins (50% off)
const ROLLS_REWARD = 30; // 2x of typical 15
const COINS_REWARD = 600;

interface BundleState {
  startedAt: number;
  claimed: boolean;
}

function loadState(): BundleState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BundleState;
      // Reset if expired
      if (Date.now() - parsed.startedAt > BUNDLE_DURATION_MS) {
        const fresh = { startedAt: Date.now(), claimed: false };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        return fresh;
      }
      return parsed;
    }
  } catch {}
  const fresh = { startedAt: Date.now(), claimed: false };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch {}
  return fresh;
}

function format(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export function LimitedTimeBundle({ coins, onPurchase }: Props) {
  const [state, setState] = useState<BundleState>(loadState);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(i);
  }, []);

  const remaining = Math.max(0, state.startedAt + BUNDLE_DURATION_MS - now);

  // Auto-rotate when expired
  useEffect(() => {
    if (remaining === 0) {
      const fresh = { startedAt: Date.now(), claimed: false };
      setState(fresh);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch {}
    }
  }, [remaining]);

  const canAfford = coins >= SALE_PRICE;
  const disabled = state.claimed || !canAfford;

  const savings = useMemo(() => Math.round((1 - SALE_PRICE / BASE_PRICE) * 100), []);

  const buy = () => {
    if (state.claimed) {
      toast.info("You've already claimed this bundle");
      return;
    }
    if (!canAfford) {
      toast.error(`Need ${SALE_PRICE} coins`);
      return;
    }
    onPurchase(ROLLS_REWARD, COINS_REWARD);
    const next = { ...state, claimed: true };
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    toast.success(`🔥 Bundle claimed!`, { description: `+${ROLLS_REWARD} rolls & +${COINS_REWARD} coins` });
  };

  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative overflow-hidden rounded-2xl border-2 border-destructive/70 bg-gradient-to-br from-rose-950/60 via-amber-900/30 to-rose-950/60 p-4"
    >
      {/* shimmer */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ["-50%", "300%"] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Flame className="text-destructive" size={18} />
          <h3 className="font-display text-base text-amber-300 tracking-wide">
            LIMITED-TIME BUNDLE
          </h3>
        </div>
        <span className="rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-extrabold font-display text-cream-light border border-rose-200/30">
          -{savings}%
        </span>
      </div>

      <div className="relative grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg border border-amber-400/40 bg-background/40 p-2 text-center">
          <div className="text-2xl">🎲</div>
          <div className="font-extrabold font-body text-amber-300 text-sm">+{ROLLS_REWARD} rolls</div>
          <div className="text-[10px] text-muted-foreground">2× value</div>
        </div>
        <div className="rounded-lg border border-amber-400/40 bg-background/40 p-2 text-center">
          <div className="text-2xl">🪙</div>
          <div className="font-extrabold font-body text-amber-300 text-sm">+{COINS_REWARD} coins</div>
          <div className="text-[10px] text-muted-foreground">Bonus pack</div>
        </div>
      </div>

      <div className="relative flex items-center justify-center gap-1.5 mb-3 text-xs font-body text-muted-foreground">
        <Clock size={12} />
        <span>Ends in</span>
        <span className="font-mono font-bold text-amber-300 tabular-nums">{format(remaining)}</span>
      </div>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={buy}
        disabled={disabled}
        className={`relative w-full rounded-xl py-2.5 font-display text-base flex items-center justify-center gap-2 border-2 transition-all ${
          disabled
            ? "bg-muted/40 border-muted text-muted-foreground cursor-not-allowed"
            : "bg-gradient-to-r from-amber-500 to-rose-500 border-amber-300 text-cream-light hover:brightness-110 cursor-pointer shadow-chunky-sm"
        }`}
      >
        <Sparkles size={14} />
        {state.claimed
          ? "Claimed — back tomorrow!"
          : `Claim for 🪙 ${SALE_PRICE}`}
        {!state.claimed && (
          <span className="text-xs line-through opacity-70 font-body">{BASE_PRICE}</span>
        )}
      </motion.button>
    </motion.div>
  );
}
