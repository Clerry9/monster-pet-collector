import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { BOARD_TILES, BoardTile, TileType } from "@/hooks/useGameState";
import { Monster } from "@/data/monsters";

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
  monster: "👾",
  skull: "💀",
  star: "⭐",
};

const TILE_COLORS: Record<TileType, string> = {
  coins: "bg-accent/20 border-accent/40",
  bonus: "bg-primary/20 border-primary/40",
  chest: "bg-secondary/20 border-secondary/40",
  monster: "bg-destructive/20 border-destructive/40",
  skull: "bg-destructive/30 border-destructive/50",
  star: "bg-accent/30 border-accent/60",
};

export function GameBoard({ position, monster, rolls, lastResult, onRollDice, activeDiceMax }: GameBoardProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const monsterControls = useAnimation();
  const prevPositionRef = useRef(position);

  // Animate monster on position change
  useEffect(() => {
    if (position !== prevPositionRef.current) {
      const steps = ((position - prevPositionRef.current) % BOARD_TILES.length + BOARD_TILES.length) % BOARD_TILES.length;
      prevPositionRef.current = position;

      // Hop animation sequence
      const hopSequence = async () => {
        for (let i = 0; i < Math.min(steps, 6); i++) {
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
        // Landing bounce
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

  const handleRoll = () => {
    if (isRolling || rolls <= 0) return;
    setIsRolling(true);
    setDiceValue(null);

    let count = 0;
    const interval = setInterval(() => {
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
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Path visualization */}
      <div className="relative w-full max-w-md h-28 overflow-hidden rounded-2xl bg-card border border-border">
        {/* Scrolling path */}
        <div className="absolute inset-0 flex items-center">
          <AnimatePresence mode="popLayout">
            {visibleTiles.map((tile) => {
              const isActive = tile.offset === 0;
              return (
                <motion.div
                  key={`${tile.id}-${tile.offset}`}
                  initial={{ x: 60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -60, opacity: 0 }}
                  className={`flex-shrink-0 w-14 h-14 mx-1 rounded-xl border-2 flex flex-col items-center justify-center text-xs font-bold transition-all ${
                    TILE_COLORS[tile.type]
                  } ${isActive ? "ring-2 ring-primary scale-110 z-10" : "opacity-70"}`}
                >
                  <span className="text-lg">{TILE_EMOJIS[tile.type]}</span>
                  <span className={`text-[10px] ${tile.value >= 0 ? "text-primary" : "text-destructive"}`}>
                    {tile.value >= 0 ? `+${tile.value}` : tile.value}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Monster on current tile */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 -top-1 z-20"
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <img src={monster.image} alt={monster.name} className="w-12 h-12 drop-shadow-lg" />
        </motion.div>
      </div>

      {/* Result display */}
      <AnimatePresence>
        {lastResult && !isRolling && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-2 rounded-full bg-card px-4 py-2 border border-border"
          >
            <span className="text-lg">{TILE_EMOJIS[lastResult.tile.type]}</span>
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
          className={`relative w-24 h-24 rounded-2xl border-4 flex items-center justify-center font-display text-3xl transition-all cursor-pointer ${
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
            >
              🎲
            </motion.span>
          ) : (
            <span className="text-4xl">🎲</span>
          )}
          {diceValue && isRolling && (
            <motion.span
              key={diceValue}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center"
            >
              {diceValue}
            </motion.span>
          )}
        </motion.button>

        <div className="flex items-center gap-2 text-sm font-body">
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
