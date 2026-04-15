import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift } from "lucide-react";
import { CoinCounter } from "@/components/CoinCounter";
import { GameBoard } from "@/components/GameBoard";
import { MonsterDisplay } from "@/components/MonsterDisplay";
import { MonsterCollection } from "@/components/MonsterCollection";
import { SpinWheel } from "@/components/SpinWheel";
import { DiceShop } from "@/components/DiceShop";
import { GameTabs } from "@/components/GameTabs";
import { DailyReward } from "@/components/DailyReward";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useGameState, BoardTile } from "@/hooks/useGameState";
import { useDailyReward } from "@/hooks/useDailyReward";

type Tab = "board" | "monster" | "collection" | "shop" | "spin";

const Index = () => {
  const game = useGameState();
  const daily = useDailyReward(game.addCoins);
  const [tab, setTab] = useState<Tab>("board");
  const [lastResult, setLastResult] = useState<{ steps: number; tile: BoardTile } | null>(null);

  const handleRollDice = () => {
    const result = game.rollDice();
    if (result) setLastResult(result);
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-6 overflow-hidden">
      <DailyReward
        open={daily.showModal}
        streak={daily.streak}
        reward={daily.reward}
        onClaim={daily.claim}
        onDismiss={daily.dismiss}
        alreadyClaimed={daily.alreadyClaimed}
      />

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-foreground text-glow-purple">
          Monster Mash
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={daily.openModal}
            className="rounded-full bg-card p-2 text-accent transition-transform hover:scale-110"
            title="Daily Reward"
          >
            <Gift size={18} />
          </button>
          <CoinCounter coins={game.coins} />
        </div>
      </div>

      {/* Stats bar */}
      <div className="w-full max-w-md flex items-center justify-center gap-4 mb-4 text-xs font-body text-muted-foreground">
        <span>🎲 {game.rolls} rolls</span>
        <span>👣 {game.totalSteps} steps</span>
        <span>🃏 {game.cardsCollected} cards</span>
      </div>

      {/* Tabs */}
      <GameTabs active={tab} onTabChange={setTab} />

      {/* Content */}
      <div className="w-full max-w-md flex-1 flex items-start justify-center py-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === "board" && (
            <motion.div
              key="board"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="w-full flex flex-col items-center"
            >
              <GameBoard
                position={game.position}
                monster={game.activeMonsterData}
                rolls={game.rolls}
                lastResult={lastResult}
                onRollDice={handleRollDice}
                activeDiceMax={game.activeDiceTierData.maxRoll}
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
                taps={game.activeMonsterTaps}
                onTap={game.tapMonster}
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
                onAddRolls={game.addRolls}
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
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
