import { motion } from "framer-motion";
import { DICE_PACKS, DICE_TIERS, DicePack, DiceTier } from "@/hooks/useGameState";
import { Lock, Check, Zap } from "lucide-react";

interface DiceShopProps {
  coins: number;
  rolls: number;
  unlockedDiceTiers: string[];
  activeDiceTier: string;
  onBuyPack: (packId: string) => boolean;
  onUnlockTier: (tierId: string) => boolean;
  onSelectTier: (tierId: string) => void;
}

export function DiceShop({
  coins,
  rolls,
  unlockedDiceTiers,
  activeDiceTier,
  onBuyPack,
  onUnlockTier,
  onSelectTier,
}: DiceShopProps) {
  return (
    <div className="w-full space-y-6">
      {/* Current rolls */}
      <div className="flex items-center justify-center gap-2 rounded-xl bg-card border border-border px-4 py-3">
        <span className="text-2xl">🎲</span>
        <span className="font-body text-lg">
          You have <span className="font-extrabold text-primary">{rolls}</span> rolls
        </span>
      </div>

      {/* Dice Tiers */}
      <div>
        <h3 className="font-display text-xl text-foreground text-glow-purple mb-3">
          Dice Upgrades
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {DICE_TIERS.map((tier) => {
            const unlocked = unlockedDiceTiers.includes(tier.id);
            const active = tier.id === activeDiceTier;
            const canAfford = coins >= tier.costCoins;

            return (
              <motion.button
                key={tier.id}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => unlocked ? onSelectTier(tier.id) : canAfford ? onUnlockTier(tier.id) : undefined}
                className={`relative rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  active
                    ? "border-primary bg-primary/10 box-glow-green"
                    : unlocked
                    ? "border-border bg-card"
                    : "border-border bg-card/50 opacity-70"
                } ${!unlocked && !canAfford ? "cursor-not-allowed" : ""}`}
              >
                {active && (
                  <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1">
                    <Check size={12} className="text-primary-foreground" />
                  </div>
                )}
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 z-10">
                    <div className="flex flex-col items-center gap-1">
                      <Lock size={16} className="text-muted-foreground" />
                      <span className="text-xs font-bold text-accent">🪙 {tier.costCoins}</span>
                    </div>
                  </div>
                )}
                <span className="text-2xl">🎲</span>
                <span className="text-xs font-bold font-body text-foreground">{tier.label}</span>
                <span className="text-[10px] font-body text-primary">1-{tier.maxRoll}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Dice Packs */}
      <div>
        <h3 className="font-display text-xl text-foreground text-glow-green mb-3">
          Roll Packs
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {DICE_PACKS.map((pack) => {
            const canAfford = coins >= pack.costCoins;
            return (
              <motion.button
                key={pack.id}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => canAfford ? onBuyPack(pack.id) : undefined}
                disabled={!canAfford}
                className={`rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${
                  canAfford
                    ? "border-accent/40 bg-card hover:bg-accent/5 cursor-pointer"
                    : "border-border bg-card/50 opacity-50 cursor-not-allowed"
                }`}
              >
                <span className="text-3xl">{pack.emoji}</span>
                <span className="font-bold font-body text-sm text-foreground">{pack.label}</span>
                <div className="flex items-center gap-1 text-primary font-body">
                  <Zap size={14} />
                  <span className="font-extrabold">{pack.rolls} rolls</span>
                </div>
                <span className="text-xs font-bold text-accent">🪙 {pack.costCoins}</span>
                {pack.costReal > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    or ${(pack.costReal / 100).toFixed(2)}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
