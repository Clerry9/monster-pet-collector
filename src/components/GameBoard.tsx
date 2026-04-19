import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { BOARD_TILES, BoardTile, TileType } from "@/hooks/useGameState";
import { Monster } from "@/data/monsters";
import { sfxDiceTick, sfxHop, sfxLand, sfxCoinGain, sfxSkull } from "@/lib/sfx";
import { IsometricBoard } from "@/components/IsometricBoard";

interface GameBoardProps {
  position: number;
  monster: Monster;
  rolls: number;
  lastResult: { steps: number; tile: BoardTile; islandStarEarned?: boolean } | null;
  onRollDice: () => void;
  activeDiceMax: number;
  levelId?: number;
  seasonAccent?: string;
  seasonGlow?: string;
  seasonSymbol?: string;
  fullscreen?: boolean;
  islandStars?: number;
  pendingCardFlips?: number;
}

const TILE_EMOJIS: Record<TileType, string> = {
  coins: "🪙",
  bonus: "⚡",
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

export function GameBoard({ position, monster, rolls, lastResult, onRollDice, activeDiceMax, levelId = 1, seasonAccent, seasonGlow, seasonSymbol, fullscreen = false, islandStars = 0, pendingCardFlips = 0 }: GameBoardProps) {
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
  const isRollingRef = useRef(false);
  const rollsRef = useRef(rolls);
  const isAutoRollingRef = useRef(false);
  const justStoppedRef = useRef(false);

  useEffect(() => { rollsRef.current = rolls; }, [rolls]);
  useEffect(() => { isRollingRef.current = isRolling; }, [isRolling]);
  useEffect(() => { isAutoRollingRef.current = isAutoRolling; }, [isAutoRolling]);

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
    }, landDelay);
    return () => { if (resultTimerRef.current) clearTimeout(resultTimerRef.current); };
  }, [lastResult, isRolling, seasonSymbol]);

  const performRoll = () => {
    if (isRollingRef.current || rollsRef.current <= 0) return;
    setIsRolling(true);
    isRollingRef.current = true;
    setDiceValue(null);

    let count = 0;
    const interval = setInterval(() => {
      sfxDiceTick();
      setDiceValue(Math.floor(Math.random() * activeDiceMax) + 1);
      count++;
      if (count > 12) {
        clearInterval(interval);
        onRollDice();
        setIsRolling(false);
        isRollingRef.current = false;
        // Schedule next auto-roll after monster has finished hopping
        if (isAutoRollingRef.current && rollsRef.current > 0) {
          if (autoRollTimerRef.current) clearTimeout(autoRollTimerRef.current);
          autoRollTimerRef.current = setTimeout(() => {
            if (isAutoRollingRef.current && !isRollingRef.current && rollsRef.current > 0) {
              performRoll();
            } else if (rollsRef.current <= 0) {
              setIsAutoRolling(false);
            }
          }, 900);
        } else if (isAutoRollingRef.current) {
          setIsAutoRolling(false);
        }
      }
    }, 80);
  };

  const handleRoll = () => performRoll();

  const stopAutoRoll = () => {
    isAutoRollingRef.current = false;
    setIsAutoRolling(false);
    justStoppedRef.current = true;
    if (autoRollTimerRef.current) {
      clearTimeout(autoRollTimerRef.current);
      autoRollTimerRef.current = null;
    }
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
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / 2000);
      setHoldProgress(p);
      if (p < 1) holdRafRef.current = requestAnimationFrame(tick);
    };
    holdRafRef.current = requestAnimationFrame(tick);
    holdTimerRef.current = setTimeout(() => {
      isAutoRollingRef.current = true;
      setIsAutoRolling(true);
      clearHoldTimers();
      performRoll();
    }, 2000);
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
      className={`flex flex-col items-center gap-4 w-full ${isShaking ? "animate-shake" : ""} ${fullscreen ? "h-full" : ""}`}
      role="region"
      aria-label="Game board"
    >
      {/* 3D Isometric Board */}
      <div className={fullscreen ? "relative w-full h-full" : "relative w-full"}>
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
            <span className="text-lg" aria-hidden="true">{TILE_EMOJIS[lastResult.tile.type]}</span>
            <span className="font-display text-sm">+{lastResult.steps}</span>
            <span className={`font-display ${lastResult.tile.value >= 0 ? "text-wood-dark" : "text-destructive"}`}>
              {lastResult.tile.value >= 0 ? `+${lastResult.tile.value}` : lastResult.tile.value} 🪙
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRESS button */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className="absolute inset-0 translate-y-3 rounded-full bg-wood-dark/30 blur-md" aria-hidden="true" />
          <div className="relative rounded-full p-2 bg-gradient-to-b from-[hsl(0_0%_55%)] to-[hsl(0_0%_30%)] border-[5px] border-wood-dark shadow-chunky">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onPointerDown={handlePressStart}
              onPointerUp={() => handlePressEnd(true)}
              onPointerLeave={() => handlePressEnd(false)}
              onPointerCancel={() => handlePressEnd(false)}
              disabled={(isRolling && !isAutoRolling) || (rolls <= 0 && !isAutoRolling)}
              aria-label={rolls <= 0 ? "No rolls remaining" : isAutoRolling ? "Auto-rolling. Tap to stop." : isRolling ? "Rolling dice..." : `Roll dice. Tap to roll, hold 2 seconds to auto-roll. Range 1 to ${activeDiceMax}`}
              className={`btn-press relative w-28 h-28 rounded-full flex items-center justify-center font-display text-2xl select-none touch-none ${
                rolls <= 0 && !isAutoRolling ? "opacity-60 grayscale cursor-not-allowed" : ""
              } ${isAutoRolling ? "!bg-gradient-to-b !from-candy-red !to-destructive" : ""}`}
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
                <motion.span
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 0.4 }}
                  className="text-3xl"
                  aria-hidden="true"
                >
                  🎲
                </motion.span>
              ) : isAutoRolling ? (
                <span className="leading-none text-candy-red">STOP</span>
              ) : (
                <span className="leading-none">PRESS</span>
              )}
              {isAutoRolling && (
                <motion.span
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 banner-gold text-[10px] px-2 py-0.5 whitespace-nowrap"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  aria-hidden="true"
                >
                  AUTO • TAP TO STOP
                </motion.span>
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
        </div>

        <div className="flex items-center gap-2 text-xs font-display text-wood-dark" aria-label={`${rolls} rolls remaining, dice range 1 to ${activeDiceMax}`}>
          <span>ROLLS</span>
          <span className={`pill-gold px-2 py-0.5 text-sm ${rolls <= 0 ? "opacity-60" : ""}`}>{rolls}</span>
          <span className="text-wood-dark/60">• 1-{activeDiceMax}</span>
          <span className="ml-1 pill-gold px-2 py-0.5 text-sm flex items-center gap-1" title={`${islandStars}/5 stars to next card flip`}>
            ⭐ {islandStars}/5
          </span>
          {pendingCardFlips > 0 && (
            <motion.span
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="pill-gold px-2 py-0.5 text-sm bg-gradient-to-r from-candy-red to-gold text-cream-light"
            >
              🃏 ×{pendingCardFlips}
            </motion.span>
          )}
        </div>
        <div className="text-[10px] font-display tracking-wider text-wood-dark/70">
          HOLD FOR AUTOSPIN
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
