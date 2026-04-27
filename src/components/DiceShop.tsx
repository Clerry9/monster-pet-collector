import { motion } from "framer-motion";
import { DICE_PACKS, DICE_TIERS } from "@/hooks/useGameState";
import { Lock, Check, Zap, CreditCard } from "lucide-react";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PrestigeRewardsPanel } from "@/components/PrestigeRewardsPanel";

const PACK_PRICE_IDS: Record<string, string> = {
  value: "value_pack_price",
  mega: "mega_pack_price",
  ultra: "ultra_pack_price",
};

const TIER_PRICE_IDS: Record<string, string> = {
  silver: "silver_dice_price",
  gold: "gold_dice_price",
};

interface DiceShopProps {
  coins: number;
  rolls: number;
  level: number;
  unlockedDiceTiers: string[];
  activeDiceTier: string;
  /** Set of in-flight server purchases — entries look like `pack:value` or `tier:silver`. */
  pendingPurchases?: Set<string>;
  onBuyPack: (packId: string) => boolean;
  onUnlockTier: (tierId: string) => boolean;
  onSelectTier: (tierId: string) => void;
}

export function DiceShop({
  coins,
  rolls,
  level,
  unlockedDiceTiers,
  activeDiceTier,
  pendingPurchases,
  onBuyPack,
  onUnlockTier,
  onSelectTier,
}: DiceShopProps) {
  const { openCheckout, loading } = usePaddleCheckout();
  const { user } = useAuth();

  const handleBuyWithMoney = async (priceId: string, packId: string, rollsCount: number) => {
    if (!user) {
      toast.error("Please log in to make purchases");
      return;
    }

    try {
      await openCheckout({
        priceId,
        customerEmail: user.email,
        customData: { userId: user.id, packId, rolls: String(rollsCount) },
      });
    } catch {
      toast.error("Failed to open checkout");
    }
  };

  const handleBuyTierWithMoney = async (tierId: string) => {
    const priceId = TIER_PRICE_IDS[tierId];
    if (!priceId || !user) {
      if (!user) toast.error("Please log in to make purchases");
      return;
    }

    try {
      await openCheckout({
        priceId,
        customerEmail: user.email,
        customData: { userId: user.id, packId: `${tierId}_dice` },
      });
    } catch {
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

      {/* Prestige rewards roadmap */}
      <PrestigeRewardsPanel level={level} />

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
            const hasPaddlePrice = !!TIER_PRICE_IDS[tier.id];
            const isPaid = tier.id === "silver" || tier.id === "gold";
            const pending = pendingPurchases?.has(`tier:${tier.id}`) ?? false;
            // Paid tiers must wait for server RPC confirmation before they're
            // selectable. The server is the source of truth for ownership.
            const interactable = unlocked
              ? true
              : isPaid
                ? canAfford && !pending
                : canAfford;

            return (
              <div key={tier.id} className="flex flex-col gap-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => unlocked ? onSelectTier(tier.id) : interactable ? onUnlockTier(tier.id) : undefined}
                  disabled={!interactable}
                  className={`relative rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    active
                      ? "border-primary bg-primary/10 box-glow-green"
                      : unlocked
                      ? "border-border bg-card"
                      : "border-border bg-card/50 opacity-70"
                  } ${!unlocked && !interactable ? "cursor-not-allowed opacity-50" : ""}`}
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
                        <span className="text-xs font-bold text-accent">
                          {pending ? "Verifying…" : `🪙 ${tier.costCoins}`}
                        </span>
                      </div>
                    </div>
                  )}
                  <span className="text-2xl">🎲</span>
                  <span className="text-xs font-bold font-body text-foreground">{tier.label}</span>
                  <span className="text-[10px] font-body text-primary">1-{tier.maxRoll}</span>
                </motion.button>
                {/* Real money buy button for locked tiers */}
                {!unlocked && hasPaddlePrice && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBuyTierWithMoney(tier.id)}
                    disabled={loading || pending}
                    className="rounded-lg bg-primary/20 text-primary hover:bg-primary/30 py-1 text-[10px] font-bold font-body flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <CreditCard size={10} />
                    ${(tier.costReal / 100).toFixed(2)}
                  </motion.button>
                )}
              </div>
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
            const pending = pendingPurchases?.has(`pack:${pack.id}`) ?? false;
            // Paid packs (anything with a real-money price) must wait on the
            // server RPC. Free starter packs (no paddle price) stay instant.
            const isPaid = pack.costReal > 0;
            const coinBuyable = canAfford && (!isPaid || !pending);
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

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => coinBuyable ? onBuyPack(pack.id) : undefined}
                  disabled={!coinBuyable}
                  className={`w-full rounded-lg py-1.5 text-xs font-bold font-body transition-all ${
                    coinBuyable
                      ? "bg-accent/20 text-accent hover:bg-accent/30 cursor-pointer"
                      : "bg-muted/50 text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {pending ? "Verifying…" : `🪙 ${pack.costCoins} coins`}
                </motion.button>

                {hasPaddlePrice && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBuyWithMoney(PACK_PRICE_IDS[pack.id], pack.id, pack.rolls)}
                    disabled={loading || pending}
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
