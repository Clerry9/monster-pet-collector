import { motion } from "framer-motion";
import { DICE_PACKS, DICE_TIERS } from "@/hooks/useGameState";
import { Lock, Check, Zap, CreditCard } from "lucide-react";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { toast } from "sonner";

// Map pack IDs to Paddle price IDs
const PACK_PRICE_IDS: Record<string, string> = {
  value: "value_pack_price",
  mega: "mega_pack_price",
  ultra: "ultra_pack_price",
};

interface DiceShopProps {
  coins: number;
  rolls: number;
  unlockedDiceTiers: string[];
  activeDiceTier: string;
  onBuyPack: (packId: string) => boolean;
  onUnlockTier: (tierId: string) => boolean;
  onSelectTier: (tierId: string) => void;
  onAddRolls: (amount: number) => void;
}

export function DiceShop({
  coins,
  rolls,
  unlockedDiceTiers,
  activeDiceTier,
  onBuyPack,
  onUnlockTier,
  onSelectTier,
  onAddRolls,
}: DiceShopProps) {
  const { openCheckout, loading } = usePaddleCheckout();

  const handleBuyWithMoney = async (packId: string, packRolls: number) => {
    const priceId = PACK_PRICE_IDS[packId];
    if (!priceId) return;

    try {
      await openCheckout({
        priceId,
        customData: { packId, rolls: String(packRolls) },
        successUrl: `${window.location.origin}/?checkout=success&pack=${packId}&rolls=${packRolls}`,
      });
    } catch (err) {
      toast.error("Failed to open checkout");
    }
  };

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
            const hasPaddlePrice = !!PACK_PRICE_IDS[pack.id];
            return (
              <div
                key={pack.id}
                className="rounded-xl border-2 border-accent/40 bg-card p-4 flex flex-col items-center gap-2"
              >
                <span className="text-3xl">{pack.emoji}</span>
                <span className="font-bold font-body text-sm text-foreground">{pack.label}</span>
                <div className="flex items-center gap-1 text-primary font-body">
                  <Zap size={14} />
                  <span className="font-extrabold">{pack.rolls} rolls</span>
                </div>

                {/* Buy with coins */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => canAfford ? onBuyPack(pack.id) : undefined}
                  disabled={!canAfford}
                  className={`w-full rounded-lg py-1.5 text-xs font-bold font-body transition-all ${
                    canAfford
                      ? "bg-accent/20 text-accent hover:bg-accent/30 cursor-pointer"
                      : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  🪙 {pack.costCoins} coins
                </motion.button>

                {/* Buy with real money */}
                {hasPaddlePrice && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBuyWithMoney(pack.id, pack.rolls)}
                    disabled={loading}
                    className="w-full rounded-lg bg-primary/20 text-primary hover:bg-primary/30 py-1.5 text-xs font-bold font-body flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <CreditCard size={12} />
                    ${(pack.costReal / 100).toFixed(2)}
                  </motion.button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
