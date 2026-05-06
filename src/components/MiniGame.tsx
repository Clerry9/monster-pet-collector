import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Trophy, Lightbulb, Frown, Heart, Hammer } from "lucide-react";
import { Season } from "@/data/seasons";
import { sfxCoinGain, sfxLevelUp, sfxSkull } from "@/lib/sfx";
import { useTutorial } from "@/hooks/useTutorial";
import { RewardedAdButton } from "@/components/RewardedAdButton";
import { getBuildingForLevel, getBuildCoinCost } from "@/data/buildings";

interface MiniGameProps {
  season: Season;
  onFinish: (symbolsEarned: number, score: number) => void;
  onClose: () => void;
  costRolls: number;
  hasRolls: boolean;
  onSpendRoll: () => void;
  coins: number;
  onBuyStreakSaver: () => boolean; // unused now but kept for interface
  playerLevel?: number;
  onAddCoins?: (n: number) => void;
  onSpendCoins?: (n: number) => boolean;
}

const REVIVE_COST = 200;
const BOMB = "💣";

type Difficulty = "easy" | "normal" | "hard";
const DIFFICULTY_KEY = "lov_minigame_difficulty";

interface DiffConfig {
  perSection: number; // resources per section
  seconds: number;
  symbolsToWin: number; // when fully built
  bombChance: number; // 0..1 probability per spawn
  spawnEveryMs: number;
  reviveTime: number;
}

const DIFFICULTY: Record<Difficulty, DiffConfig> = {
  easy:   { perSection: 4, seconds: 50, symbolsToWin: 4, bombChance: 0,    spawnEveryMs: 750, reviveTime: 18 },
  normal: { perSection: 5, seconds: 45, symbolsToWin: 5, bombChance: 0.12, spawnEveryMs: 650, reviveTime: 14 },
  hard:   { perSection: 6, seconds: 38, symbolsToWin: 7, bombChance: 0.22, spawnEveryMs: 520, reviveTime: 10 },
};

interface FloatTile {
  id: number;
  emoji: string;
  x: number; // %
  y: number; // %
  vx: number;
  vy: number;
  isBomb: boolean;
}

export function MiniGame({ season, onFinish, onClose, costRolls, hasRolls, onSpendRoll, coins, playerLevel = 1, onAddCoins, onSpendCoins }: MiniGameProps) {
  const miniTutorial = useTutorial("minigame");
  const building = useMemo(() => getBuildingForLevel(playerLevel), [playerLevel]);
  const coinCost = useMemo(() => getBuildCoinCost(playerLevel), [playerLevel]);
  const canAfford = coins >= coinCost;
  const [phase, setPhase] = useState<"intro" | "playing" | "result">("intro");
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const saved = localStorage.getItem(DIFFICULTY_KEY) as Difficulty | null;
    return saved && DIFFICULTY[saved] ? saved : "normal";
  });
  const cfg = DIFFICULTY[difficulty];
  const [tiles, setTiles] = useState<FloatTile[]>([]);
  const [progress, setProgress] = useState<[number, number, number]>([0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState(cfg.seconds);
  const [hasRevived, setHasRevived] = useState(false);
  const idCounter = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sectionsDone = progress.filter((p, i) => p >= cfg.perSection).length;
  const fullyBuilt = sectionsDone === 3;

  const chooseDifficulty = (d: Difficulty) => {
    setDifficulty(d);
    localStorage.setItem(DIFFICULTY_KEY, d);
  };

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0 || fullyBuilt) {
      sfxLevelUp();
      setPhase("result");
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, fullyBuilt]);

  // Spawn loop
  useEffect(() => {
    if (phase !== "playing") return;
    spawnTimerRef.current = setInterval(() => {
      setTiles((prev) => {
        if (prev.length >= 8) return prev;
        idCounter.current += 1;
        const isBomb = Math.random() < cfg.bombChance;
        // Pick the resource for the next unfinished section, weighted slightly
        const nextSection = progress.findIndex((p) => p < cfg.perSection);
        const sectionIdx = nextSection === -1 ? Math.floor(Math.random() * 3) : nextSection;
        const emoji = isBomb ? BOMB : building.resources[sectionIdx];
        return [
          ...prev,
          {
            id: idCounter.current,
            emoji,
            x: 5 + Math.random() * 90,
            y: -8,
            vx: (Math.random() - 0.5) * 0.4,
            vy: 0.6 + Math.random() * 0.5,
            isBomb,
          },
        ];
      });
    }, cfg.spawnEveryMs);
    return () => { if (spawnTimerRef.current) clearInterval(spawnTimerRef.current); };
  }, [phase, cfg.spawnEveryMs, cfg.bombChance, cfg.perSection, building.resources, progress]);

  // Movement loop (~30fps)
  useEffect(() => {
    if (phase !== "playing") return;
    moveTimerRef.current = setInterval(() => {
      setTiles((prev) =>
        prev
          .map((t) => ({ ...t, x: t.x + t.vx, y: t.y + t.vy }))
          .filter((t) => t.y < 110)
      );
    }, 33);
    return () => { if (moveTimerRef.current) clearInterval(moveTimerRef.current); };
  }, [phase]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);
    };
  }, []);

  const startGame = () => {
    if (!hasRolls) return;
    if (!canAfford) return;
    if (onSpendCoins && !onSpendCoins(coinCost)) return;
    onSpendRoll();
    miniTutorial.markCompleted();
    setTiles([]);
    setProgress([0, 0, 0]);
    setTimeLeft(cfg.seconds);
    setHasRevived(false);
    setPhase("playing");
  };

  const revive = () => {
    setTiles((prev) => prev.filter((t) => !t.isBomb));
    setTimeLeft(cfg.reviveTime);
    setHasRevived(true);
    setPhase("playing");
  };

  const tapTile = (id: number) => {
    if (phase !== "playing") return;
    setTiles((prev) => {
      const t = prev.find((x) => x.id === id);
      if (!t) return prev;
      if (t.isBomb) {
        sfxSkull();
        if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
        // Reduce a random in-progress section by 1
        setProgress((p) => {
          const next = [...p] as [number, number, number];
          const candidates = next.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
          if (candidates.length > 0) {
            const idx = candidates[Math.floor(Math.random() * candidates.length)];
            next[idx] = Math.max(0, next[idx] - 1);
          }
          return next;
        });
        return prev.filter((x) => x.id !== id);
      }
      // Match resource to its section
      const sectionIdx = building.resources.indexOf(t.emoji);
      if (sectionIdx >= 0) {
        sfxCoinGain();
        setProgress((p) => {
          const next = [...p] as [number, number, number];
          if (next[sectionIdx] < cfg.perSection) next[sectionIdx] += 1;
          return next;
        });
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  const symbolsEarned = useMemo(() => {
    const total = progress.reduce((s, p) => s + Math.min(p, cfg.perSection), 0);
    const max = cfg.perSection * 3;
    return Math.round((total / max) * cfg.symbolsToWin);
  }, [progress, cfg.perSection, cfg.symbolsToWin]);

  const didWin = fullyBuilt;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }}
        transition={{ type: "spring", damping: 18 }}
        className="panel-wood w-full max-w-sm p-4 relative"
        onClick={(e) => e.stopPropagation()}
        style={{ background: `radial-gradient(ellipse at top, hsl(${season.palette.glow} / 0.4), hsl(var(--wood)))` }}
      >
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 icon-tile-gold w-8 h-8 flex items-center justify-center"
          aria-label="Close mini game"
        >
          <X size={16} />
        </button>

        <div className="text-center mb-3">
          <div className="text-3xl mb-1">{building.finalEmoji}</div>
          <h2 className="font-display text-lg text-cream-light tracking-wide">
            BUILD: {building.name.toUpperCase()}
          </h2>
          <p className="text-[11px] font-display text-cream/80">
            Tap falling resources to fill the 3 sections
          </p>
        </div>

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {!miniTutorial.completed && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border-2 border-gold bg-gradient-to-br from-gold/30 to-gold/10 p-2.5 text-wood-dark text-[11px] flex items-start gap-2"
                >
                  <Lightbulb size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="font-display text-[11px]">FIRST TIME?</div>
                    <p>Tap each falling resource ({building.resources.join(" ")}) to drop it into its section. Avoid 💣 — it removes progress. Build all 3 sections to finish the {building.name}!</p>
                  </div>
                </motion.div>
              )}

              {/* Blueprint preview */}
              <div className="rounded-xl border-2 border-wood-dark bg-cream/95 p-3">
                <div className="text-[10px] font-display text-wood-dark/70 text-center mb-2">BLUEPRINT — LEVEL {playerLevel}</div>
                <div className="flex items-end justify-center gap-1.5 mb-2">
                  <div className="text-5xl">{building.finalEmoji}</div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {building.sections.map((s, i) => (
                    <div key={s} className="rounded-lg border-2 border-wood-dark/40 bg-wood-light/20 p-1.5 text-center">
                      <div className="text-xl">{building.resources[i]}</div>
                      <div className="text-[9px] font-display text-wood-dark mt-0.5">{s}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
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
                  {cfg.seconds}s • {cfg.perSection}/section • Win = full build for {cfg.symbolsToWin} {season.symbol}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                disabled={!hasRolls}
                className="btn-press w-full py-2.5 rounded-full font-display text-base flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play size={16} />
                {hasRolls ? "START BUILDING" : "Need more rolls"}
              </motion.button>
            </motion.div>
          )}

          {phase === "playing" && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <div className="flex justify-between items-center text-cream-light font-display text-sm">
                <span>⏱ {timeLeft}s</span>
                <span className="flex items-center gap-1"><Hammer size={14} /> {sectionsDone}/3</span>
                <span>{season.symbol} {symbolsEarned}</span>
              </div>

              {/* Section progress bars */}
              <div className="grid grid-cols-3 gap-1.5">
                {building.sections.map((s, i) => {
                  const pct = Math.min(100, (progress[i] / cfg.perSection) * 100);
                  const done = progress[i] >= cfg.perSection;
                  return (
                    <div key={s} className={`rounded-lg border-2 p-1 text-center ${done ? "border-gold bg-gradient-to-b from-gold/40 to-gold/10" : "border-wood-dark bg-cream/95"}`}>
                      <div className="text-lg">{done ? "✅" : building.resources[i]}</div>
                      <div className="h-1 rounded-full bg-wood-dark/20 overflow-hidden mt-0.5">
                        <div className="h-full bg-gradient-to-r from-candy-red to-gold" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[9px] font-display text-wood-dark mt-0.5">{progress[i]}/{cfg.perSection}</div>
                    </div>
                  );
                })}
              </div>

              {/* Play field */}
              <div className="relative h-72 bg-wood-dark/50 rounded-xl border-2 border-wood-dark overflow-hidden">
                {tiles.map((t) => (
                  <motion.button
                    key={t.id}
                    onClick={() => tapTile(t.id)}
                    whileTap={{ scale: 0.8 }}
                    className={`absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-2xl rounded-full border-2 ${
                      t.isBomb ? "border-destructive bg-destructive/30 shadow-[0_0_10px_3px_hsl(var(--destructive)/0.6)]" : "border-wood-dark bg-cream/95"
                    }`}
                    style={{ left: `${t.x}%`, top: `${t.y}%` }}
                    aria-label={t.isBomb ? "Bomb" : `Resource ${t.emoji}`}
                  >
                    {t.emoji}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 text-center">
              {didWin ? (
                <>
                  <Trophy className="mx-auto text-gold" size={40} />
                  <motion.div
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 10 }}
                    className="text-7xl"
                  >
                    {building.finalEmoji}
                  </motion.div>
                  <div className="bg-cream/95 rounded-xl border-2 border-wood-dark p-3 text-wood-dark space-y-1">
                    <p className="font-display text-base text-candy-red">{building.name.toUpperCase()} BUILT!</p>
                    <p className="font-display text-2xl text-candy-red">+{symbolsEarned} {season.symbol}</p>
                  </div>
                </>
              ) : (
                <>
                  <Frown className="mx-auto text-destructive" size={40} />
                  <div className="bg-cream/95 rounded-xl border-2 border-destructive p-3 text-wood-dark space-y-1">
                    <p className="font-display text-base text-destructive">TIME'S UP</p>
                    <p className="text-[11px]">{sectionsDone}/3 sections built</p>
                    <p className="font-display text-2xl text-candy-red">+{symbolsEarned} {season.symbol}</p>
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
                            revive();
                          }}
                          disabled={coins < REVIVE_COST || !onSpendCoins}
                          className="btn-press w-full py-1.5 rounded-full font-display text-xs disabled:opacity-50"
                        >
                          REVIVE — {REVIVE_COST} 🪙
                        </button>
                        {onAddCoins && (
                          <RewardedAdButton
                            playerLevel={playerLevel}
                            onReward={(c) => { onAddCoins(c); revive(); }}
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
                    onFinish(symbolsEarned, symbolsEarned * 100);
                    setPhase("intro");
                  }}
                  className="btn-press py-2 rounded-full font-display text-sm"
                >
                  CLAIM
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onFinish(symbolsEarned, symbolsEarned * 100);
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
