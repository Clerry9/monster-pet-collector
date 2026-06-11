import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Lightbulb, Frown, Heart, Hammer, Rocket } from "lucide-react";
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
  onBuyStreakSaver: () => boolean;
  playerLevel?: number;
  onAddCoins?: (n: number) => void;
  onSpendCoins?: (n: number) => boolean;
}

const REVIVE_COST = 200;
const BUG = "👾";

type Difficulty = "easy" | "normal" | "hard";
const DIFFICULTY_KEY = "lov_minigame_difficulty";

interface DiffConfig {
  perSection: number;
  seconds: number;
  symbolsToWin: number;
  bugChance: number;
  spawnEveryMs: number;
  enemySpeed: number;
  bulletSpeed: number;
  fireEveryMs: number;
  reviveTime: number;
}

const DIFFICULTY: Record<Difficulty, DiffConfig> = {
  easy:   { perSection: 4, seconds: 55, symbolsToWin: 4, bugChance: 0.10, spawnEveryMs: 900, enemySpeed: 0.35, bulletSpeed: 3.2, fireEveryMs: 280, reviveTime: 20 },
  normal: { perSection: 5, seconds: 50, symbolsToWin: 5, bugChance: 0.18, spawnEveryMs: 750, enemySpeed: 0.55, bulletSpeed: 3.8, fireEveryMs: 240, reviveTime: 15 },
  hard:   { perSection: 6, seconds: 42, symbolsToWin: 7, bugChance: 0.28, spawnEveryMs: 600, enemySpeed: 0.75, bulletSpeed: 4.4, fireEveryMs: 200, reviveTime: 10 },
};

interface Enemy {
  id: number;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isBug: boolean;
  hp: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  prevY?: number;
}

interface HitFx {
  id: number;
  x: number;
  y: number;
  isBug: boolean;
}

const SHIP_Y = 90;

export function MiniGame({ season, onFinish, onClose, hasRolls, onSpendRoll, coins, playerLevel = 1, onAddCoins, onSpendCoins }: MiniGameProps) {
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

  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [hits, setHits] = useState<HitFx[]>([]);
  const [shipX, setShipX] = useState(50);
  const [progress, setProgress] = useState<[number, number, number]>([0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState(cfg.seconds);
  const [hasRevived, setHasRevived] = useState(false);

  const idCounter = useRef(0);
  const bulletIdRef = useRef(0);
  const hitIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fireTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const shipXRef = useRef(50);
  const progressRef = useRef(progress);
  useEffect(() => { shipXRef.current = shipX; }, [shipX]);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  const sectionsDone = progress.filter((p) => p >= cfg.perSection).length;
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

  // Spawn enemies
  useEffect(() => {
    if (phase !== "playing") return;
    spawnTimerRef.current = setInterval(() => {
      setEnemies((prev) => {
        if (prev.length >= 10) return prev;
        idCounter.current += 1;
        const isBug = Math.random() < cfg.bugChance;
        const p = progressRef.current;
        const nextSection = p.findIndex((v) => v < cfg.perSection);
        const sectionIdx = nextSection === -1 ? Math.floor(Math.random() * 3) : nextSection;
        const emoji = isBug ? BUG : building.resources[sectionIdx];
        return [
          ...prev,
          {
            id: idCounter.current,
            emoji,
            x: 8 + Math.random() * 84,
            y: -6,
            vx: (Math.random() - 0.5) * 0.25,
            vy: cfg.enemySpeed + Math.random() * 0.25,
            isBug,
            hp: isBug ? 2 : 1,
          },
        ];
      });
    }, cfg.spawnEveryMs);
    return () => { if (spawnTimerRef.current) clearInterval(spawnTimerRef.current); };
  }, [phase, cfg.spawnEveryMs, cfg.bugChance, cfg.perSection, cfg.enemySpeed, building.resources]);

  // Auto-fire
  useEffect(() => {
    if (phase !== "playing") return;
    fireTimerRef.current = setInterval(() => {
      bulletIdRef.current += 1;
      setBullets((prev) => [...prev, { id: bulletIdRef.current, x: shipXRef.current, y: SHIP_Y - 6 }]);
    }, cfg.fireEveryMs);
    return () => { if (fireTimerRef.current) clearInterval(fireTimerRef.current); };
  }, [phase, cfg.fireEveryMs]);

  // Move + collide
  useEffect(() => {
    if (phase !== "playing") return;
    moveTimerRef.current = setInterval(() => {
      // Keep the bullet's PREVIOUS y on the bullet itself so the collision
      // step below can do a swept-segment check (no tunnelling through
      // fast-falling enemies).
      setBullets((bs) =>
        bs
          .map((b) => ({ ...b, prevY: b.y, y: b.y - cfg.bulletSpeed }))
          .filter((b) => b.y > -4),
      );

      setEnemies((prev) => {
        const moved = prev.map((e) => {
          let nx = e.x + e.vx;
          let nvx = e.vx;
          if (nx < 4 || nx > 96) { nvx = -nvx; nx = Math.max(4, Math.min(96, nx)); }
          return { ...e, x: nx, vx: nvx, y: e.y + e.vy };
        });

        let curBullets: Bullet[] = [];
        setBullets((bs) => { curBullets = bs; return bs; });

        const damaged = new Map<number, number>();
        const usedBulletIds = new Set<number>();
        for (const b of curBullets) {
          for (const e of moved) {
            // Horizontal: generous box so emoji-sized targets register.
            // Vertical: swept range from previous bullet y down to current
            // y (bullets travel upward), expanded by ±4 to cover the
            // enemy's height. This stops the "shoot but nothing hits" bug.
            const prevY = (b as Bullet & { prevY?: number }).prevY ?? b.y;
            const yTop = Math.min(b.y, prevY) - 4;
            const yBot = Math.max(b.y, prevY) + 4;
            if (Math.abs(e.x - b.x) < 8 && e.y >= yTop && e.y <= yBot) {
              damaged.set(e.id, (damaged.get(e.id) ?? 0) + 1);
              usedBulletIds.add(b.id);
              break;
            }
          }
        }
        if (usedBulletIds.size > 0) {
          setBullets((bs) => bs.filter((b) => !usedBulletIds.has(b.id)));
        }

        const remaining: Enemy[] = [];
        const newHits: HitFx[] = [];
        for (const e of moved) {
          const dmg = damaged.get(e.id) ?? 0;
          const newHp = e.hp - dmg;
          if (dmg > 0 && newHp <= 0) {
            hitIdRef.current += 1;
            newHits.push({ id: hitIdRef.current, x: e.x, y: e.y, isBug: e.isBug });
            if (e.isBug) {
              sfxSkull();
              setProgress((p) => {
                const next = [...p] as [number, number, number];
                const candidates = next.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
                if (candidates.length > 0) {
                  const idx = candidates[Math.floor(Math.random() * candidates.length)];
                  next[idx] = Math.max(0, next[idx] - 1);
                }
                return next;
              });
            } else {
              const sectionIdx = building.resources.indexOf(e.emoji);
              if (sectionIdx >= 0) {
                sfxCoinGain();
                setProgress((p) => {
                  const next = [...p] as [number, number, number];
                  if (next[sectionIdx] < cfg.perSection) next[sectionIdx] += 1;
                  return next;
                });
              }
            }
            continue;
          }
          if (e.y > 105) {
            if (e.isBug && navigator.vibrate) navigator.vibrate(40);
            continue;
          }
          remaining.push({ ...e, hp: newHp });
        }
        if (newHits.length > 0) {
          setHits((h) => [...h, ...newHits]);
          // Auto-clear each hit fx after its animation.
          newHits.forEach((hit) => {
            window.setTimeout(() => {
              setHits((h) => h.filter((x) => x.id !== hit.id));
            }, 450);
          });
        }
        return remaining;
      });
    }, 33);
    return () => { if (moveTimerRef.current) clearInterval(moveTimerRef.current); };
  }, [phase, cfg.bulletSpeed, cfg.perSection, building.resources]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);
      if (fireTimerRef.current) clearInterval(fireTimerRef.current);
    };
  }, []);

  const moveShipTo = useCallback((clientX: number) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setShipX(Math.max(6, Math.min(94, pct)));
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") setShipX((x) => Math.max(6, x - 5));
      else if (e.key === "ArrowRight" || e.key === "d") setShipX((x) => Math.min(94, x + 5));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const startGame = () => {
    if (!hasRolls) return;
    if (!canAfford) return;
    if (onSpendCoins && !onSpendCoins(coinCost)) return;
    onSpendRoll();
    miniTutorial.markCompleted();
    setEnemies([]);
    setBullets([]);
    setShipX(50);
    setProgress([0, 0, 0]);
    setTimeLeft(cfg.seconds);
    setHasRevived(false);
    setPhase("playing");
  };

  const revive = () => {
    setEnemies((prev) => prev.filter((e) => !e.isBug));
    setBullets([]);
    setTimeLeft(cfg.reviveTime);
    setHasRevived(true);
    setPhase("playing");
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
          title="Close"
        >
          <X size={16} />
        </button>

        <div className="text-center mb-3">
          <div className="text-3xl mb-1">{building.finalEmoji}</div>
          <h2 className="font-display text-lg text-cream-light tracking-wide">
            DEFEND & BUILD: {building.name.toUpperCase()}
          </h2>
          <p className="text-[11px] font-display text-cream/80">
            Shoot resource ships to fill all 3 sections — destroy {BUG} invaders
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
                    <p>Drag (or use ← →) to move your ship 🚀. Bullets fire automatically. Shoot resource invaders ({building.resources.join(" ")}) to fill their section. Don't let {BUG} bug-bombs land — they wreck progress. Build all 3 sections to finish the {building.name}!</p>
                  </div>
                </motion.div>
              )}

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

              <div className="rounded-xl border-2 border-wood-dark bg-cream/95 p-2">
                <div className="text-[10px] font-display text-wood-dark/70 text-center mb-1.5">DIFFICULTY</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => chooseDifficulty(d)}
                      title={`${d === "easy" ? "Slower invaders, fewer bugs" : d === "normal" ? "Balanced speed and bug rate" : "Fast invaders, lots of bugs"}`}
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
                  {cfg.seconds}s • {cfg.perSection} kills/section • Win = full build for {cfg.symbolsToWin} {season.symbol}
                </div>
              </div>

              <div className="rounded-xl border-2 border-gold bg-gradient-to-br from-gold/30 to-gold/5 p-2 text-center">
                <div className="text-[10px] font-display text-wood-dark/70">BUILD COST (Lv {playerLevel})</div>
                <div className={`font-display text-base ${canAfford ? "text-wood-dark" : "text-destructive"}`}>
                  {coinCost.toLocaleString()} 🪙
                </div>
                {!canAfford && (
                  <div className="text-[10px] text-destructive font-display">Need {(coinCost - coins).toLocaleString()} more coins</div>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                disabled={!hasRolls || !canAfford}
                title="Launch your ship and start the Galaga-style mini-game"
                className="btn-press w-full py-2.5 rounded-full font-display text-base flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Rocket size={16} />
                {!hasRolls ? "Need more rolls" : !canAfford ? "Need more coins" : "LAUNCH SHIP"}
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

              <div
                ref={fieldRef}
                className="relative h-72 rounded-xl border-2 border-wood-dark overflow-hidden touch-none select-none"
                style={{ background: "linear-gradient(180deg, #0b1230 0%, #161a3a 60%, #1f2354 100%)" }}
                onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); moveShipTo(e.clientX); }}
                onPointerMove={(e) => { if (e.buttons === 1 || e.pointerType === "touch") moveShipTo(e.clientX); }}
                aria-label="Galaga play field — drag to move ship"
              >
                <div
                  className="absolute inset-0 opacity-70 pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 20% 30%, #fff 0.6px, transparent 1px), radial-gradient(circle at 70% 60%, #fff 0.6px, transparent 1px), radial-gradient(circle at 40% 85%, #fff 0.6px, transparent 1px), radial-gradient(circle at 85% 20%, #fff 0.6px, transparent 1px)",
                    backgroundSize: "110px 110px",
                  }}
                />

                {enemies.map((e) => (
                  <div
                    key={e.id}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-2xl pointer-events-none ${
                      e.isBug ? "drop-shadow-[0_0_6px_hsl(var(--destructive))]" : "drop-shadow-[0_0_4px_hsl(var(--gold))]"
                    }`}
                    style={{ left: `${e.x}%`, top: `${e.y}%` }}
                    aria-hidden="true"
                  >
                    {e.emoji}
                  </div>
                ))}

                {bullets.map((b) => (
                  <div
                    key={b.id}
                    className="absolute w-1 h-3 -translate-x-1/2 bg-gold rounded-sm pointer-events-none"
                    style={{ left: `${b.x}%`, top: `${b.y}%`, boxShadow: "0 0 6px hsl(var(--gold))" }}
                    aria-hidden="true"
                  />
                ))}

                {/* Hit flashes — make it obvious when a shot connects. */}
                {hits.map((h) => (
                  <motion.div
                    key={h.id}
                    initial={{ scale: 0.6, opacity: 1 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl pointer-events-none font-display"
                    style={{
                      left: `${h.x}%`,
                      top: `${h.y}%`,
                      color: h.isBug ? "hsl(var(--destructive))" : "hsl(var(--gold))",
                      textShadow: "0 0 10px currentColor",
                    }}
                    aria-hidden="true"
                  >
                    {h.isBug ? "💥" : "+1"}
                  </motion.div>
                ))}

                <motion.div
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl pointer-events-none"
                  style={{ left: `${shipX}%`, top: `${SHIP_Y}%`, filter: "drop-shadow(0 0 8px hsl(var(--gold)))" }}
                  animate={{ rotate: [0, -2, 2, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  aria-label="Your ship"
                >
                  🚀
                </motion.div>

                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-display text-cream-light/70 pointer-events-none">
                  Drag or ← → to move
                </div>
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
                          title={`Spend ${REVIVE_COST} coins to revive and keep your progress`}
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
                  title="Claim your rewards and close"
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
                  title="Claim and immediately start a new round"
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
