import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Trophy, Lightbulb } from "lucide-react";
import { Season } from "@/data/seasons";
import { sfxCoinGain, sfxLevelUp } from "@/lib/sfx";

interface Props {
  season: Season;
  onFinish: (symbolsEarned: number) => void;
  onClose: () => void;
  costRolls: number;
  hasRolls: boolean;
  onSpendRoll: () => void;
}

const GRID = 9;
const MAX_FLIPS = 8;

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildBoard(season: Season): Card[] {
  // 4 pairs of season symbol + 1 wildcard distractor → 9 cards
  const pool: string[] = [];
  for (let p = 0; p < 4; p++) pool.push(season.symbol, season.symbol);
  pool.push(season.miniGameTiles[0] || "❓");
  return shuffle(pool).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

export function MiniGameJack({ season, onFinish, onClose, costRolls, hasRolls, onSpendRoll }: Props) {
  const [phase, setPhase] = useState<"intro" | "playing" | "result">("intro");
  const [cards, setCards] = useState<Card[]>([]);
  const [flips, setFlips] = useState(0);
  const [pairsFound, setPairsFound] = useState(0);
  const [pending, setPending] = useState<number | null>(null);
  const [lock, setLock] = useState(false);

  const symbolsEarned = pairsFound * 2;
  const flipsLeft = MAX_FLIPS - flips;

  const start = () => {
    if (!hasRolls) return;
    onSpendRoll();
    setCards(buildBoard(season));
    setFlips(0);
    setPairsFound(0);
    setPending(null);
    setPhase("playing");
  };

  const tap = (idx: number) => {
    if (lock || phase !== "playing") return;
    const c = cards[idx];
    if (c.flipped || c.matched) return;
    if (flipsLeft <= 0) return;

    const next = cards.map((x, i) => (i === idx ? { ...x, flipped: true } : x));
    setCards(next);
    setFlips((f) => f + 1);

    if (pending === null) {
      setPending(idx);
      return;
    }
    // Compare
    const a = next[pending];
    const b = next[idx];
    setLock(true);
    setTimeout(() => {
      if (a.emoji === b.emoji) {
        setCards((cur) => cur.map((x, i) => (i === pending || i === idx ? { ...x, matched: true } : x)));
        setPairsFound((p) => p + 1);
        sfxCoinGain();
      } else {
        setCards((cur) => cur.map((x, i) => (i === pending || i === idx ? { ...x, flipped: false } : x)));
      }
      setPending(null);
      setLock(false);
    }, 650);
  };

  // End condition
  useMemo(() => {
    if (phase !== "playing") return;
    const allMatched = cards.length > 0 && cards.filter((c) => c.emoji === season.symbol).every((c) => c.matched);
    if (allMatched || flipsLeft <= 0) {
      setTimeout(() => {
        sfxLevelUp();
        setPhase("result");
      }, 700);
    }
  }, [pairsFound, flipsLeft, phase]);

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
        <button onClick={onClose} className="absolute -top-2 -right-2 icon-tile-gold w-8 h-8 flex items-center justify-center" aria-label="Close">
          <X size={16} />
        </button>

        <div className="text-center mb-3">
          <div className="text-3xl mb-1">🎁</div>
          <h2 className="font-display text-lg text-cream-light tracking-wide">JACK-IN-THE-BOX</h2>
          <p className="text-[11px] font-display text-cream/80">
            Flip pieces to find the {season.symbol}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="rounded-xl border-2 border-gold bg-gradient-to-br from-gold/30 to-gold/10 p-2.5 text-wood-dark text-[11px] flex items-start gap-2">
                <Lightbulb size={14} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-display text-[11px]">FIND THE {season.symbol} BEHIND PUZZLE PIECES</div>
                  <p>Tap two pieces to peek. Matching pairs of {season.symbol} = 2 symbols each. You only get {MAX_FLIPS} flips!</p>
                </div>
              </div>
              <div className="bg-cream/95 rounded-xl border-2 border-wood-dark p-3 text-wood-dark text-xs space-y-1">
                <p>• Up to 4 pairs hidden behind 9 pieces.</p>
                <p>• Each match = 2 {season.symbol}.</p>
                <p>• Costs <strong>{costRolls} roll</strong>.</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }} onClick={start} disabled={!hasRolls}
                className="btn-press w-full py-2.5 rounded-full font-display text-base flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play size={16} />
                {hasRolls ? "START" : "Need more rolls"}
              </motion.button>
            </motion.div>
          )}

          {phase === "playing" && (
            <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              <div className="flex justify-between items-center text-cream-light font-display text-sm">
                <span>🔄 {flipsLeft} flips</span>
                <span>{season.symbol} {symbolsEarned}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-wood-dark/50 p-2 rounded-xl border-2 border-wood-dark">
                {cards.map((c, idx) => (
                  <motion.button
                    key={c.id}
                    onClick={() => tap(idx)}
                    whileTap={{ scale: 0.92 }}
                    className="aspect-square rounded-lg border-2 border-wood-dark relative overflow-hidden"
                    style={{ perspective: 600 }}
                    aria-label={c.flipped ? `Card ${c.emoji}` : "Hidden card"}
                  >
                    <motion.div
                      animate={{ rotateY: c.flipped || c.matched ? 180 : 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <div
                        className="absolute inset-0 flex items-center justify-center text-2xl bg-gradient-to-br from-candy-red to-wood-dark text-cream-light font-display"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        🎁
                      </div>
                      <div
                        className={`absolute inset-0 flex items-center justify-center text-3xl bg-cream/95 ${c.matched ? "shadow-[0_0_12px_3px_hsl(var(--gold)/0.7)]" : ""}`}
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                      >
                        {c.emoji}
                      </div>
                    </motion.div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div key="r" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 text-center">
              <Trophy className="mx-auto text-gold" size={40} />
              <div className="bg-cream/95 rounded-xl border-2 border-wood-dark p-3 text-wood-dark space-y-1">
                <p className="font-display text-base">{pairsFound} pair{pairsFound === 1 ? "" : "s"} found</p>
                <p className="font-display text-2xl text-candy-red">+{symbolsEarned} {season.symbol}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { onFinish(symbolsEarned); setPhase("intro"); }} className="btn-press py-2 rounded-full font-display text-sm">CLAIM</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { onFinish(symbolsEarned); start(); }} disabled={!hasRolls} className="icon-tile-gold py-2 rounded-full font-display text-sm disabled:opacity-50">PLAY AGAIN</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
