import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, LogOut, Volume2, VolumeX, HelpCircle, Menu, X as XIcon } from "lucide-react";
import { TutorialCoachmark, CoachStep } from "@/components/TutorialCoachmark";
import { HelpDialog } from "@/components/HelpDialog";
import { useTutorial } from "@/hooks/useTutorial";
import { toast } from "sonner";
import { isMuted, setMuted, startBgm, stopBgm } from "@/lib/sfx";
import { getLevelForXp, prestigeTierUnlocked } from "@/data/levels";
import { CoinCounter } from "@/components/CoinCounter";
import { GameBoard } from "@/components/GameBoard";
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

type Tab = "board" | "monster" | "cards" | "collection" | "shop" | "spin" | "specials" | "season";

const Index = () => {
  const game = useGameState();
  const daily = useDailyReward(game.addCoins);
  const season = useSeason();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("board");
  const [showLink, setShowLink] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const isGuest = user?.is_anonymous === true;
  const [lastResult, setLastResult] = useState<{ steps: number; tile: BoardTile; card?: GameCard } | null>(null);
  const [levelUpData, setLevelUpData] = useState<ReturnType<typeof getLevelForXp> | null>(null);
  const [prestigeTier, setPrestigeTier] = useState<number | null>(null);
  const [drawnCard, setDrawnCard] = useState<GameCard | null>(null);
  const prevLevelRef = useRef(game.level);

  // Tutorial + help
  const mainTutorial = useTutorial("main");
  const [helpOpen, setHelpOpen] = useState(false);
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
      body: "Roll the dice, move along the board, collect cards, and evolve your monster. Let's take a quick tour.",
      emoji: "👋",
    },
    {
      selector: "[data-tutorial='board']",
      title: "Roll the dice",
      body: "Tap to roll. You'll move that many tiles and trigger whatever you land on. Each roll costs 1 of your 🎲 rolls.",
      emoji: "🎲",
    },
    {
      selector: "[data-tutorial='board']",
      title: "Land on chest 📦 or star ⭐",
      body: "These tiles draw cards (~20% chance per roll). Complete sets to unlock new monsters and bonuses.",
      emoji: "🎴",
    },
    {
      selector: "[role='tab'][aria-controls='panel-season']",
      title: "Seasonal Event",
      body: "Every 3 days a new season starts. Play the mini-game to earn special symbols and unlock rare event cards.",
      emoji: "🌟",
    },
    {
      selector: "[data-tutorial='help']",
      title: "Need help?",
      body: "Tap this anytime for the rules, full odds breakdown, and to replay this tour.",
      emoji: "❓",
    },
  ];

  // Start background music on mount
  useEffect(() => {
    startBgm();
    return () => stopBgm();
  }, []);

  // Detect level-up + prestige milestones (every 100 levels)
  useEffect(() => {
    if (game.level > prevLevelRef.current) {
      setLevelUpData(getLevelForXp(game.xp));
      const tier = prestigeTierUnlocked(prevLevelRef.current, game.level);
      if (tier > 0) setPrestigeTier(tier);
    }
    prevLevelRef.current = game.level;
  }, [game.level, game.xp]);

  const handleRollDice = () => {
    const result = game.rollDice();
    if (result) {
      setLastResult(result);
      if (result.card) {
        setDrawnCard(result.card);
      }
      if (result.islandStarEarned) {
        toast("⭐ Island Star!", {
          description: `${game.islandStars + 1}/5 to a free card flip`,
          duration: 1800,
        });
      }
      if (result.monsterLevelUp) {
        const { name, level, coinBonus } = result.monsterLevelUp;
        toast(`🍖 ${name} evolved!`, {
          description: `Level ${level} reached! Now grants +${coinBonus}% coins on all tiles.`,
          duration: 4000,
        });
      }
    }
  };

  // Auto-trigger card flip reward when player has pending flips
  useEffect(() => {
    if (game.pendingCardFlips > 0 && !drawnCard) {
      const card = drawRandomCard();
      game.consumeCardFlip();
      game.grantCard(card.id);
      setDrawnCard(card);
      toast.success("🌟 Free Card Flip!", { description: "From your collected island stars" });
    }
  }, [game.pendingCardFlips, drawnCard]);

  // Mini-game costs 1 roll to play
  const handlePlayMiniGame = (): boolean => {
    if (game.rolls < 1) return false;
    game.addRolls(-1);
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
    else if (r.type === "rolls") game.addRolls(r.amount ?? 0);
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
  // On the board tab, the 3D scene is fullscreen — collapse top chrome into a drawer
  const showChrome = !isBoardTab || menuOpen;

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-3 py-4 overflow-hidden">
      <LinkAccount open={showLink} onClose={() => setShowLink(false)} />
      <LevelUpCelebration level={levelUpData} onComplete={() => setLevelUpData(null)} rolls={game.rolls} />
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
              onClick={signOut}
              className="icon-tile-gold w-9 h-9 flex items-center justify-center"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Curved gold banner */}
        <div className="banner-gold px-6 py-2 mb-3">
          <h1 className="font-display text-2xl tracking-wide">⭐ MONSTER MASH ⭐</h1>
        </div>

        {/* Stats */}
        <div className="w-full max-w-md flex items-center justify-center gap-4 mb-2 text-[11px] font-display text-wood-dark/80">
          <span>🎲 {game.rolls}</span>
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

        <div data-tutorial="tabs" onClick={() => isBoardTab && setMenuOpen(false)}>
          <GameTabs
            active={tab}
            onTabChange={setTab}
            newTabs={{ season: seasonNotice.isNew }}
            countdowns={{ season: formatTimeRemaining(season.msRemaining) }}
          />
        </div>
      </div>

      <CardReveal card={drawnCard} onComplete={() => setDrawnCard(null)} />

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
                  monster={game.activeMonsterData}
                  rolls={game.rolls}
                  lastResult={lastResult}
                  onRollDice={handleRollDice}
                  activeDiceMax={game.activeDiceTierData.maxRoll}
                  levelId={getLevelForXp(game.xp).id}
                  seasonAccent={`hsl(${season.season.palette.accent})`}
                  seasonGlow={`hsl(${season.season.palette.glow})`}
                  seasonSymbol={season.season.symbol}
                  fullscreen
                  islandStars={game.islandStars}
                  pendingCardFlips={game.pendingCardFlips}
                />
              </div>
              <div className="absolute top-2 left-2 right-2 z-20 pointer-events-none">
                <div className="pointer-events-auto">
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
              <div className="absolute bottom-3 left-0 right-0 z-20 px-3 pointer-events-none">
                <div className="max-w-md mx-auto pointer-events-auto bg-gradient-to-t from-wood-dark/80 via-wood-dark/40 to-transparent rounded-2xl p-2">
                  <BetSelector
                    coins={game.coins}
                    currentBet={game.betMultiplier}
                    onSetBet={game.setBetMultiplier}
                  />
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
                  game.addRolls(rolls);
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
                rolls={game.rolls}
                level={game.level}
                unlockedDiceTiers={game.unlockedDiceTiers}
                activeDiceTier={game.activeDiceTier}
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
                rolls={game.rolls}
                coins={game.coins}
                islandStars={game.islandStars}
                playerLevel={game.level}
                onPlayMiniGame={handlePlayMiniGame}
                onAwardSymbols={season.addSymbols}
                onAwardStars={game.addStars}
                onClaimTier={handleClaimTier}
                onBuyStreakSaver={handleBuyStreakSaver}
                onAddCoins={game.addCoins}
                onAddRolls={game.addRolls}
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
      <Footer />
    </div>
  );
};

export default Index;
