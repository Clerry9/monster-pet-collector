import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Lock, Check, Sparkles, Crown, Play, Clock, Trophy, Gift } from "lucide-react";
import { toast } from "sonner";
import { Season, SeasonReward, formatTimeRemaining } from "@/data/seasons";
import { SeasonProgress } from "@/hooks/useSeason";
import { useAuth } from "@/hooks/useAuth";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { MiniGame } from "@/components/MiniGame";
import { MiniGameJack } from "@/components/MiniGameJack";
import { SeasonLeaderboard } from "@/components/SeasonLeaderboard";

interface SeasonHubProps {
  season: Season;
  progress: SeasonProgress;
  msRemaining: number;
  rolls: number;
  coins: number;
  islandStars?: number;
  playerLevel?: number;
  onPlayMiniGame: () => boolean;
  onAwardSymbols: (amount: number) => number;
  onAwardStars?: (amount: number) => void;
  onClaimTier: (tier: number, reward: SeasonReward) => void;
  onBuyStreakSaver: () => boolean;
  onAddCoins?: (n: number) => void;
  onAddRolls?: (n: number) => void;
  onAddCardFlip?: (n: number) => void;
  onSpendCoins?: (n: number) => boolean;
}

const MINI_GAME_COST = 1;

export function SeasonHub({
  season,
  progress,
  msRemaining,
  rolls,
  coins,
  islandStars = 0,
  playerLevel = 1,
  onPlayMiniGame,
  onAwardSymbols,
  onAwardStars,
  onClaimTier,
  onBuyStreakSaver,
  onAddCoins,
  onAddRolls,
  onAddCardFlip,
  onSpendCoins,
}: SeasonHubProps) {
  const { user } = useAuth();
  const { openCheckout, loading } = usePaddleCheckout();
  const [miniGameOpen, setMiniGameOpen] = useState(false);
  const [jackGameOpen, setJackGameOpen] = useState(false);

  const handleBuyPass = async () => {
    if (!user) {
      toast.error("Please log in to purchase the season pass");
      return;
    }
    try {
      await openCheckout({
        priceId: "season_pass_one_time",
        customerEmail: user.email,
        customData: {
          userId: user.id,
          packId: "season_pass",
          seasonInstanceId: progress.seasonInstanceId,
        },
      });
    } catch {
      toast.error("Failed to open checkout");
    }
  };

  const handleStartMiniGame = () => {
    if (rolls < MINI_GAME_COST) {
      toast.error("You need at least 1 roll to play");
      return;
    }
    setMiniGameOpen(true);
  };

  const handleSpendRoll = () => {
    onPlayMiniGame();
  };

  const handleMiniGameFinish = (symbolsEarned: number, _score?: number) => {
    if (symbolsEarned > 0) {
      const final = onAwardSymbols(symbolsEarned);
      // Convert every 10 symbols into 1 island star → contributes to free card flips
      const starsFromSymbols = Math.floor(symbolsEarned / 10);
      if (starsFromSymbols > 0) onAwardStars?.(starsFromSymbols);
      toast.success(`+${final} ${season.symbol} earned!`, {
        description: starsFromSymbols > 0
          ? `Plus ⭐${starsFromSymbols} towards a free card flip${progress.passPurchased ? " • 2× pass active" : ""}`
          : (progress.passPurchased ? "Pass bonus 2× applied" : undefined),
      });
    }
  };

  const sortedRewards = [...season.rewards].sort((a, b) => a.tier - b.tier);

  return (
    <div
      className="w-full space-y-3"
      style={{
        // CSS vars for inline accent theming
        ["--season-accent" as any]: season.palette.accent,
        ["--season-glow" as any]: season.palette.glow,
      }}
    >
      {/* Hero banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel-wood relative overflow-hidden p-4 text-center"
        style={{
          background: `radial-gradient(ellipse at top, hsl(${season.palette.glow} / 0.55), hsl(var(--wood)))`,
        }}
      >
        <div className="text-4xl mb-1">{season.emoji}</div>
        <h2 className="font-display text-xl text-cream-light tracking-wider">
          {season.name.toUpperCase()}
        </h2>
        <p className="text-[11px] font-display text-cream/80 italic">{season.tagline}</p>
        <div className="mt-2 inline-flex items-center gap-1.5 bg-cream/95 px-3 py-1 rounded-full border-2 border-wood-dark text-wood-dark text-[11px] font-display">
          <Clock size={12} />
          Ends in {formatTimeRemaining(msRemaining)}
        </div>
      </motion.div>

      {/* Symbol counter */}
      <div className="panel-wood p-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-display text-cream/80">SYMBOLS</div>
          <div className="font-display text-3xl text-cream-light flex items-center gap-1.5">
            <span aria-hidden>{season.symbol}</span>
            <span>{progress.symbols}</span>
          </div>
          {progress.passPurchased && (
            <div className="text-[9px] font-display text-gold mt-1 flex items-center gap-1">
              <Crown size={10} /> 2× ACTIVE
            </div>
          )}
        </div>
        <div className="text-right text-[10px] font-display text-cream/70">
          🪙 {coins.toLocaleString()}
          <div className="opacity-70">🎲 {rolls} rolls</div>
          <div className="text-gold">⭐ {islandStars}/5 → flip</div>
        </div>
      </div>

      {/* Two mini-game choices */}
      <div className="grid grid-cols-2 gap-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleStartMiniGame}
          disabled={rolls < MINI_GAME_COST}
          className="btn-press rounded-2xl font-display text-sm flex flex-col items-center justify-center gap-1 py-3 disabled:opacity-50"
        >
          <Play size={18} />
          MATCH-3
          <span className="text-[9px] opacity-80">{MINI_GAME_COST} roll • 5×5</span>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            if (rolls < MINI_GAME_COST) { toast.error("You need at least 1 roll to play"); return; }
            setJackGameOpen(true);
          }}
          disabled={rolls < MINI_GAME_COST}
          className="rounded-2xl font-display text-sm flex flex-col items-center justify-center gap-1 py-3 border-2 border-wood-dark bg-gradient-to-br from-gold to-candy-red text-cream-light disabled:opacity-50 active:translate-y-0.5"
        >
          <Gift size={18} />
          JACK-IN-BOX
          <span className="text-[9px] opacity-90">{MINI_GAME_COST} roll • Memory</span>
        </motion.button>
      </div>

      {/* Pass purchase banner */}
      {!progress.passPurchased ? (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleBuyPass}
          disabled={loading}
          className="w-full panel-wood p-3 flex items-center gap-3 text-left disabled:opacity-60"
          style={{
            background: `linear-gradient(135deg, hsl(var(--gold)), hsl(${season.palette.glow}))`,
          }}
        >
          <Crown className="text-wood-dark" size={28} />
          <div className="flex-1">
            <div className="font-display text-sm text-wood-dark tracking-wide">SEASON PASS — $4.99</div>
            <div className="text-[10px] font-body text-wood-dark/80">
              All premium tiers • 2× symbols • Guaranteed cards
            </div>
          </div>
          <Sparkles className="text-wood-dark" size={18} />
        </motion.button>
      ) : (
        <div className="panel-wood p-2 flex items-center justify-center gap-2 text-cream-light font-display text-xs">
          <Crown className="text-gold" size={16} />
          PASS UNLOCKED — Claim premium rewards below
        </div>
      )}

      {/* Battle pass track */}
      <div className="panel-wood p-3 space-y-2">
        <div className="flex items-center justify-between font-display text-cream-light text-xs">
          <span>BATTLE PASS</span>
          <div className="flex gap-3 text-[10px]">
            <span className="opacity-80">FREE</span>
            <span className="text-gold">PREMIUM</span>
          </div>
        </div>

        <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {sortedRewards.map((r) => (
            <PassRow
              key={r.tier}
              reward={r}
              progress={progress}
              symbol={season.symbol}
              onClaim={(reward) => onClaimTier(r.tier, reward)}
              onBuyPass={handleBuyPass}
              buyPassLoading={loading}
            />
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <SeasonLeaderboard season={season} seasonInstanceId={progress.seasonInstanceId} />

      <AnimatePresence>
        {miniGameOpen && (
          <MiniGame
            season={season}
            costRolls={MINI_GAME_COST}
            hasRolls={rolls >= MINI_GAME_COST}
            coins={coins}
            onSpendRoll={handleSpendRoll}
            onFinish={handleMiniGameFinish}
            onClose={() => setMiniGameOpen(false)}
            onBuyStreakSaver={onBuyStreakSaver}
            playerLevel={playerLevel}
            onAddCoins={onAddCoins}
            onSpendCoins={onSpendCoins}
          />
        )}
        {jackGameOpen && (
          <MiniGameJack
            season={season}
            costRolls={MINI_GAME_COST}
            hasRolls={rolls >= MINI_GAME_COST}
            onSpendRoll={handleSpendRoll}
            onFinish={(s) => handleMiniGameFinish(s, 0)}
            onClose={() => setJackGameOpen(false)}
            playerLevel={playerLevel}
            onAddCoins={onAddCoins}
            onAddRolls={onAddRolls}
            onAwardStars={onAwardStars}
            onAddCardFlip={onAddCardFlip}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface PassRowProps {
  reward: SeasonReward;
  progress: SeasonProgress;
  symbol: string;
  onClaim: (reward: SeasonReward) => void;
  onBuyPass: () => void;
  buyPassLoading: boolean;
}

function PassRow({ reward, progress, symbol, onClaim, onBuyPass, buyPassLoading }: PassRowProps) {
  const reached = progress.symbols >= reward.symbolsRequired;
  const claimedFree = progress.claimedTiers.includes(reward.tier);
  const claimedPremium = progress.claimedTiers.includes(reward.tier + 1000);
  const pct = Math.min(100, (progress.symbols / reward.symbolsRequired) * 100);

  return (
    <div className="bg-cream/95 rounded-lg border-2 border-wood-dark p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-[10px] text-wood-dark">
          TIER {reward.tier} • {reward.symbolsRequired} {symbol}
        </span>
        {!reached && (
          <span className="text-[9px] font-body text-wood-dark/70">
            {progress.symbols}/{reward.symbolsRequired}
          </span>
        )}
      </div>
      <div className="h-1 rounded-full bg-wood-dark/20 overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-candy-red to-gold"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <RewardSlot
          label={reward.free?.label || "—"}
          locked={!reached}
          claimed={claimedFree}
          available={reached && reward.free !== undefined}
          tier="free"
          onClaim={() => reward.free && onClaim({ ...reward, premium: undefined })}
        />
        <RewardSlot
          label={reward.premium?.label || "—"}
          locked={!reached || !progress.passPurchased}
          claimed={claimedPremium}
          available={reached && progress.passPurchased && reward.premium !== undefined}
          tier="premium"
          reached={reached}
          needsPass={!progress.passPurchased}
          onClaim={() => reward.premium && onClaim({ ...reward, free: undefined, tier: reward.tier + 1000 })}
          onBuyPass={onBuyPass}
          buyPassLoading={buyPassLoading}
        />
      </div>
    </div>
  );
}

function RewardSlot({
  label,
  locked,
  claimed,
  available,
  tier,
  onClaim,
  reached,
  needsPass,
  onBuyPass,
  buyPassLoading,
}: {
  label: string;
  locked: boolean;
  claimed: boolean;
  available: boolean;
  tier: "free" | "premium";
  onClaim: () => void;
  reached?: boolean;
  needsPass?: boolean;
  onBuyPass?: () => void;
  buyPassLoading?: boolean;
}) {
  const base =
    tier === "premium"
      ? "border-gold bg-gradient-to-br from-gold/30 to-gold/10"
      : "border-wood-dark/40 bg-wood-light/20";

  if (claimed) {
    return (
      <div className={`rounded-md border-2 ${base} px-2 py-1 flex items-center justify-center gap-1 text-[10px] font-display text-wood-dark opacity-60`}>
        <Check size={11} /> CLAIMED
      </div>
    );
  }

  if (available) {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onClaim}
        animate={{ boxShadow: ["0 0 0 0 hsl(var(--gold)/0.0)", "0 0 0 4px hsl(var(--gold)/0.4)", "0 0 0 0 hsl(var(--gold)/0.0)"] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className={`rounded-md border-2 ${base} px-2 py-1 text-[10px] font-display text-wood-dark hover:brightness-105 active:translate-y-0.5 transition flex items-center justify-center gap-1`}
        aria-label={`Claim ${label}`}
      >
        <Gift size={10} className="text-wood-dark shrink-0" />
        <span className="truncate">CLAIM • {label}</span>
      </motion.button>
    );
  }

  // Premium reward locked behind the pass → one-tap upsell button
  if (tier === "premium" && needsPass && onBuyPass) {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onBuyPass}
        disabled={buyPassLoading}
        aria-label={`Buy Season Pass to unlock ${label}`}
        animate={
          reached
            ? { boxShadow: ["0 0 0 0 hsl(var(--gold)/0.0)", "0 0 0 5px hsl(var(--gold)/0.5)", "0 0 0 0 hsl(var(--gold)/0.0)"] }
            : undefined
        }
        transition={{ duration: 1.6, repeat: Infinity }}
        className={`rounded-md border-2 ${base} px-2 py-1 flex items-center justify-center gap-1 text-[10px] font-display text-wood-dark hover:brightness-110 active:translate-y-0.5 transition disabled:opacity-60 relative overflow-hidden`}
      >
        <Crown size={10} className="text-gold-deep shrink-0" />
        <span className="truncate">
          {reached ? `UNLOCK: ${label}` : `BUY PASS — ${label}`}
        </span>
      </motion.button>
    );
  }

  return (
    <div className={`rounded-md border-2 ${base} px-2 py-1 flex items-center justify-center gap-1 text-[10px] font-display text-wood-dark/50`}>
      {locked && <Lock size={10} />}
      <span className="truncate">{label}</span>
    </div>
  );
}
