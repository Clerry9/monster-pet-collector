import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getAvailableBets } from "@/data/levels";
import { energyCostForBet } from "@/hooks/useGameState";

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
  // Live 1s ticker — keeps countdown text and the available-bet list fresh
  // even between server pushes (e.g. when a regen tick crosses the 1000-energy
  // gate that unlocks the high tiers).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Predict regen-credited energy for purposes of unlocking higher bet tiers.
  // We never display this value (the pill below shows the canonical state),
  // we only use it so the bet pills appear instantly when regen would have
  // pushed the player across an unlock threshold.
  const predictedEnergy = (() => {
    if (typeof energy !== "number" || !energyUpdatedAt) return energy ?? 0;
    const last = Date.parse(energyUpdatedAt);
    if (!Number.isFinite(last)) return energy;
    const cap = typeof energyCap === "number" ? energyCap : Infinity;
    if (energy >= cap) return energy;
    const ticks = Math.max(0, Math.floor((now - last) / energyRegenMs));
    return Math.min(cap, energy + ticks);
  })();

  const available = getAvailableBets(coins, predictedEnergy);
  const cost = energyCostForBet(currentBet);
  const insufficient = typeof energy === "number" && energy < cost;
  // Real energy if provided, otherwise fall back to the legacy bet-relative pill.
  const useReal = typeof energy === "number" && typeof energyCap === "number" && energyCap > 0;
  const cur = useReal ? Math.min(energy!, energyCap!) : currentBet;
  const max = useReal ? energyCap! : (available[available.length - 1] ?? 1);
  const overflow = useReal ? Math.max(0, energy! - energyCap!) : 0;
  const energyPct = Math.max(6, Math.min(100, Math.round((cur / max) * 100)));
  const belowCap = useReal && energy! < energyCap!;

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
          <span
            className={`ml-1 text-[9px] tabular-nums ${insufficient ? "text-destructive font-bold" : "opacity-80"}`}
            aria-label={`Each roll costs ${cost} energy`}
          >
            −{cost}⚡/roll
          </span>
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
                : "bg-cream-light/60 border-wood-dark text-wood-dark hover:text-wood-dark"
            }`}
          >
            BET ×{mult}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
