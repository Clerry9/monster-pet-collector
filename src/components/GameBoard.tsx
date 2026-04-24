import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { BOARD_TILES, BoardTile, TileType } from "@/hooks/useGameState";
import { Monster } from "@/data/monsters";
import { sfxDiceTick, sfxHop, sfxLand, sfxCoinGain, sfxSkull } from "@/lib/sfx";
import { IsometricBoard } from "@/components/IsometricBoard";
import { Zap } from "lucide-react";

interface GameBoardProps {
  position: number;
  absoluteStep?: number;
  monster: Monster;
  rolls: number;
  lastResult: { steps: number; tile: BoardTile; islandStarEarned?: boolean } | null;
  onRollDice: () => void;
  onLanded?: () => void;
  activeDiceMax: number;
  levelId?: number;
  seasonAccent?: string;
  seasonGlow?: string;
  seasonSymbol?: string;
  fullscreen?: boolean;
  islandStars?: number;
  pendingCardFlips?: number;
  betMultiplier?: number;
}

const TILE_EMOJIS: Record<TileType, string> = {
  coins: "🪙",
  bonus: "⚡", // overridden in result banner with a styled <Zap /> icon
  chest: "🎁",
  food: "🍖",
  skull: "💀",
  star: "⭐",
};

const TILE_LABELS: Record<TileType, string> = {
  coins: "Coins",
  bonus: "Bonus",
  chest: "Chest",
  food: "Monster Food",
  skull: "Skull penalty",
  star: "Star reward",
};

const TILE_COLORS: Record<TileType, string> = {
  coins: "bg-accent/20 border-accent/40",
  bonus: "bg-primary/20 border-primary/40",
  chest: "bg-secondary/20 border-secondary/40",
  food: "bg-purple-500/20 border-purple-500/40",
  skull: "bg-destructive/30 border-destructive/50",
  star: "bg-accent/30 border-accent/60",
};

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
}

const PARTICLE_COLORS = ["#22c55e", "#facc15", "#38bdf8", "#a78bfa", "#f472b6"];
let particleIdCounter = 0;

export function GameBoard({ position, absoluteStep, monster, rolls, lastResult, onRollDice, onLanded, activeDiceMax, levelId = 1, seasonAccent, seasonGlow, seasonSymbol, fullscreen = false, islandStars = 0, pendingCardFlips = 0, betMultiplier = 1 }: GameBoardProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [isAutoRolling, setIsAutoRolling] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [seasonBurstKey, setSeasonBurstKey] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const rollCounterRef = useRef(0);
  const monsterControls = useAnimation();
  const prevPositionRef = useRef(position);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const autoRollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollStartedAtRef = useRef<number>(0);
  const isRollingRef = useRef(false);
  const rollsRef = useRef(rolls);
  const isAutoRollingRef = useRef(false);
  const justStoppedRef = useRef(false);
  const lastStopAtRef = useRef(0);

  useEffect(() => { rollsRef.current = rolls; }, [rolls]);
  useEffect(() => { isRollingRef.current = isRolling; }, [isRolling]);
  useEffect(() => { isAutoRollingRef.current = isAutoRolling; }, [isAutoRolling]);

  // Cleanup any in-flight roll interval on unmount
  useEffect(() => () => {
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    if (performRollGuardRef.current) clearTimeout(performRollGuardRef.current);
  }, []);

  // Watchdog: if isRolling stays true for >2s without completion, force-reset.
  useEffect(() => {
    if (!isRolling) return;
    const start = rollStartedAtRef.current || Date.now();
    const watchdog = setTimeout(() => {
      if (isRollingRef.current && Date.now() - start >= 2000) {
        if (rollIntervalRef.current) {
          clearInterval(rollIntervalRef.current);
          rollIntervalRef.current = null;
        }
        setIsRolling(false);
        isRollingRef.current = false;
      }
    }, 2100);
    return () => clearTimeout(watchdog);
  }, [isRolling]);

  // Hard safety: a single timeout guarantees roll completes regardless of setInterval throttling.
  // setInterval is throttled to ~1Hz on backgrounded tabs, which can leave isRolling stuck.
  const performRollGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const spawnParticles = (count: number) => {
    const newParticles: Particle[] = Array.from({ length: count }, () => ({
      id: particleIdCounter++,
      x: (Math.random() - 0.5) * 40,
      y: (Math.random() - 0.5) * 20,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      size: Math.random() * 6 + 3,
    }));
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.includes(p)));
    }, 800);
  };

  const triggerSkullEffect = () => {
    sfxSkull();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 80, 30, 50]);
    }
  };

  // Animate monster on position change
  useEffect(() => {
    if (position !== prevPositionRef.current) {
      const steps = ((position - prevPositionRef.current) % BOARD_TILES.length + BOARD_TILES.length) % BOARD_TILES.length;
      prevPositionRef.current = position;

      const hopSequence = async () => {
        for (let i = 0; i < Math.min(steps, 6); i++) {
          sfxHop();
          spawnParticles(4);
          await monsterControls.start({
            y: -28,
            x: [0, 6, -6, 0],
            rotate: [0, -8, 8, 0],
            scale: 1.15,
            transition: { duration: 0.12, ease: "easeOut" },
          });
          await monsterControls.start({
            y: 0,
            scale: 1,
            transition: { duration: 0.1, ease: "easeIn" },
          });
        }
        sfxLand();
        spawnParticles(8);
        await monsterControls.start({
          y: [0, -14, 0, -5, 0],
          scale: [1, 1.2, 0.9, 1.05, 1],
          rotate: [0, 0, 0, 0, 0],
          transition: { duration: 0.5, ease: "easeOut" },
        });
      };
      hopSequence();
    }
  }, [position, monsterControls]);

  // Trigger effects + show result banner AFTER the monster lands
  useEffect(() => {
    if (!lastResult || isRolling) {
      setShowResult(false);
      return;
    }
    // Delay banner until monster's hop animation finishes (~steps × 110ms + 250ms settle)
    const landDelay = Math.min(lastResult.steps, 12) * 110 + 250;
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    resultTimerRef.current = setTimeout(() => {
      setShowResult(true);
      if (lastResult.tile.type === "skull") {
        triggerSkullEffect();
      } else if (lastResult.tile.value > 0) {
        sfxCoinGain();
      }
      // Season particle burst every 3 rolls
      rollCounterRef.current += 1;
      if (seasonSymbol && rollCounterRef.current % 3 === 0) {
        setSeasonBurstKey((k) => k + 1);
      }
      // Notify parent so card reveals + island-star toasts only fire after landing.
      onLanded?.();
    }, landDelay);
    return () => { if (resultTimerRef.current) clearTimeout(resultTimerRef.current); };
  }, [lastResult, isRolling, seasonSymbol, onLanded]);

  const performRoll = () => {
    // Self-heal: if a stale isRolling flag is blocking us but no interval is actually running,
    // recover and continue. This prevents the "stuck PRESS button" bug after tab throttling.
    if (isRollingRef.current && !rollIntervalRef.current) {
      isRollingRef.current = false;
      setIsRolling(false);
    }
    if (isRollingRef.current || rollsRef.current <= 0) return;
    // Bail if user JUST stopped auto-roll — pointer-up / queued timeouts can race in here.
    if (!isAutoRollingRef.current && Date.now() - lastStopAtRef.current < 350) return;
    // Defensive: clear any orphaned interval before starting a new roll.
    if (rollIntervalRef.current) {
      clearInterval(rollIntervalRef.current);
      rollIntervalRef.current = null;
    }
    if (performRollGuardRef.current) {
      clearTimeout(performRollGuardRef.current);
      performRollGuardRef.current = null;
    }
    setIsRolling(true);
    isRollingRef.current = true;
    rollStartedAtRef.current = Date.now();
    setDiceValue(null);

    let count = 0;
    const finish = () => {
      if (rollIntervalRef.current) {
        clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      if (performRollGuardRef.current) {
        clearTimeout(performRollGuardRef.current);
        performRollGuardRef.current = null;
      }
      try {
        onRollDice();
      } finally {
        setIsRolling(false);
        isRollingRef.current = false;
      }
    };
    rollIntervalRef.current = setInterval(() => {
      try {
        sfxDiceTick();
        setDiceValue(Math.floor(Math.random() * activeDiceMax) + 1);
        count++;
        if (count > 12) finish();
      } catch {
        finish();
      }
    }, 80);
    // Hard guard — even if setInterval is throttled (background tab), force-finish at 1.5s.
    performRollGuardRef.current = setTimeout(() => {
      if (isRollingRef.current) finish();
    }, 1500);
  };

  // Effect-based auto-roll scheduling — reacts to the live `rolls` prop
  // so we never act on a stale ref between renders.
  useEffect(() => {
    if (!isAutoRolling || !isAutoRollingRef.current) return;
    if (isRolling) return;
    if (rolls <= 0) { setIsAutoRolling(false); return; }
    const t = setTimeout(() => {
      if (
        isAutoRollingRef.current &&
        !isRollingRef.current &&
        rollsRef.current > 0 &&
        Date.now() - lastStopAtRef.current > 350
      ) {
        performRoll();
      }
    }, 900);
    return () => clearTimeout(t);
  }, [isAutoRolling, isRolling, rolls]);

  const handleRoll = () => performRoll();

  const stopAutoRoll = () => {
    isAutoRollingRef.current = false;
    setIsAutoRolling(false);
    justStoppedRef.current = true;
    lastStopAtRef.current = Date.now();
    if (autoRollTimerRef.current) {
      clearTimeout(autoRollTimerRef.current);
      autoRollTimerRef.current = null;
    }
    // Clear hold timers so any in-flight hold doesn't immediately re-arm auto.
    clearHoldTimers();
    // Drop justStopped after the roll-debounce window
    setTimeout(() => { justStoppedRef.current = false; }, 400);
  };

  const clearHoldTimers = () => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (holdRafRef.current) { cancelAnimationFrame(holdRafRef.current); holdRafRef.current = null; }
    setHoldProgress(0);
  };

  const handlePressStart = () => {
    // If currently auto-rolling, this tap stops it (and skips queueing a new roll)
    if (isAutoRollingRef.current) { stopAutoRoll(); return; }
    if (rolls <= 0) return;
    justStoppedRef.current = false;
    const start = performance.now();
    const HOLD_MS = 700; // short hold delay (was 2000) — matches reference interaction
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / HOLD_MS);
      setHoldProgress(p);
      if (p < 1) holdRafRef.current = requestAnimationFrame(tick);
    };
    holdRafRef.current = requestAnimationFrame(tick);
    holdTimerRef.current = setTimeout(() => {
      isAutoRollingRef.current = true;
      setIsAutoRolling(true);
      clearHoldTimers();
      performRoll();
    }, HOLD_MS);
  };

  const handlePressEnd = (triggered: boolean) => {
    const wasHolding = holdTimerRef.current !== null;
    clearHoldTimers();
    // If we just stopped auto-roll on this pointer cycle, do NOT queue a new roll
    if (justStoppedRef.current) {
      justStoppedRef.current = false;
      return;
    }
    if (wasHolding && triggered && !isAutoRollingRef.current) {
      performRoll();
    }
  };

  useEffect(() => {
    return () => {
      clearHoldTimers();
      if (autoRollTimerRef.current) clearTimeout(autoRollTimerRef.current);
    };
  }, []);

  // Visible tiles: show a window around current position
  const visibleRange = 9;
  const visibleTiles: (BoardTile & { offset: number })[] = [];
  for (let i = -2; i <= visibleRange - 3; i++) {
    const idx = ((position + i) % BOARD_TILES.length + BOARD_TILES.length) % BOARD_TILES.length;
    visibleTiles.push({ ...BOARD_TILES[idx], offset: i });
  }

  return (
    <div
      className={`flex flex-col items-center gap-4 w-full ${isShaking ? "animate-shake" : ""} ${fullscreen ? "h-full relative" : ""}`}
      role="region"
      aria-label="Game board"
    >
      {/* 3D Isometric Board */}
      <div className={fullscreen ? "absolute inset-0" : "relative w-full"}>
        <IsometricBoard
          position={position}
          monster={monster}
          isMoving={isRolling}
          movementResult={lastResult}
          levelId={levelId}
          seasonAccent={seasonAccent}
          seasonGlow={seasonGlow}
          fullscreen={fullscreen}
        />
        {/* Season symbol particle burst */}
        <AnimatePresence>
          {seasonSymbol && seasonBurstKey > 0 && (
            <SeasonBurst key={seasonBurstKey} symbol={seasonSymbol} />
          )}
        </AnimatePresence>
      </div>

      {/* Result display — only after monster lands */}
      <div className={fullscreen ? "absolute left-1/2 -translate-x-1/2 bottom-[12.5rem] z-30 flex flex-col items-center gap-2 pointer-events-none" : "contents"}>
      <AnimatePresence>
        {lastResult && showResult && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-2 banner-gold px-4 py-1.5"
            role="status"
            aria-live="polite"
            aria-label={`Moved ${lastResult.steps} steps. ${lastResult.tile.value >= 0 ? "Gained" : "Lost"} ${Math.abs(lastResult.tile.value)} coins.`}
          >
            <span className="text-lg" aria-hidden="true">
              {lastResult.tile.type === "bonus"
                ? <Zap size={18} className="text-yellow-500 drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]" fill="currentColor" />
                : TILE_EMOJIS[lastResult.tile.type]}
            </span>
            <span className="font-display text-sm">+{lastResult.steps}</span>
            <span className={`font-display ${lastResult.tile.value >= 0 ? "text-wood-dark" : "text-destructive"}`}>
              {lastResult.tile.value >= 0 ? `+${lastResult.tile.value}` : lastResult.tile.value} 🪙
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Roll dial — Coin-Master style glossy blue circle with AUTO pill on the left.
          In fullscreen we lift the dial above the bottom dock + bet selector so it never overlaps.
          The standalone BET pill was removed to avoid colliding with the BetSelector pill row. */}
      <div
        className={`${fullscreen ? "absolute left-1/2 -translate-x-1/2 z-30 pointer-events-auto" : ""} flex flex-col items-center gap-1.5`}
        style={fullscreen ? { bottom: "calc(env(safe-area-inset-bottom, 0px) + 7.5rem)" } : undefined}
      >
        {/* Row: AUTO pill | Dial | spacer */}
        <div className="flex items-end gap-2">
          {/* AUTO toggle pill (purple) */}
          <button
            type="button"
            onClick={() => {
              if (isAutoRollingRef.current) { stopAutoRoll(); return; }
              if (rolls <= 0) return;
              isAutoRollingRef.current = true;
              setIsAutoRolling(true);
              performRoll();
            }}
            className={`pill-auto px-2.5 py-1.5 text-[11px] leading-tight flex flex-col items-center min-w-[52px] sm:min-w-[60px] ${rolls <= 0 && !isAutoRolling ? "opacity-50" : ""}`}
            aria-label={isAutoRolling ? "Stop auto-roll" : "Start auto-roll"}
          >
            <span>{isAutoRolling ? "STOP" : "AUTO"}</span>
            <span className="text-[9px] opacity-90 mt-0.5">{isAutoRolling ? "TAP" : `${rolls}`}</span>
          </button>

          {/* The big blue dial */}
          <div className="relative">
            <div className="absolute inset-0 translate-y-4 rounded-full bg-black/40 blur-lg" aria-hidden="true" />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onPointerDown={handlePressStart}
              onPointerUp={() => handlePressEnd(true)}
              onPointerLeave={() => handlePressEnd(false)}
              onPointerCancel={() => handlePressEnd(false)}
              disabled={rolls <= 0 && !isAutoRolling}
              aria-label={rolls <= 0 ? "No rolls remaining" : isAutoRolling ? "Auto-rolling. Tap to stop." : isRolling ? "Rolling dice..." : `Roll. Tap or hold to auto-roll. ${rolls} rolls remaining.`}
              className={`roll-dial relative w-[76px] h-[76px] sm:w-[96px] sm:h-[96px] rounded-full flex flex-col items-center justify-center font-display select-none touch-none ${
                rolls <= 0 && !isAutoRolling ? "opacity-60 grayscale cursor-not-allowed" : ""
              }`}
            >
              {holdProgress > 0 && holdProgress < 1 && (
                <svg className="absolute -inset-1 w-[calc(100%+0.5rem)] h-[calc(100%+0.5rem)] pointer-events-none" viewBox="0 0 100 100" aria-hidden="true">
                  <circle
                    cx="50" cy="50" r="46"
                    fill="none"
                    stroke="hsl(var(--gold))"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={2 * Math.PI * 46 * (1 - holdProgress)}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              )}
              {isRolling ? (
                <motion.span animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 0.5 }} className="text-3xl" aria-hidden="true">
                  ⚡
                </motion.span>
              ) : (
                <>
                  <Zap size={26} className="text-yellow-200 drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]" fill="currentColor" />
                  <span className="text-lg leading-none mt-0.5">{rolls.toLocaleString()}</span>
                  <span className="text-[9px] opacity-80 leading-none mt-0.5">/ {activeDiceMax * 5}</span>
                </>
              )}
              {diceValue && isRolling && (
                <motion.span
                  key={diceValue}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-3 -right-3 pill-gold w-9 h-9 flex items-center justify-center text-base"
                  aria-hidden="true"
                >
                  {diceValue}
                </motion.span>
              )}
            </motion.button>
          </div>

          {/* Spacer to balance the AUTO pill so the dial stays centered */}
          <div className="w-[52px] sm:w-[60px]" aria-hidden="true" />
        </div>

        {/* Tiny status row */}
        <div className="flex items-center gap-1.5 text-[9px] font-display text-cream-light/95 drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]">
          <span>ROLLS {rolls}</span>
          <span className="opacity-70">• 1–{activeDiceMax}</span>
          <span className="opacity-90">⭐ {islandStars}/5</span>
          {pendingCardFlips > 0 && (
            <motion.span
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="pill-gold px-1.5 py-0 text-[9px]"
            >
              🃏 ×{pendingCardFlips}
            </motion.span>
          )}
        </div>
      </div>
    </div>
  );
}

// Celebratory burst of season symbols radiating from the center of the board
function SeasonBurst({ symbol }: { symbol: string }) {
  const pieces = Array.from({ length: 12 });
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      aria-hidden="true"
    >
      {pieces.map((_, i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        const distance = 80 + Math.random() * 60;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance - 20;
        return (
          <motion.span
            key={i}
            className="absolute text-2xl"
            initial={{ opacity: 0, scale: 0.4, x: 0, y: 0, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.4, 1.1, 1, 0.7],
              x,
              y,
              rotate: (Math.random() - 0.5) * 360,
            }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}
          >
            {symbol}
          </motion.span>
        );
      })}
    </motion.div>
  );
}
