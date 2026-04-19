import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Trophy, Lightbulb } from "lucide-react";
import { Season } from "@/data/seasons";
import { sfxCoinGain, sfxLevelUp } from "@/lib/sfx";
import { useTutorial } from "@/hooks/useTutorial";

interface MiniGameProps {
  season: Season;
  onFinish: (symbolsEarned: number, score: number) => void;
  onClose: () => void;
  costRolls: number;
  hasRolls: boolean;
  onSpendRoll: () => void;
  coins: number;
  onBuyStreakSaver: () => boolean;
}

const STREAK_SAVER_COST = 500;
const STREAK_SAVER_WINDOW_MS = 4000;
const DEFAULT_WINDOW_MS = 2000;

// 5x5 match-3-style: tap a tile, tap an adjacent tile to swap.
// Any horizontal/vertical run of 3+ matching emojis clears, scores, and
// has a chance to drop the special symbol.
const SIZE = 5;
const ROUND_SECONDS = 45;
const SYMBOL_DROP_RATE = 0.18; // chance a refilled tile becomes the special symbol
const SCORE_BONUS_PER = 120;   // +1 symbol per N score

type Cell = { id: number; emoji: string };

function randomBoard(palette: string[], symbol: string, idStart = 0): Cell[] {
  const cells: Cell[] = [];
  // Weight pool toward special symbol (~14% of starting tiles)
  const pool = [...palette, ...palette, ...palette, symbol, symbol];
  for (let i = 0; i < SIZE * SIZE; i++) {
    cells.push({ id: idStart + i, emoji: pool[Math.floor(Math.random() * pool.length)] });
  }
  return cells;
}

function findMatches(cells: Cell[]): Set<number> {
  const matched = new Set<number>();
  // Rows
  for (let r = 0; r < SIZE; r++) {
    let runStart = 0;
    for (let c = 1; c <= SIZE; c++) {
      const prev = cells[r * SIZE + c - 1].emoji;
      const cur = c < SIZE ? cells[r * SIZE + c].emoji : null;
      if (cur !== prev) {
        const len = c - runStart;
        if (len >= 3) for (let k = runStart; k < c; k++) matched.add(r * SIZE + k);
        runStart = c;
      }
    }
  }
  // Cols
  for (let c = 0; c < SIZE; c++) {
    let runStart = 0;
    for (let r = 1; r <= SIZE; r++) {
      const prev = cells[(r - 1) * SIZE + c].emoji;
      const cur = r < SIZE ? cells[r * SIZE + c].emoji : null;
      if (cur !== prev) {
        const len = r - runStart;
        if (len >= 3) for (let k = runStart; k < r; k++) matched.add(k * SIZE + c);
        runStart = r;
      }
    }
  }
  return matched;
}

export function MiniGame({ season, onFinish, onClose, costRolls, hasRolls, onSpendRoll }: MiniGameProps) {
  const miniTutorial = useTutorial("minigame");
  const [phase, setPhase] = useState<"intro" | "playing" | "result">("intro");
  const [cells, setCells] = useState<Cell[]>([]);
  const [score, setScore] = useState(0);
  const [symbolsCollected, setSymbolsCollected] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [combo, setCombo] = useState(0);
  const [comboFlash, setComboFlash] = useState<{ key: number; mult: number; bonus: number } | null>(null);
  const idCounter = useRef(0);
  const matchPulseRef = useRef<number[]>([]);
  const lastMatchAtRef = useRef(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      setPhase("result");
      sfxLevelUp();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // Cleanup combo timer
  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    };
  }, []);

  const startGame = () => {
    if (!hasRolls) return;
    onSpendRoll();
    miniTutorial.markCompleted();
    idCounter.current = SIZE * SIZE;
    setCells(randomBoard(season.miniGameTiles, season.symbol));
    setScore(0);
    setSymbolsCollected(0);
    setSelected(null);
    setTimeLeft(ROUND_SECONDS);
    setCombo(0);
    setComboFlash(null);
    lastMatchAtRef.current = 0;
    setPhase("playing");
  };

  const resolveMatches = (board: Cell[]): Cell[] => {
    let working = [...board];
    let total = 0;
    let symbols = 0;
    let safety = 8;
    while (safety-- > 0) {
      const matched = findMatches(working);
      if (matched.size === 0) break;
      // Score + count symbols cleared
      matched.forEach((idx) => {
        if (working[idx].emoji === season.symbol) symbols += 1;
      });
      total += matched.size * 10;
      // Replace matched cells
      working = working.map((cell, i) => {
        if (!matched.has(i)) return cell;
        const newEmoji = season.miniGameTiles[Math.floor(Math.random() * season.miniGameTiles.length)];
        // Higher chance dropped tile spawns the special symbol
        const finalEmoji = Math.random() < SYMBOL_DROP_RATE ? season.symbol : newEmoji;
        idCounter.current += 1;
        return { id: idCounter.current, emoji: finalEmoji };
      });
    }
    if (total > 0) {
      // --- Streak combo: chained matches within 2s award bonus symbols ---
      const now = performance.now();
      const isChain = now - lastMatchAtRef.current < 2000;
      const newCombo = isChain ? combo + 1 : 1;
      setCombo(newCombo);
      lastMatchAtRef.current = now;

      // Combo multiplier: x1 (no bonus), x2 (combo 2), x3 (combo 3+)
      const mult = newCombo >= 3 ? 3 : newCombo >= 2 ? 2 : 1;
      const comboBonus = mult > 1 && symbols > 0 ? symbols * (mult - 1) : 0;

      setScore((s) => s + total * mult);
      const totalSymbols = symbols + comboBonus;
      if (totalSymbols > 0) setSymbolsCollected((s) => s + totalSymbols);
      sfxCoinGain();

      if (mult > 1) {
        setComboFlash({ key: now, mult, bonus: comboBonus });
      }

      // Reset combo after 2s of no chains
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => setCombo(0), 2100);
    }
    return working;
  };

  const tryTap = (idx: number) => {
    if (phase !== "playing") return;
    if (selected === null) {
      setSelected(idx);
      return;
    }
    if (selected === idx) {
      setSelected(null);
      return;
    }
    // Check adjacency
    const r1 = Math.floor(selected / SIZE), c1 = selected % SIZE;
    const r2 = Math.floor(idx / SIZE), c2 = idx % SIZE;
    const adj = (Math.abs(r1 - r2) === 1 && c1 === c2) || (Math.abs(c1 - c2) === 1 && r1 === r2);
    if (!adj) {
      setSelected(idx);
      return;
    }
    // Swap
    const swapped = [...cells];
    [swapped[selected], swapped[idx]] = [swapped[idx], swapped[selected]];
    const matchesAfter = findMatches(swapped);
    if (matchesAfter.size === 0) {
      setSelected(null);
      return; // invalid swap
    }
    matchPulseRef.current = Array.from(matchesAfter);
    setCells(resolveMatches(swapped));
    setSelected(null);
  };

  const symbolsEarned = useMemo(() => {
    // Final reward: cleared symbols + score-based bonus
    return symbolsCollected + Math.floor(score / SCORE_BONUS_PER);
  }, [symbolsCollected, score]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 30 }}
        transition={{ type: "spring", damping: 18 }}
        className="panel-wood w-full max-w-sm p-4 relative"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: `radial-gradient(ellipse at top, hsl(${season.palette.glow} / 0.4), hsl(var(--wood)))`,
        }}
      >
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 icon-tile-gold w-8 h-8 flex items-center justify-center"
          aria-label="Close mini game"
        >
          <X size={16} />
        </button>

        <div className="text-center mb-3">
          <div className="text-3xl mb-1">{season.emoji}</div>
          <h2 className="font-display text-lg text-cream-light tracking-wide">
            {season.name} Mini-Game
          </h2>
          <p className="text-[11px] font-display text-cream/80">
            Match 3+ <span className="text-xl align-middle">{season.symbol}</span> tiles to earn symbols
          </p>
        </div>

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {!miniTutorial.completed && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border-2 border-gold bg-gradient-to-br from-gold/30 to-gold/10 p-2.5 text-wood-dark text-[11px] flex items-start gap-2"
                >
                  <Lightbulb size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="font-display text-[11px]">FIRST TIME?</div>
                    <p>Tap two adjacent tiles to swap them. Line up 3+ matching tiles to clear them and earn points. Cleared <span className="align-middle">{season.symbol}</span> tiles give you season symbols!</p>
                  </div>
                </motion.div>
              )}
              <div className="bg-cream/95 rounded-xl border-2 border-wood-dark p-3 text-wood-dark text-xs space-y-1">
                <p>• {ROUND_SECONDS} seconds, swap adjacent tiles to make matches.</p>
                <p>• 5×5 board — bigger matches, more chances!</p>
                <p>• Each cleared <span className="text-base align-middle">{season.symbol}</span> = 1 special symbol.</p>
                <p>• Bonus: +1 symbol per {SCORE_BONUS_PER} score.</p>
                <p>• Costs <strong>{costRolls} roll</strong> to play.</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                disabled={!hasRolls}
                className="btn-press w-full py-2.5 rounded-full font-display text-base flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play size={16} />
                {hasRolls ? "PLAY NOW" : "Need more rolls"}
              </motion.button>
            </motion.div>
          )}

          {phase === "playing" && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <div className="flex justify-between items-center text-cream-light font-display text-sm">
                <span>⏱ {timeLeft}s</span>
                <span>⚡ {score}</span>
                <span className="flex items-center gap-1">{season.symbol} {symbolsCollected}</span>
              </div>
              <div className="relative grid grid-cols-5 gap-1.5 bg-wood-dark/50 p-2 rounded-xl border-2 border-wood-dark">
                {cells.map((cell, idx) => (
                  <motion.button
                    key={cell.id}
                    onClick={() => tryTap(idx)}
                    layout
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: "spring", duration: 0.25 }}
                    className={`aspect-square rounded-lg flex items-center justify-center text-2xl bg-cream/95 border-2 ${
                      selected === idx
                        ? "border-candy-red ring-2 ring-candy-red/60 scale-110"
                        : "border-wood-dark"
                    } ${cell.emoji === season.symbol ? "shadow-[0_0_12px_3px_hsl(var(--gold)/0.7)]" : ""}`}
                    aria-label={`Tile ${cell.emoji}`}
                  >
                    {cell.emoji}
                  </motion.button>
                ))}
                <AnimatePresence>
                  {comboFlash && (
                    <motion.div
                      key={comboFlash.key}
                      initial={{ opacity: 0, scale: 0.6, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 1.4, y: -20 }}
                      transition={{ duration: 0.6 }}
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    >
                      <div className="bg-gradient-to-r from-candy-red to-gold text-cream-light font-display text-2xl px-4 py-2 rounded-full border-2 border-wood-dark shadow-chunky">
                        COMBO ×{comboFlash.mult}!
                        {comboFlash.bonus > 0 && (
                          <span className="block text-xs">+{comboFlash.bonus} bonus {season.symbol}</span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {combo > 1 && (
                <div className="text-center text-[10px] font-display text-gold">
                  STREAK ×{combo} — chain matches within 2s for bonus {season.symbol}
                </div>
              )}
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 text-center"
            >
              <Trophy className="mx-auto text-gold" size={40} />
              <div className="bg-cream/95 rounded-xl border-2 border-wood-dark p-3 text-wood-dark space-y-1">
                <p className="font-display text-base">Final Score: {score}</p>
                <p className="font-display text-2xl text-candy-red">
                  +{symbolsEarned} {season.symbol}
                </p>
                <p className="text-[11px]">added to your season progress</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onFinish(symbolsEarned, score);
                    setPhase("intro");
                  }}
                  className="btn-press py-2 rounded-full font-display text-sm"
                >
                  CLAIM
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onFinish(symbolsEarned, score);
                    startGame();
                  }}
                  disabled={!hasRolls}
                  className="icon-tile-gold py-2 rounded-full font-display text-sm disabled:opacity-50"
                >
                  PLAY AGAIN
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
