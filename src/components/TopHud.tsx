import { motion } from "framer-motion";
import { Gem, Coins, Key, Star, PawPrint, Plus, Sparkles, History } from "lucide-react";
import { getLevelProgress } from "@/data/levels";
import { energyCostForBet } from "@/hooks/useGameState";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { pickReward, type Reward, type RewardTemplate } from "@/data/rewardPool";
import { useRewardPool } from "@/hooks/useRewardPool";
import { useIslandPreviewHistory } from "@/hooks/useIslandPreviewHistory";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sfxDiceTick, sfxRouletteWin, sfxCoinGain } from "@/lib/sfx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getRewardFeedbackPrefs,
  subscribeRewardFeedback,
  vibrateWithPrefs,
  type RewardFeedbackPrefs,
} from "@/lib/rewardFeedback";

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
   * May return a Promise — the HUD will race it against a safety timeout
   * so a stuck claim never freezes the reveal UI.
   */
  onClaimReward?: (reward: Reward) => void | Promise<void>;
  /**
   * Optional JSX rendered between the XP bar and the prize-circle row —
   * used to slot the centered energy pill so it sits right under the XP bar.
   */
  energySlot?: ReactNode;
  /**
   * When provided, the prize roulette is driven by the monster's movement
   * instead of a manual tap: it spins while `externalRolling` is `true`
   * and locks the visible prize the moment it flips back to `false`.
   */
  externalRolling?: boolean;
}

/** Cooldown after a claim before cycling resumes — keeps the won prize visible. */
const CLAIM_LOCK_MS = 60_000;

/** Max time we wait for the parent's onClaimReward before bailing out. */
const CLAIM_TIMEOUT_MS = 5_000;
/** Max retries for a failing/slow claim before surfacing an error. */
const CLAIM_MAX_RETRIES = 1;

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

/** Race a promise against a timeout — rejects when the deadline hits. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("claim timeout")), ms);
    p.then(
      (v) => { window.clearTimeout(timer); resolve(v); },
      (e) => { window.clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Coin-Master style top HUD: gem · coin · 3 key slots · star + center XP bar.
 */
export function TopHud({
  gems, coins, keys, stars, shards = 0, xp, level, betMultiplier, guestName,
  onAddGems, onAddCoins, onAddKeys, onAddStars, onAddShards, onClaimReward,
  energySlot, externalRolling,
}: TopHudProps) {
  const { current, progress, xpInLevel, xpNeeded } = getLevelProgress(xp);

  // Configurable odds — admin overrides applied on top of SHARED_POOL.
  const { pool } = useRewardPool();

  // Reveal state machine: idle → rolling → locked → idle.
  const [phase, setPhase] = useState<"idle" | "rolling" | "locked">("idle");
  const [preview, setPreview] = useState<Reward>(() => pickFromPool(pool));
  const [lockedUntil, setLockedUntil] = useState(0);
  // Retry countdown — non-null while we're between claim attempts.
  const [retrySecondsLeft, setRetrySecondsLeft] = useState<number | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const history = useIslandPreviewHistory();

  // Sound + haptic prefs (localStorage, with live updates from the
  // Settings dialog).
  const [feedback, setFeedback] = useState<RewardFeedbackPrefs>(() => getRewardFeedbackPrefs());
  useEffect(() => subscribeRewardFeedback(setFeedback), []);

  const playSfx = (fn: () => void) => { if (feedback.sound) { try { fn(); } catch {} } };

  /** Shared post-spin grant: handles retries + a visible countdown. */
  const grantWithRetry = async (final: Reward, lockedId: string | null) => {
    const RETRY_DELAY_MS = 1500;
    let attempt = 0;
    let granted = false;
    while (attempt <= CLAIM_MAX_RETRIES && !granted) {
      try {
        await withTimeout(Promise.resolve(onClaimReward?.(final)), CLAIM_TIMEOUT_MS);
        granted = true;
      } catch {
        attempt += 1;
        if (attempt > CLAIM_MAX_RETRIES) break;
        // Show countdown for the next attempt.
        const start = Date.now();
        setRetrySecondsLeft(Math.ceil(RETRY_DELAY_MS / 1000));
        const tickId = window.setInterval(() => {
          const remain = Math.max(0, RETRY_DELAY_MS - (Date.now() - start));
          setRetrySecondsLeft(remain > 0 ? Math.ceil(remain / 1000) : 0);
        }, 250);
        await new Promise<void>((r) => window.setTimeout(r, RETRY_DELAY_MS));
        window.clearInterval(tickId);
        setRetrySecondsLeft(null);
      }
    }
    if (!granted) {
      toast.error("Couldn't claim that prize — please try again.", {
        description: `${final.emoji} ${final.amount.toLocaleString()} ${final.label}`,
      });
      setPhase("idle");
      setLockedUntil(0);
      return;
    }
    if (lockedId) {
      supabase.rpc("claim_island_landing_reward", { p_id: lockedId }).then(() => {}, () => {});
    }
    toast.success(`+${final.amount.toLocaleString()} ${final.label}`, {
      description: `${final.emoji} added to your stash`,
    });
  };

  // Auto-sync: when the parent says the monster is moving, spin in sync
  // with the hop and lock the visible prize when the monster stops.
  useEffect(() => {
    if (externalRolling === undefined) return;
    if (externalRolling) {
      if (phaseRef.current === "idle") setPhase("rolling");
    } else if (phaseRef.current === "rolling") {
      const final = pickFromPool(pool);
      setPreview(final);
      setPhase("locked");
      setLockedUntil(Date.now() + CLAIM_LOCK_MS);
      playSfx(sfxRouletteWin);
      playSfx(sfxCoinGain);
      vibrateWithPrefs([20, 40, 60, 40, 120]);
      history.push(final);
      void grantWithRetry(final, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalRolling]);

  // Restore a server-locked, unclaimed reward after a refresh so the
  // final prize can't be re-rolled mid-spin.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc("get_pending_island_landing_reward");
        if (cancelled || !data) return;
        const row: any = Array.isArray(data) ? data[0] : data;
        if (!row) return;
        setPreview({
          kind: row.kind,
          amount: row.amount,
          label: row.label,
          emoji: row.emoji,
        });
        setPhase("locked");
        setLockedUntil(Date.now() + CLAIM_LOCK_MS);
      } catch { /* offline / signed-out — fall back to local cycling */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Cycle previews — fast while rolling (driven by hop or manual tap),
  // slow + ambient while idle. Locked phase freezes the won prize.
  useEffect(() => {
    if (phase === "locked") return;
    const ms = phase === "rolling" ? 110 : 3000;
    const id = window.setInterval(() => {
      setPreview(pickFromPool(pool));
      if (phaseRef.current === "rolling") {
        playSfx(sfxDiceTick);
        vibrateWithPrefs(8);
      }
    }, ms);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pool]);

  // Auto-release the lock so cycling can resume after the cooldown.
  useEffect(() => {
    if (phase !== "locked") return;
    const remaining = Math.max(0, lockedUntil - Date.now());
    const id = window.setTimeout(() => setPhase("idle"), remaining);
    return () => window.clearTimeout(id);
  }, [phase, lockedUntil]);

  // Manual tap is only available when there's no parent-driven roll.
  const canClaim = phase === "idle" && externalRolling === undefined;

  const runReveal = async () => {
    if (!canClaim) return;
    setPhase("rolling");

    // Server-of-truth: lock the final reward up-front so the prize
    // can't change if the page refreshes mid-spin.
    const candidate = pickFromPool(pool);
    let lockedId: string | null = null;
    let final: Reward = candidate;
    try {
      const { data, error } = await supabase.rpc("lock_island_landing_reward", {
        p_kind: candidate.kind,
        p_amount: candidate.amount,
        p_label: candidate.label,
        p_emoji: candidate.emoji,
      });
      if (error) throw error;
      const row: any = Array.isArray(data) ? data[0] : data;
      if (row) {
        lockedId = row.id;
        final = { kind: row.kind, amount: row.amount, label: row.label, emoji: row.emoji };
      }
    } catch {
      // Guests / offline: still run reveal locally so play isn't blocked.
    }

    // Fast cycling — ~80ms steps, decelerating, ~2s total.
    const steps = 22;
    for (let i = 1; i < steps; i++) {
      setPreview(pickFromPool(pool));
      playSfx(sfxDiceTick);
      vibrateWithPrefs(8);
      const delay = 60 + Math.pow(i / steps, 2.4) * 220;
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((r) => window.setTimeout(r, delay));
      if (phaseRef.current !== "rolling") return; // bailed out elsewhere
    }

    setPreview(final);
    setPhase("locked");
    setLockedUntil(Date.now() + CLAIM_LOCK_MS);
    playSfx(sfxRouletteWin);
    playSfx(sfxCoinGain);
    vibrateWithPrefs([20, 40, 60, 40, 120]);
    history.push(final);

    await grantWithRetry(final, lockedId);
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
      </div>

      {/* Island-landing prize preview — placed on its own row BELOW
          the XP bar so the bigger icons can't overlap level text. */}
      <div className="flex items-center justify-end gap-3 mt-1 pr-1">
        <button
          type="button"
          onClick={runReveal}
          disabled={!canClaim}
          data-tutorial="prize-circle"
          className="relative outline-none focus-visible:ring-2 focus-visible:ring-cream-light rounded-full disabled:cursor-not-allowed pr-1"
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
          <div className="flex items-center gap-2">
            <motion.div
              key={preview.emoji + preview.label + phase}
              initial={{ scale: phase === "rolling" ? 1.05 : 0.7, opacity: 0 }}
              animate={{
                scale: phase === "locked" ? [1, 1.3, 1] : 1,
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
              className={`w-14 h-14 rounded-full border-[3px] border-wood-dark flex items-center justify-center shadow-chunky-sm ${
                phase === "locked"
                  ? "bg-gradient-to-b from-lime-300 via-emerald-400 to-emerald-600 ring-2 ring-emerald-200"
                  : "bg-gradient-to-b from-yellow-300 via-amber-400 to-orange-500"
              }`}
            >
              <span className="text-3xl leading-none">{preview.emoji}</span>
            </motion.div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[11px] font-display bg-wood-dark text-cream-light px-1.5 rounded-full border border-cream-light/60 py-[1px] whitespace-nowrap">
                ×{betMultiplier}
              </span>
              <span
                className="text-[11px] font-display text-cream-light/90 whitespace-nowrap drop-shadow-[0_1px_0_rgba(0,0,0,0.6)] mt-0.5"
                aria-label={`Each roll costs ${energyCostForBet(betMultiplier)} energy`}
              >
                −{energyCostForBet(betMultiplier)}⚡
              </span>
            </div>
          </div>
        </button>

        <HistoryButton entries={history.entries} onClear={history.clear} />
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