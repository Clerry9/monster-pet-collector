import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Trophy, Lightbulb, Zap, Frown, Heart } from "lucide-react";
import { Season } from "@/data/seasons";
import { sfxCoinGain, sfxLevelUp, sfxSkull } from "@/lib/sfx";
import { useTutorial } from "@/hooks/useTutorial";
import { RewardedAdButton } from "@/components/RewardedAdButton";

interface MiniGameProps {
  season: Season;
  onFinish: (symbolsEarned: number, score: number) => void;
  onClose: () => void;
  costRolls: number;
  hasRolls: boolean;
  onSpendRoll: () => void;
  coins: number;
  onBuyStreakSaver: () => boolean;
  playerLevel?: number;
  onAddCoins?: (n: number) => void;
  onSpendCoins?: (n: number) => boolean;
}

const STREAK_SAVER_COST = 500;
const STREAK_SAVER_WINDOW_MS = 4000;
const DEFAULT_WINDOW_MS = 2000;
const REVIVE_COST = 200;
const BOMB = "💣";

type Difficulty = "easy" | "normal" | "hard";
const DIFFICULTY_KEY = "lov_minigame_difficulty";

interface DiffConfig {
  scoreToWin: number;
  symbolsToWin: number;
  seconds: number;
  bombSpawnEverySec: number; // 0 = never
  maxBombs: number;
  symbolDropRate: number;
  reviveTime: number;
}

const DIFFICULTY: Record<Difficulty, DiffConfig> = {
  easy:   { scoreToWin: 150, symbolsToWin: 4, seconds: 60, bombSpawnEverySec: 0,  maxBombs: 0, symbolDropRate: 0.22, reviveTime: 20 },
  normal: { scoreToWin: 200, symbolsToWin: 5, seconds: 45, bombSpawnEverySec: 8,  maxBombs: 1, symbolDropRate: 0.18, reviveTime: 15 },
  hard:   { scoreToWin: 300, symbolsToWin: 6, seconds: 35, bombSpawnEverySec: 5,  maxBombs: 3, symbolDropRate: 0.14, reviveTime: 12 },
};

const SIZE = 5;
const SCORE_BONUS_PER = 120;

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

export function MiniGame({ season, onFinish, onClose, costRolls, hasRolls, onSpendRoll, coins, onBuyStreakSaver, playerLevel = 1, onAddCoins, onSpendCoins }: MiniGameProps) {
  const miniTutorial = useTutorial("minigame");
  const [streakSaver, setStreakSaver] = useState(false);
  const [phase, setPhase] = useState<"intro" | "playing" | "result">("intro");
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const saved = localStorage.getItem(DIFFICULTY_KEY) as Difficulty | null;
    return saved && DIFFICULTY[saved] ? saved : "normal";
  });
  const cfg = DIFFICULTY[difficulty];
  const [cells, setCells] = useState<Cell[]>([]);
  const [score, setScore] = useState(0);
  const [symbolsCollected, setSymbolsCollected] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(cfg.seconds);
  const [combo, setCombo] = useState(0);
  const [comboFlash, setComboFlash] = useState<{ key: number; mult: number; bonus: number } | null>(null);
  const [hasRevived, setHasRevived] = useState(false);
  const idCounter = useRef(0);
  const matchPulseRef = useRef<number[]>([]);
  const lastMatchAtRef = useRef(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bombTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const chooseDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    localStorage.setItem(DIFFICULTY_KEY, d);
  };

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

  // Bomb spawner
  useEffect(() => {
    if (phase !== "playing" || cfg.bombSpawnEverySec === 0) return;
    bombTimerRef.current = setInterval(() => {
      setCells((prev) => {
        const bombCount = prev.filter((c) => c.emoji === BOMB).length;
        if (bombCount >= cfg.maxBombs) return prev;
        const candidates = prev.map((c, i) => (c.emoji !== BOMB ? i : -1)).filter((i) => i >= 0);
        if (candidates.length === 0) return prev;
        const idx = candidates[Math.floor(Math.random() * candidates.length)];
        idCounter.current += 1;
        const next = [...prev];
        next[idx] = { id: idCounter.current, emoji: BOMB };
        return next;
      });
    }, cfg.bombSpawnEverySec * 1000);
    return () => { if (bombTimerRef.current) clearInterval(bombTimerRef.current); };
  }, [phase, cfg.bombSpawnEverySec, cfg.maxBombs]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      if (bombTimerRef.current) clearInterval(bombTimerRef.current);
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
    setTimeLeft(cfg.seconds);
    setCombo(0);
    setComboFlash(null);
    lastMatchAtRef.current = 0;
    setStreakSaver(false);
    setHasRevived(false);
    setPhase("playing");
  };

  const revive = (clearBombs: boolean) => {
    setCells((prev) =>
      prev.map((c) => {
        if (c.emoji === BOMB && clearBombs) {
          idCounter.current += 1;
          const newEmoji = season.miniGameTiles[Math.floor(Math.random() * season.miniGameTiles.length)];
          return { id: idCounter.current, emoji: newEmoji };
        }
        return c;
      })
    );
    setTimeLeft(cfg.reviveTime);
    setHasRevived(true);
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
        const finalEmoji = Math.random() < cfg.symbolDropRate ? season.symbol : newEmoji;
        idCounter.current += 1;
        return { id: idCounter.current, emoji: finalEmoji };
      });
    }
    if (total > 0) {
      // --- Streak combo: chained matches within 2s award bonus symbols ---
      const now = performance.now();
      const chainWindow = streakSaver ? STREAK_SAVER_WINDOW_MS : DEFAULT_WINDOW_MS;
      const isChain = now - lastMatchAtRef.current < chainWindow;
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
      comboTimerRef.current = setTimeout(() => setCombo(0), chainWindow + 100);
    }
    return working;
  };

  const tryTap = (idx: number) => {
    if (phase !== "playing") return;
    // Tapping a bomb ends the round (or costs 50 score on Easy where there are none anyway)
    if (cells[idx]?.emoji === BOMB) {
      sfxSkull();
      if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
      setPhase("result");
      return;
    }
    if (selected === null) {
      setSelected(idx);
      return;
    }
    if (selected === idx) {
      setSelected(null);
      return;
    }
    const r1 = Math.floor(selected / SIZE), c1 = selected % SIZE;
    const r2 = Math.floor(idx / SIZE), c2 = idx % SIZE;
    const adj = (Math.abs(r1 - r2) === 1 && c1 === c2) || (Math.abs(c1 - c2) === 1 && r1 === r2);
    if (!adj) {
      setSelected(idx);
      return;
    }
    const swapped = [...cells];
    [swapped[selected], swapped[idx]] = [swapped[idx], swapped[selected]];
    const matchesAfter = findMatches(swapped);
    if (matchesAfter.size === 0) {
      setSelected(null);
      return;
    }
    matchPulseRef.current = Array.from(matchesAfter);
    setCells(resolveMatches(swapped));
    setSelected(null);
  };

  const didWin = score >= cfg.scoreToWin || symbolsCollected >= cfg.symbolsToWin;
  const symbolsEarned = useMemo(() => {
    if (!didWin) return 0;
    return symbolsCollected + Math.floor(score / SCORE_BONUS_PER);
  }, [symbolsCollected, score, didWin]);

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
              {/* Difficulty selector */}
              <div className="rounded-xl border-2 border-wood-dark bg-cream/95 p-2">
                <div className="text-[10px] font-display text-wood-dark/70 text-center mb-1.5">DIFFICULTY</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => chooseDifficulty(d)}
                      className={`rounded-lg border-2 px-2 py-1.5 font-display text-[11px] uppercase transition ${
                        difficulty === d
                          ? "border-candy-red bg-gradient-to-b from-candy-red to-destructive text-cream-light shadow-chunky-sm"
                          : "border-wood-dark bg-cream text-wood-dark hover:bg-cream/80"
                      }`}
                    >
                      {d === "easy" ? "🟢 Easy" : d === "normal" ? "🟡 Normal" : "🔴 Hard"}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-wood-dark/70 text-center mt-1.5">
                  {cfg.seconds}s • Win at {cfg.scoreToWin} pts or {cfg.symbolsToWin} {season.symbol} • {cfg.maxBombs > 0 ? `up to ${cfg.maxBombs} 💣` : "no bombs"}
                </div>
              </div>
              <div className="bg-cream/95 rounded-xl border-2 border-wood-dark p-3 text-wood-dark text-xs space-y-1">
                <p>• {cfg.seconds} seconds, swap adjacent tiles to make matches.</p>
                <p>• 5×5 board — bigger matches, more chances!</p>
                <p>• Each cleared <span className="text-base align-middle">{season.symbol}</span> = 1 special symbol.</p>
                <p>• Bonus: +1 symbol per {SCORE_BONUS_PER} score.</p>
                <p>• <strong className="text-candy-red">WIN:</strong> reach {cfg.scoreToWin} score OR collect {cfg.symbolsToWin} {season.symbol} before time runs out!</p>
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
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  if (streakSaver) return;
                  if (coins < STREAK_SAVER_COST) return;
                  if (onBuyStreakSaver()) setStreakSaver(true);
                }}
                disabled={streakSaver || coins < STREAK_SAVER_COST}
                animate={combo > 1 && streakSaver ? { boxShadow: ["0 0 0 0 hsl(var(--gold)/0)", "0 0 0 4px hsl(var(--gold)/0.6)", "0 0 0 0 hsl(var(--gold)/0)"] } : undefined}
                transition={{ duration: 1.2, repeat: Infinity }}
                className={`w-full rounded-full border-2 border-wood-dark px-3 py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-display ${
                  streakSaver
                    ? "bg-gradient-to-r from-gold to-candy-red text-cream-light"
                    : "bg-cream/95 text-wood-dark disabled:opacity-50"
                }`}
              >
                <Zap size={12} />
                {streakSaver ? "STREAK SAVER ACTIVE — 4s combo window" : `STREAK SAVER — 500 🪙 (extends combo to 4s)`}
              </motion.button>
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
                  STREAK ×{combo} — chain matches within {streakSaver ? "4s" : "2s"} for bonus {season.symbol}
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
              {didWin ? (
                <>
                  <Trophy className="mx-auto text-gold" size={40} />
                  <div className="bg-cream/95 rounded-xl border-2 border-wood-dark p-3 text-wood-dark space-y-1">
                    <p className="font-display text-base text-candy-red">VICTORY!</p>
                    <p className="font-display text-sm">Final Score: {score}</p>
                    <p className="font-display text-2xl text-candy-red">
                      +{symbolsEarned} {season.symbol}
                    </p>
                    <p className="text-[11px]">added to your season progress</p>
                  </div>
                </>
              ) : (
                <>
                  <Frown className="mx-auto text-destructive" size={40} />
                  <div className="bg-cream/95 rounded-xl border-2 border-destructive p-3 text-wood-dark space-y-1">
                    <p className="font-display text-base text-destructive">GAME OVER</p>
                    <p className="font-display text-sm">Final Score: {score} / {cfg.scoreToWin}</p>
                    <p className="text-[11px]">Hit {cfg.scoreToWin} score or collect {cfg.symbolsToWin} {season.symbol} to win!</p>
                  </div>
                  {!hasRevived && (
                    <div className="rounded-xl border-2 border-gold bg-gradient-to-br from-gold/30 to-gold/10 p-2.5 space-y-2">
                      <div className="flex items-center justify-center gap-1.5 font-display text-[11px] text-wood-dark">
                        <Heart size={12} className="text-candy-red" /> SECOND CHANCE — get {cfg.reviveTime}s more
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        <button
                          onClick={() => {
                            if (!onSpendCoins || !onSpendCoins(REVIVE_COST)) return;
                            revive(true);
                          }}
                          disabled={coins < REVIVE_COST || !onSpendCoins}
                          className="btn-press w-full py-1.5 rounded-full font-display text-xs disabled:opacity-50"
                        >
                          REVIVE — {REVIVE_COST} 🪙
                        </button>
                        {onAddCoins && (
                          <RewardedAdButton
                            playerLevel={playerLevel}
                            onReward={(c) => { onAddCoins(c); revive(true); }}
                            compact
                            className="!py-1.5 !text-xs"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
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
