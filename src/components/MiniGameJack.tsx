import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Trophy, Lightbulb, Sparkles } from "lucide-react";
import { Season } from "@/data/seasons";
import { sfxCoinGain, sfxLevelUp } from "@/lib/sfx";

interface UniqueItem {
  type: "coins" | "rolls" | "stars" | "cardFlip" | "gemCoins";
  emoji: string;
  label: string;
  baseAmount: number;
}

const UNIQUE_ITEMS: UniqueItem[] = [
  { type: "coins",     emoji: "💰", label: "Coin Cache",   baseAmount: 50 },
  { type: "rolls",     emoji: "🎲", label: "Lucky Die",    baseAmount: 1 },
  { type: "stars",     emoji: "⭐", label: "Star Shard",   baseAmount: 1 },
  { type: "cardFlip",  emoji: "🃏", label: "Mystery Card", baseAmount: 1 },
  { type: "gemCoins",  emoji: "💎", label: "Gem",          baseAmount: 25 },
];

interface Props {
  season: Season;
  onFinish: (symbolsEarned: number) => void;
  onClose: () => void;
  costRolls: number;
  hasRolls: boolean;
  onSpendRoll: () => void;
  playerLevel?: number;
  onAddCoins?: (n: number) => void;
  onAddRolls?: (n: number) => void;
  onAwardStars?: (n: number) => void;
  onAddCardFlip?: (n: number) => void;
}

const MAX_FLIPS = 12;

type Card = { id: number; emoji: string; itemType?: UniqueItem["type"]; flipped: boolean; matched: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildBoard(season: Season, levelKey: string): { cards: Card[]; uniques: UniqueItem[] } {
  // 4 pairs of season symbol + 2 unique-item pairs = 12 cards (4×3)
  const uniques = shuffle(UNIQUE_ITEMS).slice(0, 2);
  const pool: { emoji: string; itemType?: UniqueItem["type"] }[] = [];
  for (let p = 0; p < 4; p++) pool.push({ emoji: season.symbol }, { emoji: season.symbol });
  for (const u of uniques) pool.push({ emoji: u.emoji, itemType: u.type }, { emoji: u.emoji, itemType: u.type });
  return {
    cards: shuffle(pool).map((p, i) => ({ id: i, emoji: p.emoji, itemType: p.itemType, flipped: false, matched: false })),
    uniques,
  };
}

const FLIPS_KEY_BASE = "lov_jack_flips_left";

export function MiniGameJack({
  season, onFinish, onClose, costRolls, hasRolls, onSpendRoll,
  playerLevel = 1, onAddCoins, onAddRolls, onAwardStars, onAddCardFlip,
}: Props) {
  const flipsKey = `${FLIPS_KEY_BASE}:${season.id}:${playerLevel}`;
  const [phase, setPhase] = useState<"intro" | "playing" | "result">("intro");
  const [cards, setCards] = useState<Card[]>([]);
  const [uniques, setUniques] = useState<UniqueItem[]>([]);
  const [flips, setFlips] = useState(0);
  const [pairsFound, setPairsFound] = useState(0);
  const [itemsWon, setItemsWon] = useState<UniqueItem["type"][]>([]);
  const [pending, setPending] = useState<number | null>(null);
  const [lock, setLock] = useState(false);
  const [reward, setReward] = useState<{ key: number; emoji: string; label: string; amount: number } | null>(null);

  const initialFlipsLeft = useMemo(() => {
    try {
      const v = localStorage.getItem(flipsKey);
      if (v) {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n > 0 && n <= MAX_FLIPS) return n;
      }
    } catch {}
    return MAX_FLIPS;
  }, [flipsKey]);

  const flipsLeft = phase === "playing"
    ? Math.max(0, initialFlipsLeft - flips)
    : initialFlipsLeft;
  const symbolsEarned = pairsFound * 2;

  // Persist remaining flips while playing (keyed by season+level)
  useEffect(() => {
    if (phase !== "playing") return;
    try { localStorage.setItem(flipsKey, String(Math.max(0, initialFlipsLeft - flips))); } catch {}
  }, [phase, flips, initialFlipsLeft, flipsKey]);

  const start = () => {
    if (!hasRolls) return;
    onSpendRoll();
    const { cards: newCards, uniques: newUniques } = buildBoard(season, flipsKey);
    setCards(newCards);
    setUniques(newUniques);
    setFlips(0);
    setPairsFound(0);
    setItemsWon([]);
    setPending(null);
    setReward(null);
    setPhase("playing");
  };

  const computeAmount = (item: UniqueItem) =>
    item.type === "gemCoins" ? item.baseAmount * Math.max(1, playerLevel) : item.baseAmount;

  const awardItem = (item: UniqueItem) => {
    const amt = computeAmount(item);
    if (item.type === "coins" || item.type === "gemCoins") onAddCoins?.(amt);
    else if (item.type === "rolls") onAddRolls?.(amt);
    else if (item.type === "stars") onAwardStars?.(amt);
    else if (item.type === "cardFlip") onAddCardFlip?.(amt);
    setItemsWon((arr) => [...arr, item.type]);
    setReward({ key: performance.now(), emoji: item.emoji, label: item.label, amount: amt });
    setTimeout(() => setReward((r) => (r && r.key === r.key ? null : r)), 1500);
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
    const a = next[pending];
    const b = next[idx];
    setLock(true);
    const pendingIdx = pending;
    setTimeout(() => {
      if (a.emoji === b.emoji) {
        setCards((cur) => cur.map((x, i) => (i === pendingIdx || i === idx ? { ...x, matched: true } : x)));
        if (a.itemType) {
          // Unique item match — award + flash reward
          const item = UNIQUE_ITEMS.find((u) => u.type === a.itemType);
          if (item) awardItem(item);
        } else {
          setPairsFound((p) => p + 1);
          sfxCoinGain();
        }
      } else {
        setCards((cur) => cur.map((x, i) => (i === pendingIdx || i === idx ? { ...x, flipped: false } : x)));
      }
      setPending(null);
      setLock(false);
    }, 650);
  };

  // End condition
  useEffect(() => {
    if (phase !== "playing") return;
    const seasonCards = cards.filter((c) => !c.itemType);
    const allSeasonMatched = seasonCards.length > 0 && seasonCards.every((c) => c.matched);
    if (allSeasonMatched || flipsLeft <= 0) {
      const t = setTimeout(() => {
        sfxLevelUp();
        setPhase("result");
        // Reset persistent flips for next session at this level
        try { localStorage.removeItem(flipsKey); } catch {}
      }, 700);
      return () => clearTimeout(t);
    }
  }, [pairsFound, flipsLeft, phase, cards, flipsKey]);

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
            Flip pieces to find {season.symbol} & rare items
          </p>
        </div>

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="rounded-xl border-2 border-gold bg-gradient-to-br from-gold/30 to-gold/10 p-2.5 text-wood-dark text-[11px] flex items-start gap-2">
                <Lightbulb size={14} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-display text-[11px]">MATCH PAIRS TO WIN PRIZES</div>
                  <p>Flip two cards. Match {season.symbol} pairs to earn season tokens (+2 each). Match bonus items to claim them instantly. You get {MAX_FLIPS} flips.</p>
                </div>
              </div>
              <div className="bg-cream/95 rounded-xl border-2 border-wood-dark p-3 text-wood-dark text-xs space-y-1">
                <div className="font-display text-[11px] text-candy-red">RARE BONUS ITEMS</div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  {UNIQUE_ITEMS.map((u) => (
                    <div key={u.type} className="flex items-center gap-1">
                      <span className="text-base">{u.emoji}</span>
                      <span><strong>{u.label}</strong></span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] mt-1">2 random items hide in each box. Match a pair to claim it instantly!</p>
                <p>• Costs <strong>{costRolls} roll</strong>.</p>
                {initialFlipsLeft < MAX_FLIPS && (
                  <p className="text-[10px] text-candy-red font-display">▶ Resuming with {initialFlipsLeft} flips left</p>
                )}
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
            <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 relative">
              <div className="flex justify-between items-center text-cream-light font-display text-sm">
                <span>🔄 {flipsLeft} flips</span>
                <span>{season.symbol} {symbolsEarned}</span>
              </div>
              <div className="flex justify-center gap-1 text-[10px] text-cream/80 font-display">
                Bonus items: {uniques.map((u) => <span key={u.type} className="ml-1">{u.emoji}</span>)}
              </div>
              <div className="grid grid-cols-4 gap-1.5 bg-wood-dark/50 p-2 rounded-xl border-2 border-wood-dark">
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
                        className="absolute inset-0 flex items-center justify-center text-xl bg-gradient-to-br from-candy-red to-wood-dark text-cream-light font-display"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        🎁
                      </div>
                      <div
                        className={`absolute inset-0 flex items-center justify-center text-2xl bg-cream/95 ${c.matched ? "shadow-[0_0_12px_3px_hsl(var(--gold)/0.7)]" : ""} ${c.itemType && c.matched ? "bg-gradient-to-br from-gold/40 to-cream/95" : ""}`}
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                      >
                        {c.emoji}
                      </div>
                    </motion.div>
                  </motion.button>
                ))}
              </div>

              {/* Floating reward toast */}
              <AnimatePresence>
                {reward && (
                  <motion.div
                    key={reward.key}
                    initial={{ opacity: 0, y: 20, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.8 }}
                    className="absolute left-1/2 -translate-x-1/2 top-12 z-10 pointer-events-none"
                  >
                    <div className="bg-gradient-to-r from-gold to-candy-red text-cream-light font-display text-sm px-4 py-2 rounded-full border-2 border-wood-dark shadow-chunky flex items-center gap-1.5">
                      <Sparkles size={14} />
                      <span className="text-xl">{reward.emoji}</span>
                      <span>+{reward.amount} {reward.label}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div key="r" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 text-center">
              <Trophy className="mx-auto text-gold" size={40} />
              <div className="bg-cream/95 rounded-xl border-2 border-wood-dark p-3 text-wood-dark space-y-1">
                <p className="font-display text-base">{pairsFound} {season.symbol} pair{pairsFound === 1 ? "" : "s"}</p>
                <p className="font-display text-2xl text-candy-red">+{symbolsEarned} {season.symbol}</p>
                {itemsWon.length > 0 && (
                  <div className="pt-2 border-t border-wood-dark/20 mt-2">
                    <div className="text-[10px] font-display text-wood-dark/70">BONUS ITEMS WON</div>
                    <div className="flex justify-center gap-2 mt-1">
                      {itemsWon.map((t, i) => {
                        const item = UNIQUE_ITEMS.find((u) => u.type === t)!;
                        return (
                          <div key={i} className="rounded-lg border-2 border-gold bg-gradient-to-br from-gold/30 to-gold/10 px-2 py-1 text-[10px] font-display flex items-center gap-1">
                            <span className="text-base">{item.emoji}</span>
                            <span>+{computeAmount(item)} {item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
