import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Coins, Clock, History, Check, XCircle } from "lucide-react";
import { sfxDiceTick, sfxCoinGain, sfxLevelUp } from "@/lib/sfx";
import { buildLuckySlots, uniformSlotOdds, type LuckySlot, type Reward, type RewardKind } from "@/data/rewardPool";
import { useLuckyRouletteCooldown, formatCountdown } from "@/hooks/useLuckyRouletteCooldown";
import { useRouletteHistory, formatRelativeTime, type RouletteHistoryEntry } from "@/hooks/useRouletteHistory";

const PAID_SPIN_COST = 100;

/** Re-exported for back-compat with Index.tsx integration. */
export type LuckyRouletteRewardKind = RewardKind;
export type LuckyRouletteReward = Reward;

/** SVG arc path for a wedge from angle `a0` to `a1` (deg, 0 = top, clockwise). */
function wedgePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(toRad(a0));
  const y0 = cy + r * Math.sin(toRad(a0));
  const x1 = cx + r * Math.cos(toRad(a1));
  const y1 = cy + r * Math.sin(toRad(a1));
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

interface Props {
  open: boolean;
  coins: number;
  onClose: () => void;
  onClaim: (r: LuckyRouletteReward, paid: boolean) => void;
  onSpendCoins: (amount: number) => boolean;
}

type Phase = "idle" | "spin" | "win" | "miss";

export function LuckyRouletteModal({ open, coins, onClose, onClaim, onSpendCoins }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [pick, setPick] = useState<number | null>(null);
  const [winningSlot, setWinningSlot] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [lastSpinWasPaid, setLastSpinWasPaid] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [lastFree, setLastFree] = useState(() => readLastFreeSpin());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase("idle");
    setPick(null);
    setWinningSlot(null);
    setRotation(0);
    setLastFree(readLastFreeSpin());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  const remainingMs = Math.max(0, lastFree + COOLDOWN_MS - now);
  const freeAvailable = remainingMs <= 0;
  const canPaid = coins >= PAID_SPIN_COST;

  const startSpin = (paid: boolean) => {
    if (phase === "spin" || pick === null) return;
    if (paid) {
      if (!onSpendCoins(PAID_SPIN_COST)) return;
    } else {
      if (!freeAvailable) return;
      const ts = Date.now();
      writeLastFreeSpin(ts);
      setLastFree(ts);
    }
    setLastSpinWasPaid(paid);
    const winner = Math.floor(Math.random() * N);
    setWinningSlot(winner);
    setPhase("spin");

    // Compute target rotation: wheel rotates such that the winning slot's
    // center sits under the pointer at the top (0deg). Add full turns for drama.
    const turns = 5 + Math.floor(Math.random() * 3);
    const slotCenter = winner * SLICE_DEG + SLICE_DEG / 2;
    const target = turns * 360 - slotCenter;
    setRotation(target);

    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => sfxDiceTick(), 110);

    window.setTimeout(() => {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      const won = winner === pick;
      if (won) {
        if (SLOTS[winner].reward.kind === "coins_jackpot") sfxLevelUp(); else sfxCoinGain();
        if (navigator.vibrate) navigator.vibrate([20, 30, 60]);
        setPhase("win");
      } else {
        if (navigator.vibrate) navigator.vibrate(40);
        setPhase("miss");
      }
    }, 3600);
  };

  const handleClaim = () => {
    if (winningSlot === null) return;
    onClaim(SLOTS[winningSlot].reward, lastSpinWasPaid);
    setPhase("idle");
    setPick(null);
    setWinningSlot(null);
  };

  const handleSpinAgain = () => {
    setPhase("idle");
    setWinningSlot(null);
  };

  if (!open) return null;

  // SVG geometry
  const SIZE = 240;
  const R = SIZE / 2 - 4;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

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
          className="panel-wood relative w-full max-w-md p-5 text-center"
          style={{ background: "radial-gradient(ellipse at top, hsl(var(--gold) / 0.45), hsl(var(--wood)))" }}
        >
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 icon-tile-gold w-8 h-8 flex items-center justify-center"
            aria-label="Close roulette"
          >
            <X size={16} />
          </button>

          <div className="flex items-center justify-center gap-2 mb-1 text-cream-light">
            <Sparkles size={16} className="text-gold" aria-hidden />
            <h2 id="lucky-roulette-title" className="font-display text-base tracking-wide">LUCKY ROULETTE</h2>
            <Sparkles size={16} className="text-gold" aria-hidden />
          </div>
          <p className="text-[11px] font-display text-cream/80 mb-3">
            {phase === "win"  ? "You called it! Claim your prize." :
             phase === "miss" ? "So close — try another slot!" :
             phase === "spin" ? "Spinning..." :
             pick === null    ? "Pick a slot, then spin to match it." :
                                "Locked in. Spin to test your luck!"}
          </p>

          {/* Wheel */}
          <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
            {/* Pointer */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-2 z-10"
              aria-hidden
              style={{
                width: 0, height: 0,
                borderLeft: "10px solid transparent",
                borderRight: "10px solid transparent",
                borderTop: "16px solid hsl(var(--candy-red))",
                filter: "drop-shadow(0 2px 0 hsl(var(--wood-dark)))",
              }}
            />
            <motion.svg
              width={SIZE} height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              animate={{ rotate: rotation }}
              transition={phase === "spin"
                ? { duration: 3.6, ease: [0.17, 0.67, 0.32, 0.99] }
                : { duration: 0 }}
              role="radiogroup"
              aria-label="Roulette slots"
              className="drop-shadow-[0_6px_0_hsl(var(--wood-dark))]"
            >
              {SLOTS.map((s, i) => {
                const a0 = i * SLICE_DEG;
                const a1 = a0 + SLICE_DEG;
                const mid = a0 + SLICE_DEG / 2;
                const labelR = R * 0.66;
                const lx = CX + labelR * Math.cos(((mid - 90) * Math.PI) / 180);
                const ly = CY + labelR * Math.sin(((mid - 90) * Math.PI) / 180);
                const isPick = pick === i;
                const isWinner = winningSlot === i && (phase === "win" || phase === "miss");
                const interactive = phase === "idle";
                return (
                  <g key={i}>
                    <path
                      d={wedgePath(CX, CY, R, a0, a1)}
                      fill={s.fill}
                      stroke={isPick ? "hsl(var(--gold))" : "hsl(var(--wood-dark))"}
                      strokeWidth={isPick ? 4 : 2}
                      style={{
                        cursor: interactive ? "pointer" : "default",
                        opacity: phase === "miss" && !isWinner && !isPick ? 0.55 : 1,
                        filter: isWinner ? "brightness(1.25)" : undefined,
                      }}
                      onClick={() => { if (interactive) setPick(i); }}
                      role="radio"
                      aria-checked={isPick}
                      aria-label={`Slot ${i + 1}: ${s.reward.label}`}
                      tabIndex={interactive ? 0 : -1}
                    />
                    <text
                      x={lx} y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="20"
                      pointerEvents="none"
                      transform={`rotate(${mid}, ${lx}, ${ly})`}
                    >
                      {s.reward.emoji}
                    </text>
                  </g>
                );
              })}
              <circle cx={CX} cy={CY} r={18} fill="hsl(var(--gold))" stroke="hsl(var(--wood-dark))" strokeWidth={3} />
            </motion.svg>
          </div>

          {/* Live region */}
          <div className="sr-only" aria-live="polite">
            {phase === "win" && winningSlot !== null && `You won ${SLOTS[winningSlot].reward.label}`}
            {phase === "miss" && winningSlot !== null && pick !== null &&
              `Miss. Ball landed on slot ${winningSlot + 1}, ${SLOTS[winningSlot].reward.label}. You picked slot ${pick + 1}.`}
          </div>

          {/* Pick summary */}
          <div className="mt-3 min-h-[1.5rem] text-cream-light font-display text-[12px]">
            {phase === "win" && winningSlot !== null && (
              <span>+{SLOTS[winningSlot].reward.amount} {SLOTS[winningSlot].reward.emoji} {SLOTS[winningSlot].reward.label}</span>
            )}
            {phase === "miss" && winningSlot !== null && (
              <span>Ball: {SLOTS[winningSlot].reward.emoji} {SLOTS[winningSlot].reward.label}</span>
            )}
            {phase !== "win" && phase !== "miss" && pick !== null && (
              <span>Your pick: {SLOTS[pick].reward.emoji} {SLOTS[pick].reward.label}</span>
            )}
          </div>

          {/* Actions */}
          {phase === "win" ? (
            <button
              ref={spinBtnRef}
              onClick={handleClaim}
              className="btn-press mt-3 w-full py-2.5 rounded-full font-display text-base"
              autoFocus
            >
              CLAIM REWARD
            </button>
          ) : phase === "miss" ? (
            <button
              ref={spinBtnRef}
              onClick={handleSpinAgain}
              className="btn-press mt-3 w-full py-2.5 rounded-full font-display text-base"
              autoFocus
            >
              TRY AGAIN
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <button
                ref={spinBtnRef}
                onClick={() => startSpin(false)}
                disabled={!freeAvailable || phase === "spin" || pick === null}
                className="btn-press w-full py-2.5 rounded-full font-display text-base disabled:opacity-50 flex items-center justify-center gap-2"
                aria-label={pick === null ? "Pick a slot first" : freeAvailable ? "Spin for free" : `Free spin in ${fmt(remainingMs)}`}
              >
                {freeAvailable ? (
                  <>🎰 FREE SPIN</>
                ) : (
                  <><Clock size={14} aria-hidden /> Free in {fmt(remainingMs)}</>
                )}
              </button>
              <button
                onClick={() => startSpin(true)}
                disabled={!canPaid || phase === "spin" || pick === null}
                className="w-full py-2 rounded-full font-display text-[12px] border-2 border-gold bg-wood-dark text-cream-light disabled:opacity-40 hover:bg-wood-dark/80 flex items-center justify-center gap-2"
                aria-label={`Extra spin for ${PAID_SPIN_COST} coins`}
                title={!canPaid ? `Need ${PAID_SPIN_COST} coins` : `Spend ${PAID_SPIN_COST} coins`}
              >
                <Coins size={14} aria-hidden /> EXTRA SPIN — {PAID_SPIN_COST}
              </button>
              <p className="text-[10px] font-display text-cream/70">
                Pick a slot. Win only if the ball lands on it!
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
