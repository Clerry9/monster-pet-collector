import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, LogOut, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { isMuted, setMuted, startBgm, stopBgm } from "@/lib/sfx";
import { getLevelForXp } from "@/data/levels";
import { CoinCounter } from "@/components/CoinCounter";
import { GameBoard } from "@/components/GameBoard";
import { MonsterDisplay } from "@/components/MonsterDisplay";
import { MonsterCollection } from "@/components/MonsterCollection";
import { CardCollection } from "@/components/CardCollection";
import { SpinWheel } from "@/components/SpinWheel";
import { DiceShop } from "@/components/DiceShop";
import { GameTabs } from "@/components/GameTabs";
import { DailyReward } from "@/components/DailyReward";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { LevelProgressBar } from "@/components/LevelProgressBar";
import { BetSelector } from "@/components/BetSelector";
import { LevelUpCelebration } from "@/components/LevelUpCelebration";
import { CardReveal } from "@/components/CardReveal";
import { useGameState, BoardTile } from "@/hooks/useGameState";
import { useDailyReward } from "@/hooks/useDailyReward";
import { useAuth } from "@/hooks/useAuth";
import { LinkAccount } from "@/components/LinkAccount";
import { Link2 } from "lucide-react";
import { GameCard } from "@/data/cards";
import { SpecialPacks } from "@/components/SpecialPacks";
import { SeasonHub } from "@/components/SeasonHub";
import { useSeason } from "@/hooks/useSeason";

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
  const [drawnCard, setDrawnCard] = useState<GameCard | null>(null);
  const prevLevelRef = useRef(game.level);

  // Start background music on mount
  useEffect(() => {
    startBgm();
    return () => stopBgm();
  }, []);

  // Detect level-up
  useEffect(() => {
    if (game.level > prevLevelRef.current) {
      setLevelUpData(getLevelForXp(game.xp));
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
      if (result.monsterLevelUp) {
        const { name, level, coinBonus } = result.monsterLevelUp;
        toast(`🍖 ${name} evolved!`, {
          description: `Level ${level} reached! Now grants +${coinBonus}% coins on all tiles.`,
          duration: 4000,
        });
      }
    }
  };

  // Mini-game costs 1 roll to play
  const handlePlayMiniGame = (): boolean => {
    if (game.rolls < 1) return false;
    game.addRolls(-1);
    return true;
  };

  // Battle pass tier claim — applies the reward to game state
  const handleClaimTier = (tier: number, reward: import("@/data/seasons").SeasonReward) => {
    const r = reward.premium ?? reward.free;
    if (!r) return;
    if (r.type === "coins") game.addCoins(r.amount ?? 0);
    else if (r.type === "rolls") game.addRolls(r.amount ?? 0);
    else if (r.type === "symbols") season.addSymbols(r.amount ?? 0);
    else if (r.type === "card" && r.id) {
      game.grantCard(r.id);
      season.markCardUnlocked(r.id);
      const card = (await import("@/data/cards")).ALL_CARDS.find((c) => c.id === r.id);
      if (card) setDrawnCard(card);
    } else if (r.type === "monster" && r.id) game.grantMonster(r.id);
    else if (r.type === "dice" && r.id) game.grantDiceTier(r.id);
    season.claimTier(tier);
    toast.success(`Claimed: ${r.label}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-3 py-4 overflow-hidden">
      <LinkAccount open={showLink} onClose={() => setShowLink(false)} />
      <LevelUpCelebration level={levelUpData} onComplete={() => setLevelUpData(null)} />
      <PaymentTestModeBanner />
      <DailyReward
        open={daily.showModal}
        streak={daily.streak}
        reward={daily.reward}
        onClaim={daily.claim}
        onDismiss={daily.dismiss}
        alreadyClaimed={daily.alreadyClaimed}
      />

      {/* Top: level + coins + actions */}
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

      <GameTabs active={tab} onTabChange={setTab} />

      <CardReveal card={drawnCard} onComplete={() => setDrawnCard(null)} />

      <div className="w-full max-w-md flex-1 flex items-start justify-center py-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === "board" && (
            <motion.div
              key="board"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="w-full flex flex-col items-center gap-3"
            >
              <div className="panel-wood p-3 w-full" data-level={getLevelForXp(game.xp).id}>
                <GameBoard
                  position={game.position}
                  monster={game.activeMonsterData}
                  rolls={game.rolls}
                  lastResult={lastResult}
                  onRollDice={handleRollDice}
                  activeDiceMax={game.activeDiceTierData.maxRoll}
                  levelId={getLevelForXp(game.xp).id}
                />
              </div>
              <BetSelector
                coins={game.coins}
                currentBet={game.betMultiplier}
                onSetBet={game.setBetMultiplier}
              />
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
              className="w-full"
            >
              <DiceShop
                coins={game.coins}
                rolls={game.rolls}
                unlockedDiceTiers={game.unlockedDiceTiers}
                activeDiceTier={game.activeDiceTier}
                onBuyPack={game.buyDicePack}
                onUnlockTier={game.unlockDiceTier}
                onSelectTier={game.setActiveDiceTier}
              />
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
              <SpinWheel onWin={game.addCoins} />
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

        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
