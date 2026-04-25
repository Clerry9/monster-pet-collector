import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getAvailableBets } from "@/data/levels";

interface BetSelectorProps {
  coins: number;
  currentBet: number;
  onSetBet: (mult: number) => void;
  /** Real energy resource — when provided, the ⚡ pill reflects current/cap. */
  energy?: number;
  energyCap?: number;
  /** ISO timestamp of the last regen anchor — used to render a live countdown. */
  energyUpdatedAt?: string;
  /** Regen interval in ms (defaults to 3 minutes). */
  energyRegenMs?: number;
}

export function BetSelector({
  coins, currentBet, onSetBet, energy, energyCap, energyUpdatedAt, energyRegenMs = 180_000,
}: BetSelectorProps) {
  const available = getAvailableBets(coins);
  // Real energy if provided, otherwise fall back to the legacy bet-relative pill.
  const useReal = typeof energy === "number" && typeof energyCap === "number" && energyCap > 0;
  const cur = useReal ? Math.min(energy!, energyCap!) : currentBet;
  const max = useReal ? energyCap! : (available[available.length - 1] ?? 1);
  const overflow = useReal ? Math.max(0, energy! - energyCap!) : 0;
  const energyPct = Math.max(6, Math.min(100, Math.round((cur / max) * 100)));
  const belowCap = useReal && energy! < energyCap!;

  // Live 1s ticker — only when energy is below cap and we have an anchor.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!belowCap || !energyUpdatedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [belowCap, energyUpdatedAt]);

  const countdown = (() => {
    if (!belowCap || !energyUpdatedAt) return null;
    const last = Date.parse(energyUpdatedAt);
    if (!Number.isFinite(last)) return null;
    const elapsed = Math.max(0, now - last);
    const remaining = Math.max(0, energyRegenMs - (elapsed % energyRegenMs));
    const m = Math.floor(remaining / 60_000);
    const s = Math.floor((remaining % 60_000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  })();

  return (
    <div className="flex items-center gap-3" role="radiogroup" aria-label="Bet multiplier">
      {/* Energy pill */}
      <div
        className="pill-energy flex items-center gap-1.5 px-3 py-1.5 min-w-[120px]"
        title={useReal
          ? `Energy refills 1 every 3 minutes up to ${energyCap}${countdown ? ` — next +1 in ${countdown}` : ""}`
          : undefined}
      >
        <span aria-hidden="true">⚡</span>
        <div className="flex-1 h-1.5 rounded-full bg-wood-dark/40 overflow-hidden">
          <motion.div
            className="h-full bg-cream-light rounded-full"
            initial={false}
            animate={{ width: `${energyPct}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          />
        </div>
        <span className="text-[11px] font-display leading-none">
          {useReal ? `${energy}/${energyCap}` : `${currentBet}/${max}`}
          {overflow > 0 && <span className="ml-1 text-[9px] opacity-90">+{overflow}</span>}
          {countdown && (
            <span
              className="ml-1 text-[9px] opacity-80 tabular-nums"
              aria-label={`Next energy in ${countdown}`}
            >
              +1 in {countdown}
            </span>
          )}
        </span>
      </div>

      {/* Bet multiplier picker — gold pills */}
      <div className="flex items-center gap-1">
        {available.map((mult) => (
          <motion.button
            key={mult}
            whileTap={{ scale: 0.9 }}
            role="radio"
            aria-checked={currentBet === mult}
            aria-label={`${mult} times multiplier`}
            onClick={() => onSetBet(mult)}
            className={`px-2.5 py-1 text-[11px] font-display leading-none rounded-full border-2 transition-all ${
              currentBet === mult
                ? "pill-gold border-wood-dark scale-105"
                : "bg-cream-light/60 border-wood-dark/60 text-wood-dark/70 hover:text-wood-dark"
            }`}
          >
            BET ×{mult}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
