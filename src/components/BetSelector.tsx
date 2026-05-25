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
  onInsufficientEnergy?: (mult: number, cost: number) => void;
}

export function BetSelector({
  coins, currentBet, onSetBet, energy, energyCap, energyUpdatedAt, energyRegenMs = 180_000, onInsufficientEnergy,
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
  const selectedBet = currentBet;
  const cost = energyCostForBet(selectedBet);
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

  const chooseBet = (mult: number) => {
    const nextCost = energyCostForBet(mult);
    if (typeof energy === "number" && energy < nextCost) {
      onInsufficientEnergy?.(mult, nextCost);
      return;
    }
    onSetBet(mult);
  };

  // Tap-to-cycle: advance to the next available multiplier; wrap around.
  const cycleBet = () => {
    if (available.length === 0) return;
    const idx = available.indexOf(selectedBet);
    // Try each subsequent option until one is affordable; else just advance.
    for (let step = 1; step <= available.length; step += 1) {
      const next = available[(Math.max(0, idx) + step) % available.length];
      const nextCost = energyCostForBet(next);
      if (typeof energy !== "number" || energy >= nextCost) {
        onSetBet(next);
        return;
      }
    }
    // Nothing affordable — let parent handle the insufficient-energy hint.
    const fallback = available[(Math.max(0, idx) + 1) % available.length];
    onInsufficientEnergy?.(fallback, energyCostForBet(fallback));
  };

  return (
    <div className="flex flex-col gap-1.5 items-stretch w-full" aria-label="Bet controls">
      <div
        className="flex items-center justify-center gap-3 flex-wrap"
        aria-label="Bet multiplier"
      >
      {/* Single tap-to-cycle multiplier button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={cycleBet}
        aria-label={`Bet multiplier ×${selectedBet}. Tap to change. Costs ${cost} energy per roll.`}
        className={`pill-gold border-2 border-wood-dark px-4 py-2 font-display rounded-full leading-none flex flex-col items-center justify-center min-w-[84px] ${
          insufficient ? "ring-2 ring-destructive" : ""
        }`}
      >
        <span className="text-sm">BET ×{selectedBet}</span>
        <span className="text-[9px] opacity-80 mt-0.5">tap to change</span>
      </motion.button>
      </div>
    </div>
  );
}
