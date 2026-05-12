import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Coins, Clock, History, Check, XCircle, Trash2, Volume2, VolumeX } from "lucide-react";
import { sfxDiceTick, sfxCoinGain, sfxLevelUp, sfxRouletteWin, sfxRouletteMiss, isMuted, setMuted } from "@/lib/sfx";
import { buildLuckySlots, uniformSlotOdds, type LuckySlot, type Reward, type RewardKind } from "@/data/rewardPool";
import { useLuckyRouletteCooldown, formatCountdown } from "@/hooks/useLuckyRouletteCooldown";
import { useRouletteHistory, formatRelativeTime, type RouletteHistoryEntry } from "@/hooks/useRouletteHistory";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PAID_SPIN_COST = 100;

export type LuckyRouletteRewardKind = RewardKind;
export type LuckyRouletteReward = Reward;

interface Props {
  open: boolean;
  coins: number;
  onClose: () => void;
  /** Called once per reward grant. Receives the reward and a guard helper that
   *  callers can use to detect a repeated claim attempt (always false for
   *  signed-out users). */
  onClaim: (r: LuckyRouletteReward, paid: boolean) => void;
  onSpendCoins: (amount: number) => boolean;
}

type Phase = "idle" | "spin" | "win" | "miss";

/** SVG arc path for a wedge from `a0` to `a1` (deg, 0 = top, clockwise). */
function wedgePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(toRad(a0));
  const y0 = cy + r * Math.sin(toRad(a0));
  const x1 = cx + r * Math.cos(toRad(a1));
  const y1 = cy + r * Math.sin(toRad(a1));
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

export function LuckyRouletteModal({ open, coins, onClose, onClaim, onSpendCoins }: Props) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<LuckySlot[]>(() => buildLuckySlots());
  const N = slots.length;
  const SLICE_DEG = 360 / N;

  const [phase, setPhase] = useState<Phase>("idle");
  const [pick, setPick] = useState<number | null>(null);
  const [winningSlot, setWinningSlot] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [lastSpinWasPaid, setLastSpinWasPaid] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [muted, setMutedState] = useState<boolean>(() => isMuted());
  const [activeSpinId, setActiveSpinId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Focus management
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const { freeAvailable, remainingMs, consumeFreeSpin, paidCredits, consumePaidSpin } = useLuckyRouletteCooldown();
  const { entries, append, clear, markClaimed } = useRouletteHistory();
  const canPaid = coins >= PAID_SPIN_COST;

  // Reset transient state whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setSlots(buildLuckySlots());
    setPhase("idle");
    setPick(null);
    setWinningSlot(null);
    setRotation(0);
    setBallAngle(0);
    setShowHistory(false);
    setActiveSpinId(null);
    setClaiming(false);
    setClaimed(false);
  }, [open]);

  // Focus trap + restore focus on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    // Initial focus: primary action if available, else the close button.
    const t = window.setTimeout(() => {
      (primaryActionRef.current ?? closeBtnRef.current)?.focus();
    }, 50);
    return () => {
      window.clearTimeout(t);
      try { previouslyFocusedRef.current?.focus(); } catch { /* ignore */ }
    };
  }, [open]);

  // Re-focus the primary action when phase changes (so CLAIM gets focus on win).
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => primaryActionRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open, phase]);

  // Keyboard handling: Escape close + Tab focus trap.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        // Don't close mid-spin - lose state. Otherwise close.
        if (phase !== "spin") onClose();
        return;
      }
      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
          ),
        ).filter((el) => !el.hasAttribute("aria-hidden"));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && (active === first || !root.contains(active))) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, phase, onClose]);

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  const oddsPerSlot = useMemo(() => uniformSlotOdds(N), [N]);

  // Arrow-key wedge navigation when phase is idle.
  const wedgeFocus = useCallback((dir: 1 | -1) => {
    setPick((cur) => {
      if (cur === null) return dir === 1 ? 0 : N - 1;
      return (cur + dir + N) % N;
    });
  }, [N]);

  const startSpin = async (mode: "free" | "coins" | "credit") => {
    if (phase === "spin" || pick === null) return;
    if (mode === "coins") {
      if (!onSpendCoins(PAID_SPIN_COST)) return;
    } else if (mode === "credit") {
      const ok = await consumePaidSpin();
      if (!ok) return;
    } else {
      if (!freeAvailable) return;
      consumeFreeSpin();
    }
    const paid = mode !== "free";
    setLastSpinWasPaid(paid);
    setClaimed(false);
    setActiveSpinId(null);
    const winner = Math.floor(Math.random() * N);
    setWinningSlot(winner);
    setPhase("spin");

    const turns = 5 + Math.floor(Math.random() * 3);
    const slotCenter = winner * SLICE_DEG + SLICE_DEG / 2;
    setRotation(turns * 360 - slotCenter);
    const ballTurns = turns + 2;
    setBallAngle(-ballTurns * 360);

    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => sfxDiceTick(), 110);

    window.setTimeout(() => {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      const won = winner === pick;
      const winSlot = slots[winner];
      const pickSlot = slots[pick];
      const at = Date.now();
      const entry: RouletteHistoryEntry = {
        at,
        pickedSlot: pick,
        landedSlot: winner,
        rewardLabel: winSlot.reward.label,
        rewardEmoji: winSlot.reward.emoji,
        rewardKind: winSlot.reward.kind,
        rewardAmount: winSlot.reward.amount,
        pickedLabel: pickSlot.reward.label,
        pickedEmoji: pickSlot.reward.emoji,
        won,
        paid,
      };
      append(entry);
      // Capture the server id once it arrives so we can claim idempotently.
      // The append() helper attaches it to the entry asynchronously.
      if (user) {
        // Poll the entries list for the matching `at` to collect the id.
        const tryAttach = (attempt = 0) => {
          const found = entriesRef.current.find((e) => e.at === at && e.id);
          if (found?.id) setActiveSpinId(found.id);
          else if (attempt < 12) window.setTimeout(() => tryAttach(attempt + 1), 250);
        };
        tryAttach();
      }
      if (won) {
        if (winSlot.reward.kind === "coins_jackpot") sfxLevelUp();
        else { sfxRouletteWin(); sfxCoinGain(); }
        if (navigator.vibrate) navigator.vibrate([20, 30, 60]);
        setPhase("win");
      } else {
        sfxRouletteMiss();
        if (navigator.vibrate) navigator.vibrate(40);
        setPhase("miss");
      }
    }, 3600);
  };

  // Keep latest entries in a ref for the post-spin id-attachment poll.
  const entriesRef = useRef(entries);
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  const handleClaim = async () => {
    if (winningSlot === null || claiming || claimed) return;
    setClaiming(true);
    let granted = true;
    if (user && activeSpinId) {
      // Idempotent server-side claim. If `claimed_at` was set previously the
      // RPC returns the existing row (claimed_at != null) and we skip granting.
      const { data, error } = await supabase.rpc("claim_roulette_spin", { p_spin_id: activeSpinId });
      if (error) {
        setClaiming(false);
        return;
      }
      const row = data as { claimed_at: string | null } | null;
      // Spin was already claimed before this RPC marked it - if claimed_at
      // pre-existed (older than ~3 seconds) treat as duplicate.
      if (row?.claimed_at) {
        const age = Date.now() - Date.parse(row.claimed_at);
        if (age > 3000) granted = false;
      }
      markClaimed(activeSpinId);
    }
    if (granted) onClaim(slots[winningSlot].reward, lastSpinWasPaid);
    setClaimed(true);
    setClaiming(false);
    // Reset for next round.
    setPhase("idle");
    setPick(null);
    setWinningSlot(null);
    setActiveSpinId(null);
  };

  const handleSpinAgain = () => {
    setPhase("idle");
    setWinningSlot(null);
    setActiveSpinId(null);
  };

  if (!open) return null;

  // Geometry
  const SIZE = 240;
  const R = SIZE / 2 - 4;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const BALL_R = R - 16;
  const ballX = CX;
  const ballY = CY - BALL_R;

  const isJackpot = winningSlot !== null && slots[winningSlot]?.reward.kind === "coins_jackpot";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lucky-roulette-title"
        onClick={(e) => { if (e.target === e.currentTarget && phase !== "spin") onClose(); }}
      >
        <motion.div
          ref={dialogRef}
          initial={{ scale: 0.7, y: 30 }}
          animate={phase === "win" ? { scale: [1, 1.04, 1], y: 0 } : phase === "miss" ? { scale: 1, x: [0, -6, 6, -3, 3, 0], y: 0 } : { scale: 1, y: 0 }}
          exit={{ scale: 0.7, y: 30 }}
          transition={phase === "miss" ? { duration: 0.4 } : { type: "spring", damping: 16 }}
          className="panel-wood relative w-full max-w-md p-5 text-center my-auto"
          style={{ background: "radial-gradient(ellipse at top, hsl(var(--gold) / 0.45), hsl(var(--wood)))" }}
        >
          <div className="absolute -top-2 -right-2 flex gap-1">
            <button
              type="button"
              onClick={() => { const v = !muted; setMuted(v); setMutedState(v); }}
              className="icon-tile-gold w-8 h-8 flex items-center justify-center"
              aria-label={muted ? "Unmute roulette sounds" : "Mute roulette sounds"}
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              disabled={phase === "spin"}
              className="icon-tile-gold w-8 h-8 flex items-center justify-center disabled:opacity-50"
              aria-label="Close roulette"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1 text-cream-light">
            <Sparkles size={16} className="text-gold" aria-hidden />
            <h2 id="lucky-roulette-title" className="font-display text-base tracking-wide">LUCKY ROULETTE</h2>
            <Sparkles size={16} className="text-gold" aria-hidden />
          </div>
          <p className="text-[11px] font-display text-cream/80 mb-3">
            {phase === "win"  ? "You called it! Claim your prize." :
             phase === "miss" ? "So close — try another slot!" :
             phase === "spin" ? "Watch the ball..." :
             pick === null    ? "Pick a wedge, then spin to match it." :
                                "Locked in. Spin to test your luck!"}
          </p>

          {/* Wheel + pointer + ball */}
          <div
            className="relative mx-auto"
            style={{ width: SIZE, height: SIZE }}
            data-tutorial="roulette-wheel"
            onKeyDown={(e) => {
              if (phase !== "idle") return;
              if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); wedgeFocus(1); }
              else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); wedgeFocus(-1); }
            }}
            tabIndex={phase === "idle" ? 0 : -1}
            role="application"
            aria-label="Roulette wheel — use arrow keys to select a wedge"
          >
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-2 z-20"
              data-tutorial="roulette-pointer"
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
              aria-label="Roulette wedges"
              className="drop-shadow-[0_6px_0_hsl(var(--wood-dark))] absolute inset-0"
            >
              {slots.map((s, i) => {
                const a0 = i * SLICE_DEG;
                const a1 = a0 + SLICE_DEG;
                const mid = a0 + SLICE_DEG / 2;
                const labelR = R * 0.66;
                const lx = CX + labelR * Math.cos(((mid - 90) * Math.PI) / 180);
                const ly = CY + labelR * Math.sin(((mid - 90) * Math.PI) / 180);
                const isPick = pick === i;
                const isWinner = winningSlot === i && (phase === "win" || phase === "miss");
                const isLoser = phase === "miss" && pick === i;
                const interactive = phase === "idle";
                return (
                  <g key={i}>
                    <path
                      d={wedgePath(CX, CY, R, a0, a1)}
                      fill={s.fill}
                      stroke={isWinner && phase === "win" ? "hsl(var(--gold))" : isLoser ? "hsl(var(--candy-red))" : isPick ? "hsl(var(--gold))" : "hsl(var(--wood-dark))"}
                      strokeWidth={isPick || isWinner ? 4 : 2}
                      style={{
                        cursor: interactive ? "pointer" : "default",
                        opacity: phase === "miss" && !isWinner && !isPick ? 0.5 : 1,
                        filter: isWinner && phase === "win" ? "brightness(1.35) drop-shadow(0 0 8px hsl(var(--gold)))" : isLoser ? "brightness(0.85)" : undefined,
                        transition: "filter 0.3s, opacity 0.3s",
                      }}
                      onClick={() => { if (interactive) setPick(i); }}
                      onKeyDown={(e) => {
                        if (!interactive) return;
                        if (e.key === " " || e.key === "Enter") { e.preventDefault(); setPick(i); }
                      }}
                      role="radio"
                      aria-checked={isPick}
                      aria-label={`Slot ${i + 1}: ${s.reward.label}, ${oddsPerSlot}% chance`}
                      tabIndex={interactive ? 0 : -1}
                    />
                    <g pointerEvents="none" transform={`rotate(${mid}, ${lx}, ${ly})`}>
                      <text x={lx} y={ly - 6} textAnchor="middle" dominantBaseline="middle" fontSize="20">
                        {s.reward.emoji}
                      </text>
                      <text
                        x={lx} y={ly + 12}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize="9" fontWeight="700" fill="hsl(var(--cream-light))"
                        style={{ paintOrder: "stroke", stroke: "hsl(var(--wood-dark))", strokeWidth: 2 }}
                      >
                        {s.reward.kind === "coins_jackpot" ? "JP" : s.reward.amount}
                      </text>
                    </g>
                  </g>
                );
              })}
              <circle cx={CX} cy={CY} r={18} fill="hsl(var(--gold))" stroke="hsl(var(--wood-dark))" strokeWidth={3} />
            </motion.svg>

            <motion.svg
              width={SIZE} height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="absolute inset-0 pointer-events-none"
              style={{ originX: "50%", originY: "50%" }}
              animate={{ rotate: ballAngle }}
              transition={phase === "spin"
                ? { duration: 3.6, ease: [0.17, 0.67, 0.32, 0.99] }
                : { duration: 0 }}
              aria-hidden
            >
              <circle
                cx={ballX} cy={ballY} r={7}
                fill="hsl(var(--cream-light))"
                stroke="hsl(var(--wood-dark))"
                strokeWidth={2}
                style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.45))" }}
              />
            </motion.svg>

            {/* Win sparkle burst */}
            <AnimatePresence>
              {phase === "win" && (
                <motion.div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  aria-hidden
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: isJackpot ? [0.4, 1.6, 1.2] : [0.4, 1.3, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="text-6xl drop-shadow-[0_0_24px_rgba(253,224,71,0.95)]">✨</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live region */}
          <div className="sr-only" aria-live="polite">
            {phase === "win" && winningSlot !== null && `You won ${slots[winningSlot].reward.label}`}
            {phase === "miss" && winningSlot !== null && pick !== null &&
              `Miss. Ball landed on slot ${winningSlot + 1}, ${slots[winningSlot].reward.label}. You picked slot ${pick + 1}.`}
          </div>

          {/* Receipt — replaces the simple result line for win/miss */}
          {(phase === "win" || phase === "miss") && winningSlot !== null && pick !== null ? (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-lg border-2 border-wood-dark bg-cream-light/95 p-3 text-left text-wood-dark"
              role="status"
              aria-label="Spin receipt"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm tracking-wide">
                  {phase === "win" ? "🎉 RECEIPT — WIN" : "🎯 RECEIPT — MISS"}
                </span>
                <span className="text-[10px] font-display opacity-70">
                  {lastSpinWasPaid ? `PAID ${PAID_SPIN_COST}🪙` : "FREE SPIN"}
                </span>
              </div>
              <ul className="mt-1.5 text-[11px] font-display space-y-0.5">
                <li>Picked: {slots[pick].reward.emoji} {slots[pick].reward.label} (slot {pick + 1})</li>
                <li>Landed: {slots[winningSlot].reward.emoji} {slots[winningSlot].reward.label} (slot {winningSlot + 1})</li>
                {phase === "win" && (
                  <li className="text-base font-display text-candy-red-deep">
                    Reward: +{slots[winningSlot].reward.amount} {slots[winningSlot].reward.emoji} {slots[winningSlot].reward.label}
                  </li>
                )}
                {claimed && <li className="text-emerald-700 text-[10px]">✓ Claimed</li>}
              </ul>
            </motion.section>
          ) : (
            <div className="mt-3 min-h-[1.5rem] text-cream-light font-display text-[12px]">
              {pick !== null && (
                <span>Your pick: {slots[pick].reward.emoji} {slots[pick].reward.label}</span>
              )}
            </div>
          )}

          {/* Odds legend */}
          <div
            className="mt-3 rounded-lg bg-wood-dark/40 border-2 border-wood-dark p-2 text-left"
            aria-label="Roulette odds and rewards"
          >
            <div className="font-display text-[10px] tracking-wide text-cream/80 mb-1.5 text-center">
              ODDS — every wedge pays {oddsPerSlot}% (1 in {N})
            </div>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
              {slots.map((s, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-1.5 text-[10px] font-display text-cream-light rounded px-1 py-0.5 ${pick === i ? "ring-2 ring-gold" : ""}`}
                >
                  <span className="inline-block w-2.5 h-2.5 rounded-sm border border-wood-dark" style={{ background: s.fill }} aria-hidden />
                  <span>{s.reward.emoji}</span>
                  <span className="truncate flex-1">{s.reward.label}</span>
                  <span className="tabular-nums text-cream/70">{oddsPerSlot}%</span>
                </li>
              ))}
            </ul>
          </div>

          {/* History */}
          <div className="mt-2 text-left">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              aria-expanded={showHistory}
              aria-controls="lucky-history-panel"
              className="w-full flex items-center justify-between gap-2 text-[10px] font-display text-cream/80 hover:text-cream-light px-2 py-1 rounded"
            >
              <span className="flex items-center gap-1.5"><History size={12} aria-hidden /> RECENT SPINS ({entries.length})</span>
              <span aria-hidden>{showHistory ? "▾" : "▸"}</span>
            </button>
            {showHistory && (
              <div
                id="lucky-history-panel"
                className="mt-1 rounded-lg bg-wood-dark/40 border-2 border-wood-dark p-2 max-h-40 overflow-y-auto"
              >
                {entries.length === 0 ? (
                  <p className="text-[10px] font-display text-cream/60 text-center py-2">No spins yet — pick a wedge!</p>
                ) : (
                  <>
                    <ul className="space-y-1">
                      {entries.map((e, i) => (
                        <li key={e.id ?? `${e.at}-${i}`} className="flex items-center gap-1.5 text-[10px] font-display text-cream-light">
                          {e.won
                            ? <Check size={11} className="text-gold" aria-label="Won" />
                            : <XCircle size={11} className="text-candy-red" aria-label="Missed" />}
                          <span aria-hidden>{e.pickedEmoji}</span>
                          <span className="text-cream/60">→</span>
                          <span aria-hidden>{e.rewardEmoji}</span>
                          <span className="truncate flex-1">
                            {e.won ? `Won ${e.rewardLabel}` : `Picked ${e.pickedLabel}, ball ${e.rewardLabel}`}
                          </span>
                          {e.paid && <Coins size={10} className="text-gold" aria-label="Paid spin" />}
                          <span className="text-cream/60 tabular-nums">{formatRelativeTime(e.at)}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={clear}
                      className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] font-display text-cream/70 hover:text-candy-red"
                    >
                      <Trash2 size={11} aria-hidden /> Clear history
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {phase === "win" ? (
            <button
              ref={primaryActionRef}
              onClick={handleClaim}
              disabled={claiming || claimed}
              className="btn-press mt-3 w-full py-2.5 rounded-full font-display text-base disabled:opacity-50"
            >
              {claimed ? "CLAIMED ✓" : claiming ? "CLAIMING..." : "CLAIM REWARD"}
            </button>
          ) : phase === "miss" ? (
            <button
              ref={primaryActionRef}
              onClick={handleSpinAgain}
              className="btn-press mt-3 w-full py-2.5 rounded-full font-display text-base"
            >
              TRY AGAIN
            </button>
          ) : (
            <div className="mt-3 space-y-2">
              <button
                ref={primaryActionRef}
                onClick={() => startSpin("free")}
                disabled={!freeAvailable || phase === "spin" || pick === null}
                className="btn-press w-full py-2.5 rounded-full font-display text-base disabled:opacity-50 flex items-center justify-center gap-2"
                aria-label={pick === null ? "Pick a wedge first" : freeAvailable ? "Spin for free" : `Free spin in ${formatCountdown(remainingMs)}`}
              >
                {freeAvailable ? <>🎰 FREE SPIN</> : <><Clock size={14} aria-hidden /> Free in {formatCountdown(remainingMs)}</>}
              </button>
              {paidCredits > 0 && (
                <button
                  onClick={() => startSpin("credit")}
                  disabled={phase === "spin" || pick === null}
                  className="w-full py-2 rounded-full font-display text-[12px] border-2 border-gold bg-gold/20 text-cream-light disabled:opacity-40 hover:bg-gold/30 flex items-center justify-center gap-2"
                  aria-label={`Use a paid spin credit (${paidCredits} remaining)`}
                >
                  🎟️ PAID SPIN — {paidCredits} left
                </button>
              )}
              <button
                onClick={() => startSpin("coins")}
                disabled={!canPaid || phase === "spin" || pick === null}
                className="w-full py-2 rounded-full font-display text-[12px] border-2 border-gold bg-wood-dark text-cream-light disabled:opacity-40 hover:bg-wood-dark/80 flex items-center justify-center gap-2"
                aria-label={`Extra spin for ${PAID_SPIN_COST} coins`}
                title={!canPaid ? `Need ${PAID_SPIN_COST} coins` : `Spend ${PAID_SPIN_COST} coins`}
              >
                <Coins size={14} aria-hidden /> EXTRA SPIN — {PAID_SPIN_COST}
              </button>
              <p className="text-[10px] font-display text-cream/70">
                Pick a wedge. Win only if the ball lands on it!
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
