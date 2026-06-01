import { motion } from "framer-motion";
import { Gem, Coins, Key, Star, Flame, PawPrint, Plus, Sparkles } from "lucide-react";
import { getLevelProgress } from "@/data/levels";
import { energyCostForBet } from "@/hooks/useGameState";

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
}

/**
 * Coin-Master style top HUD: gem · coin · 3 key slots · star + center XP bar.
 */
export function TopHud({
  gems, coins, keys, stars, shards = 0, xp, level, betMultiplier, guestName,
  onAddGems, onAddCoins, onAddKeys, onAddStars, onAddShards,
}: TopHudProps) {
  const { current, progress, xpInLevel, xpNeeded } = getLevelProgress(xp);

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

        {/* Flame multiplier on right */}
        <div className="shrink-0 relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-b from-amber-300 via-orange-500 to-red-600 border-2 border-wood-dark flex items-center justify-center shadow-chunky-sm">
            <Flame size={18} className="text-cream-light" fill="currentColor" />
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[11px] font-display bg-wood-dark text-cream-light px-1 rounded-full border border-cream-light/60 leading-none py-[1px]">
            ×{betMultiplier}
          </span>
          <span
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[11px] font-display text-cream-light/90 leading-none whitespace-nowrap drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]"
            aria-label={`Each roll costs ${energyCostForBet(betMultiplier)} energy`}
          >
            −{energyCostForBet(betMultiplier)}⚡
          </span>
        </div>
      </div>
    </div>
  );
}

function Counter({
  icon, value, onAdd, ariaLabel, wide, tip,
}: { icon: React.ReactNode; value: number; onAdd?: () => void; ariaLabel: string; wide?: boolean; tip?: string }) {
  return (
    <div
      className={`pill-counter flex items-center gap-1 pl-1.5 pr-0.5 py-0.5 ${wide ? "min-w-[88px] sm:min-w-[110px]" : "min-w-[64px] sm:min-w-[78px]"}`}
      role="status"
      aria-label={ariaLabel}
      title={tip ?? ariaLabel}
    >
      <span className="shrink-0 w-5 h-5 rounded-full bg-black/30 flex items-center justify-center" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 text-[12px] font-display tracking-wide text-cream-light text-right truncate">
        {formatCompact(value)}
      </span>
      <button
        onClick={onAdd}
        aria-label={`Add — ${tip ?? ariaLabel}`}
        title={tip ? `Get more — ${tip}` : "Get more"}
        className="add-stub w-5 h-5 flex items-center justify-center"
      >
        <Plus size={12} strokeWidth={3} />
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
            className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${
              filled
                ? "bg-gradient-to-b from-yellow-300 to-amber-600 border-amber-900"
                : "bg-black/40 border-black/60"
            }`}
            aria-hidden="true"
          >
            <Key size={10} className={filled ? "text-amber-900" : "text-cream-light/30"} />
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