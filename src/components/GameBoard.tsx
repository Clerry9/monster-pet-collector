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
  lastResult: { steps: number; tile: BoardTile } | null;
  onRollDice: () => void;
  activeDiceMax: number;
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

export function GameBoard({ position, monster, rolls, lastResult, onRollDice, activeDiceMax }: GameBoardProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const monsterControls = useAnimation();
  const prevPositionRef = useRef(position);

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

  // Trigger effects when landing on a tile
  useEffect(() => {
    if (lastResult && !isRolling) {
      if (lastResult.tile.type === "skull") {
        triggerSkullEffect();
      } else if (lastResult.tile.value > 0) {
        sfxCoinGain();
      }
    }
  }, [lastResult, isRolling]);

  const handleRoll = () => {
    if (isRolling || rolls <= 0) return;
    setIsRolling(true);
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
      }
    }, 80);
  };

  // Visible tiles: show a window around current position
  const visibleRange = 9;
  const visibleTiles: (BoardTile & { offset: number })[] = [];
  for (let i = -2; i <= visibleRange - 3; i++) {
    const idx = ((position + i) % BOARD_TILES.length + BOARD_TILES.length) % BOARD_TILES.length;
    visibleTiles.push({ ...BOARD_TILES[idx], offset: i });
  }

  return (
    <div
      className={`flex flex-col items-center gap-4 w-full ${isShaking ? "animate-shake" : ""}`}
      role="region"
      aria-label="Game board"
    >
      {/* 3D Isometric Board */}
      <IsometricBoard
        position={position}
        monster={monster}
        isMoving={isRolling}
      />

      {/* Result display */}
      <AnimatePresence>
        {lastResult && !isRolling && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-2 rounded-full bg-card px-4 py-2 border border-border"
            role="status"
            aria-live="polite"
            aria-label={`Moved ${lastResult.steps} steps. ${lastResult.tile.value >= 0 ? "Gained" : "Lost"} ${Math.abs(lastResult.tile.value)} coins.`}
          >
            <span className="text-lg" aria-hidden="true">{TILE_EMOJIS[lastResult.tile.type]}</span>
            <span className="font-body font-bold text-sm text-foreground">
              Moved {lastResult.steps} steps!
            </span>
            <span className={`font-extrabold ${lastResult.tile.value >= 0 ? "text-primary" : "text-destructive"}`}>
              {lastResult.tile.value >= 0 ? `+${lastResult.tile.value}` : lastResult.tile.value} 🪙
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dice */}
      <div className="flex flex-col items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.85, rotate: 15 }}
          whileHover={{ scale: 1.05 }}
          onClick={handleRoll}
          disabled={isRolling || rolls <= 0}
          aria-label={rolls <= 0 ? "No rolls remaining" : isRolling ? "Rolling dice..." : `Roll dice, range 1 to ${activeDiceMax}`}
          className={`relative w-24 h-24 rounded-2xl border-4 flex items-center justify-center font-display text-3xl transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            rolls <= 0
              ? "border-muted bg-muted/50 text-muted-foreground cursor-not-allowed"
              : "border-primary bg-card text-foreground box-glow-green"
          }`}
        >
          {isRolling ? (
            <motion.span
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 0.3 }}
              className="text-4xl"
              aria-hidden="true"
            >
              🎲
            </motion.span>
          ) : (
            <span className="text-4xl" aria-hidden="true">🎲</span>
          )}
          {diceValue && isRolling && (
            <motion.span
              key={diceValue}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center"
              aria-hidden="true"
            >
              {diceValue}
            </motion.span>
          )}
        </motion.button>

        <div className="flex items-center gap-2 text-sm font-body" aria-label={`${rolls} rolls remaining, dice range 1 to ${activeDiceMax}`}>
          <span className="text-muted-foreground">Rolls left:</span>
          <span className={`font-extrabold ${rolls > 0 ? "text-primary" : "text-destructive"}`}>
            {rolls}
          </span>
          <span className="text-muted-foreground/50">• 1-{activeDiceMax}</span>
        </div>
      </div>
    </div>
  );
}
