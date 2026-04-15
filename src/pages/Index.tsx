import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift } from "lucide-react";
import { CoinCounter } from "@/components/CoinCounter";
import { MonsterDisplay } from "@/components/MonsterDisplay";
import { MonsterCollection } from "@/components/MonsterCollection";
import { SpinWheel } from "@/components/SpinWheel";
import { GameTabs } from "@/components/GameTabs";
import { DailyReward } from "@/components/DailyReward";
import { useGameState } from "@/hooks/useGameState";
import { useDailyReward } from "@/hooks/useDailyReward";

type Tab = "monster" | "collection" | "spin";

const Index = () => {
  const game = useGameState();
  const daily = useDailyReward(game.addCoins);
  const [tab, setTab] = useState<Tab>("monster");

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
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-foreground text-glow-purple">
          Monster Mash
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={daily.openModal}
            className="rounded-full bg-card p-2 text-accent transition-transform hover:scale-110"
            title="Daily Reward"
          >
            <Gift size={20} />
          </button>
          <CoinCounter coins={game.coins} />
        </div>
      </div>

      {/* Tabs */}
      <GameTabs active={tab} onTabChange={setTab} />

      {/* Content */}
      <div className="w-full max-w-md flex-1 flex items-center justify-center py-8">
        <AnimatePresence mode="wait">
          {tab === "monster" && (
            <motion.div
              key="monster"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="flex flex-col items-center"
            >
              <MonsterDisplay monster={game.activeMonsterData} onTap={game.tap} />
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
