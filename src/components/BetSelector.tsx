import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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
  const [previewBet, setPreviewBet] = useState<number | null>(null);
  const betButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
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
  const selectedBet = previewBet ?? currentBet;
  const cost = energyCostForBet(selectedBet);
  const insufficient = typeof energy === "number" && energy < cost;
  // Real energy if provided, otherwise fall back to the legacy bet-relative pill.
  const useReal = typeof energy === "number" && typeof energyCap === "number" && energyCap > 0;
  const cur = useReal ? Math.min(energy!, energyCap!) : currentBet;
  const max = useReal ? energyCap! : (available[available.length - 1] ?? 1);
  const overflow = useReal ? Math.max(0, energy! - energyCap!) : 0;
  const energyPct = Math.max(6, Math.min(100, Math.round((cur / max) * 100)));
  const belowCap = useReal && energy! < energyCap!;
  const hasPreview = previewBet !== null && previewBet !== currentBet;

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

  const previewBetChoice = (mult: number) => {
    const nextCost = energyCostForBet(mult);
    setPreviewBet(mult);
    if (typeof energy === "number" && energy < nextCost) {
      onInsufficientEnergy?.(mult, nextCost);
    }
  };

  const confirmBet = () => {
    const mult = selectedBet;
    const nextCost = energyCostForBet(mult);
    if (typeof energy === "number" && energy < nextCost) {
      onInsufficientEnergy?.(mult, nextCost);
      return;
    }
    onSetBet(mult);
    setPreviewBet(null);
  };

  const focusBetAt = (index: number) => {
    const next = (index + available.length) % available.length;
    betButtonRefs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-1.5" aria-label="Bet controls">
      <div
        className="rounded-lg border-2 border-wood-dark bg-cream-light/95 px-3 py-1.5 text-wood-dark shadow-chunky-sm"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3 font-display text-[10px] leading-tight">
          <span>PREVIEW BET ×{selectedBet}</span>
          <span className={insufficient ? "text-destructive" : "text-wood-dark"}>COST {cost}⚡</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[9px] font-display leading-tight text-wood-dark/75">
          <span>Expected board rewards pay ×{selectedBet}</span>
          <button
            type="button"
            onClick={confirmBet}
            disabled={!hasPreview || insufficient}
            className="rounded-full border border-wood-dark bg-gold px-2 py-0.5 text-[9px] text-wood-dark disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={insufficient ? `Cannot confirm bet times ${selectedBet}. It costs ${cost} energy and you have ${energy ?? 0}.` : `Confirm bet times ${selectedBet} for ${cost} energy per roll`}
          >
            {hasPreview ? "CONFIRM" : "ACTIVE"}
          </button>
        </div>
      </div>
      <div
        className="flex items-center gap-3"
        role="radiogroup"
        aria-label="Bet multiplier"
        aria-describedby="bet-preview-help"
        onKeyDown={(e) => {
          const currentIndex = available.indexOf(selectedBet);
          if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); focusBetAt(Math.max(0, currentIndex) + 1); }
          else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); focusBetAt(Math.max(0, currentIndex) - 1); }
          else if (e.key === "Home") { e.preventDefault(); focusBetAt(0); }
          else if (e.key === "End") { e.preventDefault(); focusBetAt(available.length - 1); }
        }}
      >
      <span id="bet-preview-help" className="sr-only">Choose a bet to preview its reward multiplier and energy cost, then press confirm.</span>
      {/* Energy pill */}
      <div
        className="pill-energy flex items-center gap-1.5 px-3 py-1.5 min-w-[120px]"
        role="status"
        aria-label={useReal ? `Energy ${energy} of ${energyCap}. Selected bet costs ${cost} energy per roll${countdown ? `. Next energy in ${countdown}` : ""}` : `Selected bet costs ${cost} energy per roll`}
        title={useReal
          ? `Energy refills 1 every 3 minutes up to ${energyCap}${countdown ? ` — next +1 in ${countdown}` : ""}`
          : undefined}
      >
        <span aria-hidden="true" className="text-[10px] leading-none">⚡</span>
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
        {available.map((mult, index) => (
          <motion.button
            key={mult}
            ref={(node) => { betButtonRefs.current[index] = node; }}
            type="button"
            whileTap={{ scale: 0.9 }}
            role="radio"
            aria-checked={selectedBet === mult}
            aria-label={`${mult} times multiplier. Costs ${energyCostForBet(mult)} energy per roll. Preview before confirming.`}
            onClick={() => previewBetChoice(mult)}
            className={`px-2.5 py-1 text-[11px] font-display leading-none rounded-full border-2 transition-all ${
              selectedBet === mult
                ? "pill-gold border-wood-dark scale-105"
                : "bg-cream-light/60 border-wood-dark text-wood-dark hover:text-wood-dark"
            }`}
          >
            BET ×{mult}
          </motion.button>
        ))}
      </div>
      </div>
    </div>
  );
}
