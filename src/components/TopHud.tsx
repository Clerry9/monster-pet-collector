import { motion } from "framer-motion";
import { Gem, Coins, Key, Star, Flame, PawPrint, Plus, Sparkles, History } from "lucide-react";
import { getLevelProgress } from "@/data/levels";
import { energyCostForBet } from "@/hooks/useGameState";
import { useEffect, useMemo, useRef, useState } from "react";
import { pickReward, type Reward, type RewardTemplate } from "@/data/rewardPool";
import { useRewardPool } from "@/hooks/useRewardPool";
import { useIslandPreviewHistory } from "@/hooks/useIslandPreviewHistory";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sfxDiceTick, sfxRouletteWin, sfxCoinGain } from "@/lib/sfx";
import { toast } from "sonner";

interface TopHudProps {
  gems: number;
  coins: number;
  keys: number;          // 0..3 collected key shards
  stars: number;
  shards?: number;       // Phase 1: bonus reward currency for summoning
  xp: number;
  level: number;
  betMultiplier: number;
  guestName?: string;
  onAddGems?: () => void;
  onAddCoins?: () => void;
  onAddKeys?: () => void;
  onAddStars?: () => void;
  onAddShards?: () => void;
  /**
   * Called when the player claims an island-landing preview reward.
   * Parent maps the reward kind onto the appropriate state grant.
   */
  onClaimReward?: (reward: Reward) => void;
}

/** Cooldown after a claim before cycling resumes — keeps the won prize visible. */
const CLAIM_LOCK_MS = 60_000;

function pickFromPool(pool: RewardTemplate[]): Reward {
  const total = pool.reduce((s, t) => s + Math.max(0, t.weight), 0);
  if (total <= 0) return pickReward();
  let r = Math.random() * total;
  for (const t of pool) {
    r -= Math.max(0, t.weight);
    if (r <= 0) return t.build();
  }
  return pool[0].build();
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as Navigator).vibrate(pattern);
    }
  } catch { /* no-op */ }
}

/**
 * Coin-Master style top HUD: gem · coin · 3 key slots · star + center XP bar.
 */
export function TopHud({
  gems, coins, keys, stars, shards = 0, xp, level, betMultiplier, guestName,
  onAddGems, onAddCoins, onAddKeys, onAddStars, onAddShards, onClaimReward,
}: TopHudProps) {
  const { current, progress, xpInLevel, xpNeeded } = getLevelProgress(xp);

  // Configurable odds — admin overrides applied on top of SHARED_POOL.
  const { pool } = useRewardPool();

  // Reveal state machine: idle → rolling → locked → idle.
  const [phase, setPhase] = useState<"idle" | "rolling" | "locked">("idle");
  const [preview, setPreview] = useState<Reward>(() => pickFromPool(pool));
  const [lockedUntil, setLockedUntil] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const history = useIslandPreviewHistory();

  // Idle cycling — pause while rolling or while a won prize is locked on screen.
  useEffect(() => {
    if (phase !== "idle") return;
    const id = window.setInterval(() => {
      if (phaseRef.current === "idle") setPreview(pickFromPool(pool));
    }, 3000);
    return () => window.clearInterval(id);
  }, [phase, pool]);

  // Auto-release the lock so cycling can resume after the cooldown.
  useEffect(() => {
    if (phase !== "locked") return;
    const remaining = Math.max(0, lockedUntil - Date.now());
    const id = window.setTimeout(() => setPhase("idle"), remaining);
    return () => window.clearTimeout(id);
  }, [phase, lockedUntil]);

  const canClaim = phase === "idle";

  const runReveal = () => {
    if (!canClaim) return;
    setPhase("rolling");

    // Fast cycling — ~80ms steps, decelerating, ~2s total.
    const steps = 22;
    let i = 0;
    let final: Reward = pickFromPool(pool);
    const tick = () => {
      i += 1;
      if (i < steps) {
        setPreview(pickFromPool(pool));
        sfxDiceTick();
        vibrate(8);
        // Easing — slow down toward the end.
        const delay = 60 + Math.pow(i / steps, 2.4) * 220;
        window.setTimeout(tick, delay);
      } else {
        final = pickFromPool(pool);
        setPreview(final);
        setPhase("locked");
        setLockedUntil(Date.now() + CLAIM_LOCK_MS);
        sfxRouletteWin();
        sfxCoinGain();
        vibrate([20, 40, 60, 40, 120]);
        history.push(final);
        onClaimReward?.(final);
        toast.success(`+${final.amount.toLocaleString()} ${final.label}`, {
          description: `${final.emoji} added to your stash`,
        });
      }
    };
    window.setTimeout(tick, 60);
  };

  return (
    <div className="w-full flex flex-col gap-1.5" role="region" aria-label="Player resources">
      {guestName && (
        <div className="self-start ml-1 px-2 py-0.5 rounded-full bg-black/45 border border-cream-light/30 text-xs font-display text-cream-light tracking-wide truncate max-w-[60%]" aria-label={`Guest name ${guestName}`}>
          👤 {guestName}
        </div>
      )}
      {/* Top counter strip */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <Counter
          icon={<Gem size={18} className="text-fuchsia-300" fill="currentColor" />}
          value={gems}
          onAdd={onAddGems}
          ariaLabel={`${gems.toLocaleString()} gems`}
          tip="Gems — premium currency for special packs and revives."
        />
        <Counter
          icon={<Coins size={18} className="text-yellow-300" fill="currentColor" />}
          value={coins}
          onAdd={onAddCoins}
          ariaLabel={`${coins.toLocaleString()} coins`}
          wide
          tip="Coins — earned from rolls and battles. Spend on builds and items."
        />
        <KeySlots count={keys} onAdd={onAddKeys} tip="Key shards — collect 3 to unlock the next island." />
        <Counter
          icon={<Star size={18} className="text-yellow-300" fill="currentColor" />}
          value={stars}
          onAdd={onAddStars}
          ariaLabel={`${stars.toLocaleString()} stars`}
          tip="Stars — season currency. Climb the season pass to claim rewards."
        />
        <Counter
          icon={<Sparkles size={18} className="text-cyan-300" fill="currentColor" />}
          value={shards}
          onAdd={onAddShards}
          ariaLabel={`${shards.toLocaleString()} shards`}
          tip="Shards — spend at the Summon Altar to unlock new monsters."
        />
      </div>

      {/* XP bar */}
      <div
        className="pill-xp-shell flex items-center gap-2 pl-1 pr-2 py-1 relative"
        role="progressbar"
        aria-valuenow={xpInLevel}
        aria-valuemin={0}
        aria-valuemax={xpNeeded}
        aria-label={`Level ${current.id} ${current.name}, ${xpInLevel} of ${xpNeeded} XP`}
      >
        {/* Paw / level badge */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-b from-rose-400 to-rose-700 border-2 border-wood-dark flex items-center justify-center shadow-chunky-sm">
          <PawPrint size={18} className="text-cream-light" />
        </div>

        <div className="flex-1 h-3.5 rounded-full bg-black/40 overflow-hidden border border-black/40">
          <motion.div
            className="h-full pill-xp-fill rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, progress * 100)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        {/* "891 / 1.400" centered text */}
        <span className="absolute left-1/2 -translate-x-1/2 text-sm font-display text-cream-light pointer-events-none drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]">
          {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()}
        </span>

        {/* Random prize preview + tap-to-reveal flow */}
        <div className="shrink-0 flex items-center gap-1">
          <button
            type="button"
            onClick={runReveal}
            disabled={!canClaim}
            className="relative outline-none focus-visible:ring-2 focus-visible:ring-cream-light rounded-full disabled:cursor-not-allowed"
            aria-label={
              phase === "rolling"
                ? "Rolling reward…"
                : phase === "locked"
                  ? `You won ${preview.amount} ${preview.label}`
                  : `Tap to reveal a reward. Currently showing ${preview.label}`
            }
            title={
              phase === "rolling"
                ? "Rolling…"
                : phase === "locked"
                  ? `Won: ${preview.amount} ${preview.label}`
                  : `Tap to claim — possible: ${preview.label}`
            }
          >
            <motion.div
              key={preview.emoji + preview.label + phase}
              initial={{ scale: phase === "rolling" ? 1.05 : 0.7, opacity: 0 }}
              animate={{
                scale: phase === "locked" ? [1, 1.25, 1] : 1,
                opacity: 1,
                rotate: phase === "rolling" ? [0, 12, -12, 0] : 0,
              }}
              transition={
                phase === "locked"
                  ? { duration: 0.55, ease: "easeOut" }
                  : phase === "rolling"
                    ? { duration: 0.18, ease: "easeInOut" }
                    : { type: "spring", stiffness: 300, damping: 18 }
              }
              className={`w-9 h-9 rounded-full border-2 border-wood-dark flex items-center justify-center shadow-chunky-sm ${
                phase === "locked"
                  ? "bg-gradient-to-b from-lime-300 via-emerald-400 to-emerald-600 ring-2 ring-emerald-200"
                  : "bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500"
              }`}
            >
              <span className="text-lg leading-none">{preview.emoji}</span>
            </motion.div>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-display bg-wood-dark text-cream-light px-1 rounded-full border border-cream-light/60 leading-none py-[1px] whitespace-nowrap">
              ×{betMultiplier}
            </span>
            <span
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-display text-cream-light/90 leading-none whitespace-nowrap drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]"
              aria-label={`Each roll costs ${energyCostForBet(betMultiplier)} energy`}
            >
              −{energyCostForBet(betMultiplier)}⚡
            </span>
          </button>

          <HistoryButton entries={history.entries} onClear={history.clear} />
        </div>
      </div>
    </div>
  );
}

function HistoryButton({
  entries,
  onClear,
}: {
  entries: ReturnType<typeof useIslandPreviewHistory>["entries"];
  onClear: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Recent island prize wins"
          title="Recent island prize wins"
          className="w-7 h-7 rounded-full bg-black/45 border border-cream-light/30 flex items-center justify-center text-cream-light hover:bg-black/60 transition"
        >
          <History size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-display tracking-wide">Recent Wins</span>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] underline text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-2">
            No prizes claimed yet. Tap the glowing prize circle to reveal one!
          </p>
        ) : (
          <ul className="max-h-64 overflow-y-auto divide-y divide-border">
            {entries.map((e) => (
              <li key={`${e.at}-${e.kind}`} className="flex items-center gap-2 py-1.5 px-1">
                <span className="text-lg leading-none" aria-hidden>{e.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    +{e.amount.toLocaleString()} {e.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{formatAgo(e.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function formatAgo(at: number): string {
  const diff = Math.max(0, Date.now() - at);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago · ${new Date(at).toLocaleDateString()}`;
}

function Counter({
  icon, value, onAdd, ariaLabel, wide, tip,
}: { icon: React.ReactNode; value: number; onAdd?: () => void; ariaLabel: string; wide?: boolean; tip?: string }) {
  return (
    <div
      className={`pill-counter flex items-center gap-1 pl-1.5 pr-0.5 py-0.5 ${wide ? "min-w-[96px] sm:min-w-[120px]" : "min-w-[72px] sm:min-w-[90px]"}`}
      role="status"
      aria-label={ariaLabel}
      title={tip ?? ariaLabel}
    >
      <span className="shrink-0 w-6 h-6 rounded-full bg-black/30 flex items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 text-sm font-display tracking-wide text-cream-light text-right truncate">
        {formatCompact(value)}
      </span>
      <button
        onClick={onAdd}
        aria-label={`Add — ${tip ?? ariaLabel}`}
        title={tip ? `Get more — ${tip}` : "Get more"}
        className="add-stub w-6 h-6 flex items-center justify-center"
      >
        <Plus size={16} strokeWidth={3} />
      </button>
    </div>
  );
}

function KeySlots({ count, onAdd, tip }: { count: number; onAdd?: () => void; tip?: string }) {
  const slots = [0, 1, 2];
  return (
    <button
      onClick={onAdd}
      className="pill-counter flex items-center gap-1 px-1.5 py-1"
      aria-label={`${count} of 3 key shards${tip ? ` — ${tip}` : ""}`}
      title={tip ?? `${count} of 3 key shards`}
    >
      {slots.map((i) => {
        const filled = i < count;
        return (
          <span
            key={i}
            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
              filled
                ? "bg-gradient-to-b from-yellow-300 to-amber-600 border-amber-900"
                : "bg-black/40 border-black/60"
            }`}
            aria-hidden="true"
          >
            <Key size={14} className={filled ? "text-amber-900" : "text-cream-light/30"} />
          </span>
        );
      })}
    </button>
  );
}

function formatCompact(n: number): string {
  if (n < 1000) return n.toLocaleString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 2 : 1)}K`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 2 : 1)}M`;
  return `${(n / 1_000_000_000).toFixed(2)}B`;
}