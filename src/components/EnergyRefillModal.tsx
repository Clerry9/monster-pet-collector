import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ENERGY_PACKS, AD_REFILL_AMOUNT, type EnergyPack } from "@/data/energyPacks";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useRewardedAd } from "@/hooks/useRewardedAd";
import { Zap, Play, Coins } from "lucide-react";
import { toast } from "sonner";

interface EnergyRefillModalProps {
  open: boolean;
  onClose: () => void;
  energy: number;
  energyCap: number;
  playerLevel: number;
  customerEmail?: string;
  /** Callback to credit energy from the rewarded-ad path. */
  onAdRewardEnergy: (amount: number) => void;
}

/**
 * Shown when the player runs out of energy. Offers paid refill packs (Paddle)
 * or a free rewarded-ad top-up.
 */
export function EnergyRefillModal({
  open, onClose, energy, energyCap, playerLevel, customerEmail, onAdRewardEnergy,
}: EnergyRefillModalProps) {
  const { openCheckout, loading } = usePaddleCheckout();
  const ad = useRewardedAd(playerLevel, () => {
    onAdRewardEnergy(AD_REFILL_AMOUNT);
    toast.success(`+${AD_REFILL_AMOUNT}⚡ from ad!`);
  });

  const buy = async (pack: EnergyPack) => {
    try {
      await openCheckout({
        priceId: pack.paddlePriceId,
        customerEmail,
        customData: { sku: pack.id, energy: String(pack.energy) },
      });
    } catch (e) {
      console.error(e);
      toast.error("Checkout unavailable", { description: "Try again or use the free ad refill." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md" data-testid="energy-refill-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-extrabold tracking-wide">
            <Zap className="h-6 w-6 text-yellow-500" /> NOT ENOUGH ENERGY
          </DialogTitle>
          <DialogDescription className="text-base">
            You have <b>{energy}/{energyCap}</b>⚡. Watch a quick ad for free energy, or grab a refill pack.
          </DialogDescription>
        </DialogHeader>

        {/* Free ad refill — featured on top for the "watch an ad" flow */}
        <div className="rounded-md border-2 border-primary/50 bg-primary/5 p-3 text-sm">
          <div className="font-bold mb-1 flex items-center gap-2 text-base">
            <Play className="h-4 w-4 text-primary" /> Free: Watch an ad for +{AD_REFILL_AMOUNT}⚡
          </div>
          <div className="text-muted-foreground mb-2">
            {ad.dailyLeft > 0 ? `${ad.dailyLeft} free top-ups left today.` : "Daily limit reached — try a pack below."}
          </div>
          <Button
            size="default"
            autoFocus
            className="w-full font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:ring-2 focus-visible:ring-primary"
            disabled={!ad.canWatch}
            onClick={() => { void ad.watch(); }}
            aria-label={ad.dailyLeft > 0 ? `Watch a short ad for ${AD_REFILL_AMOUNT} energy` : "Daily ad limit reached"}
          >
            {ad.loading ? "Loading ad…" :
              ad.cooldownLeft > 0 ? `Wait ${Math.ceil(ad.cooldownLeft/1000)}s` :
              ad.dailyLeft === 0 ? "Come back tomorrow" :
              `Watch ad → +${AD_REFILL_AMOUNT}⚡`}
          </Button>
        </div>

        <div className="space-y-2">
          {ENERGY_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`flex items-center justify-between rounded-md border p-3 ${
                pack.highlight ? "border-primary bg-primary/5" : "border-border"
              }`}
              data-testid={`pack-${pack.id}`}
            >
              <div>
                <div className="font-bold">{pack.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> +{pack.energy}</span>
                  {pack.bonusCoins ? (
                    <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> +{pack.bonusCoins}</span>
                  ) : null}
                </div>
              </div>
              <Button
                size="sm"
                disabled={loading}
                onClick={() => buy(pack)}
              >
                ${pack.priceUsd.toFixed(2)}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}