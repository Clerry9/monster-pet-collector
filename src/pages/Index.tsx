import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Volume2, VolumeX, HelpCircle, Menu, X as XIcon, Settings as SettingsIcon } from "lucide-react";
import { TutorialCoachmark, CoachStep } from "@/components/TutorialCoachmark";
import { HelpDialog } from "@/components/HelpDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useTutorial } from "@/hooks/useTutorial";
import { toast } from "sonner";
import { isMuted, setMuted, startBgm, stopBgm, sfxCoinGain, sfxSkull, sfxLevelUp } from "@/lib/sfx";
import { isWeekend, formatCountdown, msUntilWeekendBoundary } from "@/lib/weekend";
import { Sparkles as SparklesIcon } from "lucide-react";
import { getLevelForXp, prestigeTierUnlocked } from "@/data/levels";
import { CoinCounter } from "@/components/CoinCounter";
import { GameBoard } from "@/components/GameBoard";
import { TopHud } from "@/components/TopHud";
import { MonsterDisplay } from "@/components/MonsterDisplay";
import { MonsterCollection } from "@/components/MonsterCollection";
import { CardCollection } from "@/components/CardCollection";
import { SpinWheel } from "@/components/SpinWheel";
import { DiceShop } from "@/components/DiceShop";
import { GameTabs } from "@/components/GameTabs";
import { SideRails } from "@/components/SideRails";
import { DailyReward } from "@/components/DailyReward";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { LevelProgressBar } from "@/components/LevelProgressBar";
import { BetSelector } from "@/components/BetSelector";
import { LevelUpCelebration } from "@/components/LevelUpCelebration";
import { PrestigeCelebration } from "@/components/PrestigeCelebration";
import { CardReveal } from "@/components/CardReveal";
import { IslandRewardRoulette, IslandReward } from "@/components/IslandRewardRoulette";
import { useGameState, BoardTile } from "@/hooks/useGameState";
import { useDailyReward } from "@/hooks/useDailyReward";
import { useAuth } from "@/hooks/useAuth";
import { LinkAccount } from "@/components/LinkAccount";
import { Link2 } from "lucide-react";
import { GameCard, ALL_CARDS, drawRandomCard } from "@/data/cards";
import { SeasonReward, formatTimeRemaining } from "@/data/seasons";
import { SpecialPacks } from "@/components/SpecialPacks";
import { RewardedAdButton } from "@/components/RewardedAdButton";
import { StarPack } from "@/components/StarPack";
import { LimitedTimeBundle } from "@/components/LimitedTimeBundle";
import { AdBanner } from "@/components/AdBanner";
import { SeasonHub } from "@/components/SeasonHub";
import { useSeason } from "@/hooks/useSeason";
import { useSeasonNotice } from "@/hooks/useSeasonNotice";
import { SeasonRotationModal } from "@/components/SeasonRotationModal";
import { Footer } from "@/components/Footer";
import { AuthStatusBadge } from "@/components/AuthStatusBadge";

type Tab = "board" | "monster" | "cards" | "collection" | "shop" | "spin" | "specials" | "season";

/**
 * Big, centered ⚡ energy pill displayed at the top-center of the board view.
 * Mirrors the BetSelector's energy logic but rendered larger so players can
 * always see their stamina at a glance.
 */
function CenterEnergyPill({
  energy, energyCap, energyUpdatedAt, energyRegenMs = 180_000,
}: { energy: number; energyCap: number; energyUpdatedAt?: string; energyRegenMs?: number }) {
  const cur = Math.min(energy, energyCap);
  const overflow = Math.max(0, energy - energyCap);
  const pct = energyCap > 0 ? Math.max(6, Math.min(100, Math.round((cur / energyCap) * 100))) : 0;
  const belowCap = energy < energyCap;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!belowCap || !energyUpdatedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [belowCap, energyUpdatedAt]);
  const countdown = (() => {
    if (!belowCap || !energyUpdatedAt) return null;
    const last = Date.parse(energyUpdatedAt);
    if (!Number.isFinite(last)) return null;
    const elapsed = Math.max(0, now - last);
    const remaining = Math.max(0, energyRegenMs - (elapsed % energyRegenMs));
    const m = Math.floor(remaining / 60_000);
    const s = Math.floor((remaining % 60_000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  })();
  return (
    <div
      className="pill-energy flex items-center gap-2 px-4 py-1.5 min-w-[200px] max-w-[80vw] shadow-chunky-sm"
      role="status"
      aria-label={`Energy ${energy} of ${energyCap}${countdown ? `, next in ${countdown}` : ""}`}
      title={`Refills 1 every 3 minutes up to ${energyCap}${countdown ? ` — next +1 in ${countdown}` : ""}`}
    >
      <span aria-hidden="true" className="text-base leading-none">⚡</span>
      <div className="flex-1 h-2 rounded-full bg-wood-dark/40 overflow-hidden">
        <div
          className="h-full bg-cream-light rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[12px] font-display leading-none tabular-nums text-cream-light">
        {energy}/{energyCap}
        {overflow > 0 && <span className="ml-1 text-[10px] opacity-90">+{overflow}</span>}
      </span>
      {countdown && (
        <span className="text-[10px] font-display opacity-80 tabular-nums text-cream-light/90">
          +1 in {countdown}
        </span>
      )}
    </div>
  );
}

/**
 * Slim banner above the game board that shows:
 *  - The weekend 2× coin event (live countdown until it ends or starts)
 *  - The next daily reward countdown (until local midnight) when claimed,
 *    or a "claim now" prompt with current streak when unclaimed.
 */
function EventBanner({
  alreadyClaimedDaily,
  streak,
  onOpenDaily,
}: {
  alreadyClaimedDaily: boolean;
  streak: number;
  onOpenDaily: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const weekendActive = isWeekend(new Date(now));
  const weekendMs = msUntilWeekendBoundary(new Date(now));

  // Time until next local midnight (next claimable daily reward).
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const dailyMs = Math.max(0, nextMidnight.getTime() - now);

  return (
    <div className="w-full max-w-md mx-auto mb-3 flex flex-wrap items-stretch justify-center gap-2">
      {weekendActive ? (
        <div
          className="flex-1 min-w-[160px] flex items-center justify-between gap-2 rounded-lg border-2 border-amber-500 bg-gradient-to-r from-amber-300 to-yellow-500 px-3 py-1.5 shadow-md"
          role="status"
          aria-label={`Weekend event: 2x coins active. Ends in ${formatCountdown(weekendMs)}`}
        >
          <span className="font-display text-xs text-wood-dark flex items-center gap-1.5">
            <SparklesIcon size={14} aria-hidden="true" />
            2× COIN WEEKEND
          </span>
          <span className="font-display text-[11px] tabular-nums text-wood-dark/80">
            ends in {formatCountdown(weekendMs)}
          </span>
        </div>
      ) : (
        <div
          className="flex-1 min-w-[160px] flex items-center justify-between gap-2 rounded-lg border-2 border-wood-dark/40 bg-cream/95 px-3 py-1.5"
          role="status"
          aria-label={`2x coin weekend starts in ${formatCountdown(weekendMs)}`}
        >
          <span className="font-display text-xs text-wood-dark flex items-center gap-1.5">
            <SparklesIcon size={14} aria-hidden="true" />
            2× weekend
          </span>
          <span className="font-display text-[11px] tabular-nums text-wood-dark/70">
            in {formatCountdown(weekendMs)}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenDaily}
        className={`flex-1 min-w-[160px] flex items-center justify-between gap-2 rounded-lg border-2 px-3 py-1.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          alreadyClaimedDaily
            ? "border-wood-dark/40 bg-cream/95 hover:bg-cream"
            : "border-emerald-600 bg-gradient-to-r from-emerald-400 to-teal-500 shadow-md animate-pulse"
        }`}
        aria-label={
          alreadyClaimedDaily
            ? `Daily reward claimed. Next reward in ${formatCountdown(dailyMs)}. Streak ${streak} days.`
            : `Claim daily reward. Streak ${streak} days.`
        }
      >
        <span className={`font-display text-xs flex items-center gap-1.5 ${alreadyClaimedDaily ? "text-wood-dark" : "text-wood-dark"}`}>
          <Gift size={14} aria-hidden="true" />
          🔥 {streak}d streak
        </span>
        <span className="font-display text-[11px] tabular-nums text-wood-dark/80">
          {alreadyClaimedDaily ? `next in ${formatCountdown(dailyMs)}` : "Claim now!"}
        </span>
      </button>
    </div>
  );
}

const Index = () => {
  const game = useGameState();
  const daily = useDailyReward(game.addCoins);
  const season = useSeason();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("board");
  const [showLink, setShowLink] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const isGuest = user?.is_anonymous === true;
  const guestName = isGuest
    ? ((user?.user_metadata as Record<string, unknown> | null)?.guest_name as string | undefined)
    : undefined;
  const [lastResult, setLastResult] = useState<{
    steps: number;
    tile: BoardTile;
    card?: GameCard;
    islandStarEarned?: boolean;
    monsterLevelUp?: { name: string; level: number; coinBonus: number };
  } | null>(null);
  const [levelUpData, setLevelUpData] = useState<ReturnType<typeof getLevelForXp> | null>(null);
  const [prestigeTier, setPrestigeTier] = useState<number | null>(null);
  const [drawnCard, setDrawnCard] = useState<GameCard | null>(null);
  const prevLevelRef = useRef(game.level);
  // Stash a level-up that happened while the monster is still hopping,
  // so the celebration only plays after handleLanded() fires.
  const pendingLevelUpRef = useRef<ReturnType<typeof getLevelForXp> | null>(null);
  const pendingPrestigeRef = useRef<number | null>(null);
  // Quick visual burst when an Island Star is awarded after a hop lands.
  const [starBurstKey, setStarBurstKey] = useState(0);
  // Island reward roulette — opens after the monster lands on an "island event" tile.
  const [rouletteOpen, setRouletteOpen] = useState(false);

  // Tutorial + help
  const mainTutorial = useTutorial("main");
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Season rotation notice
  const seasonNotice = useSeasonNotice(season.seasonInstanceId);
  const [rotationModalOpen, setRotationModalOpen] = useState(false);

  // Show rotation celebration on first launch of a new season (after tutorial)
  useEffect(() => {
    if (mainTutorial.completed && seasonNotice.isNew) {
      const t = window.setTimeout(() => setRotationModalOpen(true), 800);
      return () => window.clearTimeout(t);
    }
  }, [mainTutorial.completed, seasonNotice.isNew]);

  // Auto-open coachmarks on first launch (after a brief delay so UI is laid out)
  useEffect(() => {
    if (!mainTutorial.completed) {
      const t = window.setTimeout(() => setCoachOpen(true), 600);
      return () => window.clearTimeout(t);
    }
  }, [mainTutorial.completed]);

  const tutorialSteps: CoachStep[] = [
    {
      title: "Welcome to Monster Mash!",
      body: "Quick 30-second tour: roll the dice, collect monsters, and earn coins. Let's go!",
      emoji: "👋",
    },
    {
      selector: "[data-tutorial='board']",
      title: "Roll the dice",
      body: "Tap the board to roll. Your monster hops that many tiles and triggers whatever it lands on. Each roll costs 1 🎲.",
      emoji: "🎲",
    },
    {
      selector: "[data-tutorial='board']",
      title: "Earn coins 🪙",
      body: "Coin and bonus tiles pay out instantly. Skull tiles 💀 hurt — your monster will react!",
      emoji: "🪙",
    },
    {
      selector: "[data-tutorial='board']",
      title: "Collect cards 🎴",
      body: "Chest 📦 and star ⭐ tiles draw cards. Complete sets to unlock new monsters and permanent bonuses.",
      emoji: "🎴",
    },
    {
      selector: "[role='tab'][aria-controls='panel-monsters']",
      title: "Your monster album",
      body: "Browse every monster you own (and the ones still to find) here. Each evolves the more you play.",
      emoji: "👾",
    },
    {
      selector: "[role='tab'][aria-controls='panel-season']",
      title: "Seasonal Event",
      body: "New season every 3 days. Weekends bring 2× coin bonuses and limited-time monsters!",
      emoji: "🌟",
    },
    {
      selector: "[data-tutorial='help']",
      title: "Need help?",
      body: "Tap here anytime to revisit the rules or replay this tour. Now go roll your first dice!",
      emoji: "❓",
    },
  ];

  // Start background music on mount
  useEffect(() => {
    startBgm();
    return () => stopBgm();
  }, []);

  // Detect level-up + prestige milestones (every 100 levels). The actual
  // celebration is deferred until the monster finishes its hop so that all
  // post-roll feedback (cards, stars, level-up) appears together.
  useEffect(() => {
    if (game.level > prevLevelRef.current) {
      const lvl = getLevelForXp(game.xp);
      const tier = prestigeTierUnlocked(prevLevelRef.current, game.level);
      if (lastResult) {
        pendingLevelUpRef.current = lvl;
        if (tier > 0) pendingPrestigeRef.current = tier;
      } else {
        // No active hop (e.g. XP granted from a non-roll source) — show now.
        setLevelUpData(lvl);
        if (tier > 0) setPrestigeTier(tier);
      }
    }
    prevLevelRef.current = game.level;
  }, [game.level, game.xp, lastResult]);

  const handleRollDice = () => {
    const result = game.rollDice();
    if (result) {
      setLastResult(result);
      // NOTE: card reveal + island-star toast are deferred to handleLanded()
      // so they only fire AFTER the monster has finished hopping.
    }
  };

  // Fired by GameBoard when the monster has finished hopping for the latest roll.
  const handleLanded = () => {
    const result = lastResult;
    if (!result) return;
    // Personality reactions: celebrate or commiserate based on what we landed on.
    const tileType = result.tile?.type;
    if (tileType === "skull") {
      sfxSkull();
    } else if (tileType === "coins" || tileType === "bonus" || tileType === "chest" || tileType === "star") {
      sfxCoinGain();
    }
    if (result.card) {
      setDrawnCard(result.card);
    }
    if (result.islandStarEarned) {
      setStarBurstKey((k) => k + 1);
      // Award the star, then open the bonus roulette for an extra random prize.
      toast("⭐ Island Star!", {
        description: `${game.islandStars}/5 to a free card flip`,
        duration: 1500,
      });
      setRouletteOpen(true);
    } else if (tileType === "chest") {
      // Chests also pop the roulette — landing feels rewarding.
      setRouletteOpen(true);
    }
    if (result.monsterLevelUp) {
      const { name, level, coinBonus } = result.monsterLevelUp;
      sfxLevelUp();
      toast(`🍖 ${name} evolved!`, {
        description: `Level ${level} reached! Now grants +${coinBonus}% coins on all tiles.`,
        duration: 4000,
      });
    }
    // Flush any deferred level-up / prestige celebrations now that the hop is done.
    if (pendingLevelUpRef.current) {
      setLevelUpData(pendingLevelUpRef.current);
      pendingLevelUpRef.current = null;
    }
    if (pendingPrestigeRef.current) {
      setPrestigeTier(pendingPrestigeRef.current);
      pendingPrestigeRef.current = null;
    }
  };

  // Auto-trigger card flip reward when player has pending flips.
  // Skip while the season mini-game is open — otherwise the CardReveal
  // overlay stacks on top of the mini-game modal and feels like a freeze.
  useEffect(() => {
    if (tab === "season") return;
    if (game.pendingCardFlips > 0 && !drawnCard) {
      const card = drawRandomCard();
      game.consumeCardFlip();
      game.grantCard(card.id);
      setDrawnCard(card);
      toast.success("🌟 Free Card Flip!", { description: "From your collected island stars" });
    }
  }, [game.pendingCardFlips, drawnCard, tab]);

  // Mini-game costs 1 roll to play
  const handlePlayMiniGame = (): boolean => {
    if (game.energy < 1) return false;
    game.addEnergy(-1);
    return true;
  };

  // Streak saver power-up: 500 coins → extends mini-game combo window for one game
  const handleBuyStreakSaver = (): boolean => {
    if (game.coins < 500) {
      toast.error("Not enough coins (need 500)");
      return false;
    }
    game.addCoins(-500);
    toast.success("⚡ Streak Saver active!", { description: "Combo window extended to 4s" });
    return true;
  };

  // Battle pass tier claim — applies the reward to game state
  const handleClaimTier = (tier: number, reward: SeasonReward) => {
    const r = reward.premium ?? reward.free;
    if (!r) return;
    if (r.type === "coins") game.addCoins(r.amount ?? 0);
    else if (r.type === "rolls") game.addEnergy(r.amount ?? 0);
    else if (r.type === "symbols") season.addSymbols(r.amount ?? 0);
    else if (r.type === "card" && r.id) {
      game.grantCard(r.id);
      season.markCardUnlocked(r.id);
      const card = ALL_CARDS.find((c) => c.id === r.id);
      if (card) setDrawnCard(card);
    } else if (r.type === "monster" && r.id) game.grantMonster(r.id);
    else if (r.type === "dice" && r.id) game.grantDiceTier(r.id);
    season.claimTier(tier);
    toast.success(`Claimed: ${r.label}`);
  };

  const isBoardTab = tab === "board";
  // On the board tab, the 3D scene is fullscreen — collapse old top chrome into a drawer
  const showChrome = !isBoardTab || menuOpen;
  // Derived display values for the HUD (no extra DB schema needed)
  const hudKeys = Math.min(3, Math.floor(game.islandStars / 2)); // 0..3 visual key shards

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-3 py-4 overflow-hidden">
      <LinkAccount open={showLink} onClose={() => setShowLink(false)} />
      <LevelUpCelebration level={levelUpData} onComplete={() => setLevelUpData(null)} rolls={game.energy} />
      <PrestigeCelebration tier={prestigeTier} onComplete={() => setPrestigeTier(null)} />
      <PaymentTestModeBanner />
      <DailyReward
        open={daily.showModal}
        streak={daily.streak}
        reward={daily.reward}
        onClaim={daily.claim}
        onDismiss={daily.dismiss}
        alreadyClaimed={daily.alreadyClaimed}
      />

      {/* Floating hamburger — only on the fullscreen board */}
      {isBoardTab && (
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="fixed top-2 right-2 z-50 icon-tile-gold w-10 h-10 flex items-center justify-center shadow-chunky"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <XIcon size={18} /> : <Menu size={18} />}
        </button>
      )}

      {/* Top chrome — shown normally on non-board tabs, slide-down drawer over board tab */}
      <div
        className={
          isBoardTab
            ? `fixed inset-x-0 top-0 z-40 bg-background/95 backdrop-blur-md shadow-chunky transition-transform duration-300 ${menuOpen ? "translate-y-0" : "-translate-y-full"} px-3 pt-3 pb-3 flex flex-col items-center max-h-[80vh] overflow-y-auto`
            : "w-full flex flex-col items-center"
        }
      >
        <div className="w-full max-w-md mb-2">
          <LevelProgressBar xp={game.xp} level={game.level} />
        </div>

        <div className="w-full max-w-md flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { const next = !muted; setMuted(next); setMutedState(next); }}
              className="icon-tile-gold w-9 h-9 flex items-center justify-center"
              title={muted ? "Unmute" : "Mute"}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={daily.openModal}
              className="icon-tile-gold w-9 h-9 flex items-center justify-center"
              title="Daily Reward"
              aria-label="Daily Reward"
            >
              <Gift size={18} />
            </button>
          </div>
          <CoinCounter coins={game.coins} onAdd={() => setTab("shop")} />
          <div className="flex items-center gap-1.5">
            {isGuest && (
              <button
                onClick={() => setShowLink(true)}
                className="icon-tile-gold w-9 h-9 flex items-center justify-center"
                title="Link Account"
                aria-label="Link Account"
              >
                <Link2 size={16} />
              </button>
            )}
            <button
              data-tutorial="help"
              onClick={() => setHelpOpen(true)}
              className="icon-tile-gold w-9 h-9 flex items-center justify-center"
              title="How to play"
              aria-label="How to play"
            >
              <HelpCircle size={16} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="icon-tile-gold w-9 h-9 flex items-center justify-center"
              title="Settings"
              aria-label="Open settings"
            >
              <SettingsIcon size={16} />
            </button>
            <AuthStatusBadge compact />
          </div>
        </div>

        {/* Curved gold banner */}
        <div className="banner-gold px-6 py-2 mb-3">
          <h1 className="font-display text-2xl tracking-wide">⭐ MONSTER MASH ⭐</h1>
        </div>

        <EventBanner
          alreadyClaimedDaily={daily.alreadyClaimed}
          streak={daily.streak}
          onOpenDaily={daily.openModal}
        />

        {/* Stats */}
        <div className="w-full max-w-md flex items-center justify-center gap-4 mb-2 text-[11px] font-display text-wood-dark/80">
          <span title={`Refills 1 every 3 min · cap ${game.energyCap}`}>⚡ {game.energy}/{game.energyCap}</span>
          <span>👣 {game.totalSteps}</span>
          <span>🃏 {game.cardsCollected}</span>
        </div>

        {import.meta.env.DEV && (
          <div className="w-full max-w-md flex items-center justify-center gap-2 mb-2">
            <button
              onClick={() => {
                game.addXp(10000);
                toast.success("🧪 +10,000 XP granted");
              }}
              className="px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-display tracking-wide border-2 border-purple-900 shadow-chunky-sm"
              title="Dev only: instantly grant XP for testing level-ups"
            >
              🧪 +10,000 XP (DEV)
            </button>
          </div>
        )}

        {/* On the board view the dock at the bottom replaces this; on other tabs we keep it here */}
        {!isBoardTab && (
          <div data-tutorial="tabs">
            <GameTabs
              active={tab}
              onTabChange={setTab}
              newTabs={{ season: seasonNotice.isNew }}
              countdowns={{ season: formatTimeRemaining(season.msRemaining) }}
            />
          </div>
        )}
      </div>

      <CardReveal card={drawnCard} onComplete={() => setDrawnCard(null)} />

      {/* Island Star burst — short, snappy, matches the monster hop */}
      <AnimatePresence>
        {starBurstKey > 0 && (
          <motion.div
            key={starBurstKey}
            className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onAnimationComplete={() => {
              window.setTimeout(() => setStarBurstKey(0), 700);
            }}
          >
            <motion.div
              initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
              animate={{ scale: [0.2, 1.3, 1], rotate: [-25, 10, 0], opacity: [0, 1, 1] }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="text-7xl drop-shadow-[0_0_24px_rgba(253,224,71,0.9)]"
              aria-hidden
            >
              ⭐
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md flex-1 flex items-start justify-center py-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === "board" && (
            <motion.div
              key="board"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-0"
            >
              <div className="absolute inset-0" data-tutorial="board" data-level={getLevelForXp(game.xp).id}>
                <GameBoard
                  position={game.position}
                  absoluteStep={game.totalSteps}
                  monster={game.activeMonsterData}
                  rolls={game.energy}
                  lastResult={lastResult}
                  onRollDice={handleRollDice}
                  onLanded={handleLanded}
                  activeDiceMax={game.activeDiceTierData.maxRoll}
                  levelId={getLevelForXp(game.xp).id}
                  seasonAccent={`hsl(${season.season.palette.accent})`}
                  seasonGlow={`hsl(${season.season.palette.glow})`}
                  seasonSymbol={season.season.symbol}
                  fullscreen
                  islandStars={game.islandStars}
                  pendingCardFlips={game.pendingCardFlips}
                  betMultiplier={game.betMultiplier}
                />
              </div>
              <div className="absolute top-2 left-2 right-2 z-20 pointer-events-none">
                <div className="pointer-events-auto">
                  {/* Coin-Master style HUD — always visible on board */}
                  <TopHud
                    gems={game.pendingCardFlips}
                    coins={game.coins}
                    keys={hudKeys}
                    stars={game.islandStars}
                    xp={game.xp}
                    level={game.level}
                    betMultiplier={game.betMultiplier}
                    guestName={guestName}
                    onAddCoins={() => setTab("shop")}
                    onAddGems={() => setTab("specials")}
                    onAddKeys={() => setTab("season")}
                    onAddStars={() => setTab("specials")}
                  />
                </div>
                {/* Prominent centered ⚡ energy pill — main on-screen energy indicator */}
                <div className="pointer-events-auto mt-2 flex justify-center">
                  <CenterEnergyPill
                    energy={game.energy}
                    energyCap={game.energyCap}
                    energyUpdatedAt={game.energyUpdatedAt}
                    energyRegenMs={game.energyRegenMs}
                  />
                </div>
                <div className="pointer-events-auto mt-2">
                  <SideRails
                    msRemaining={season.msRemaining}
                    newEvent={seasonNotice.isNew}
                    onOpenSeason={() => setTab("season")}
                    onOpenSpin={() => setTab("spin")}
                    onOpenDaily={daily.openModal}
                    onOpenSpecials={() => setTab("specials")}
                    onOpenCollection={() => setTab("collection")}
                    onOpenCards={() => setTab("cards")}
                  />
                </div>
              </div>
              {/* Bottom: BetSelector pill row above the wooden dock tab bar */}
              <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none flex flex-col">
                <div className="px-2 pb-1 pointer-events-auto max-w-md mx-auto w-full">
                  <BetSelector
                    coins={game.coins}
                    currentBet={game.betMultiplier}
                    onSetBet={game.setBetMultiplier}
                    energy={game.energy}
                    energyCap={game.energyCap}
                    energyUpdatedAt={game.energyUpdatedAt}
                    energyRegenMs={game.energyRegenMs}
                  />
                </div>
                <div className="dock-wood w-full px-3 py-2 pointer-events-auto pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  <div data-tutorial="tabs" className="max-w-md mx-auto">
                    <GameTabs
                      active={tab}
                      onTabChange={setTab}
                      newTabs={{ season: seasonNotice.isNew }}
                      countdowns={{ season: formatTimeRemaining(season.msRemaining) }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === "monster" && (
            <motion.div
              key="monster"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="flex flex-col items-center"
            >
              <MonsterDisplay
                monster={game.activeMonsterData}
                monsterXp={game.monsterTaps[game.activeMonster] ?? 0}
              />
            </motion.div>
          )}

          {tab === "cards" && (
            <motion.div
              key="cards"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="w-full"
            >
              <CardCollection
                collectedCards={game.collectedCards}
                coins={game.coins}
                onTradeCard={game.tradeCard}
              />
            </motion.div>
          )}

          {tab === "shop" && (
            <motion.div
              key="shop"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="w-full space-y-3"
            >
              <div className="panel-wood p-3 flex flex-col items-center gap-2">
                <div className="font-display text-sm text-cream-light text-center">
                  📺 FREE COINS — watch a short ad
                </div>
                <RewardedAdButton playerLevel={game.level} onReward={(c) => game.addCoins(c)} />
                <div className="text-[10px] text-cream/70 text-center">
                  +50 coins per ad, +50 more every 5 levels
                </div>
              </div>
              <LimitedTimeBundle
                coins={game.coins}
                onPurchase={(rolls, coinsReward) => {
                  game.addCoins(-400 + coinsReward);
                  game.addEnergy(rolls);
                }}
              />
              <StarPack
                coins={game.coins}
                onBuy={(cost, stars) => {
                  game.addCoins(-cost);
                  game.addStars(stars);
                }}
              />
              <DiceShop
                coins={game.coins}
                rolls={game.energy}
                level={game.level}
                unlockedDiceTiers={game.unlockedDiceTiers}
                activeDiceTier={game.activeDiceTier}
                pendingPurchases={game.pendingPurchases}
                onBuyPack={game.buyDicePack}
                onUnlockTier={game.unlockDiceTier}
                onSelectTier={game.setActiveDiceTier}
              />
              <div className="flex justify-center pt-2">
                <AdBanner />
              </div>
            </motion.div>
          )}

          {tab === "collection" && (
            <motion.div
              key="collection"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="w-full"
            >
              <MonsterCollection
                unlockedMonsters={game.unlockedMonsters}
                activeMonster={game.activeMonster}
                coins={game.coins}
                monsterTaps={game.monsterTaps}
                onSelect={game.setActiveMonster}
                onUnlock={game.unlockMonster}
              />
            </motion.div>
          )}

          {tab === "spin" && (
            <motion.div
              key="spin"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
            >
              <SpinWheel onWin={game.addCoins} lastSpinAt={game.lastSpinAt} onSpinRecord={game.recordSpin} />
            </motion.div>
          )}

          {tab === "specials" && (
            <motion.div
              key="specials"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="w-full"
            >
              <SpecialPacks />
            </motion.div>
          )}

          {tab === "season" && (
            <motion.div
              key="season"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="w-full"
            >
              <SeasonHub
                season={season.season}
                progress={season.progress}
                msRemaining={season.msRemaining}
                rolls={game.energy}
                coins={game.coins}
                islandStars={game.islandStars}
                playerLevel={game.level}
                onPlayMiniGame={handlePlayMiniGame}
                onAwardSymbols={season.addSymbols}
                onAwardStars={game.addStars}
                onClaimTier={handleClaimTier}
                onBuyStreakSaver={handleBuyStreakSaver}
                onAddCoins={game.addCoins}
                onAddRolls={game.addEnergy}
                onAddCardFlip={game.addCardFlip}
                onSpendCoins={(n) => {
                  if (game.coins < n) return false;
                  game.addCoins(-n);
                  return true;
                }}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <SeasonRotationModal
        open={rotationModalOpen}
        season={season.season}
        onClose={() => {
          setRotationModalOpen(false);
          seasonNotice.acknowledge();
        }}
        onGoToEvent={() => {
          setRotationModalOpen(false);
          seasonNotice.acknowledge();
          setTab("season");
        }}
      />
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onReplayTutorial={() => {
          mainTutorial.reset();
          setCoachOpen(true);
        }}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onReplayTutorial={() => {
          setSettingsOpen(false);
          mainTutorial.reset();
          setCoachOpen(true);
        }}
      />
      <TutorialCoachmark
        open={coachOpen}
        steps={tutorialSteps}
        onClose={() => {
          setCoachOpen(false);
          mainTutorial.markCompleted();
        }}
        onFinish={() => {
          setCoachOpen(false);
          mainTutorial.markCompleted();
        }}
      />
      {!isBoardTab && <Footer />}
    </div>
  );
};

export default Index;
