import { useState } from "react";
import { motion } from "framer-motion";
import { POWER_UPS, BOOST_BUNDLES, type PowerUpKind } from "@/data/powerUps";
import { usePowerUps } from "@/hooks/usePowerUps";
import { createCheckoutSession } from "@/lib/stripe";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const KIND_LABEL: Record<PowerUpKind, string> = {
  arena: "Arena Boosts",
  pvp: "PvP Boosts",
  board: "Board Boosts",
};

export function PowerUpShop() {
  const { user } = useAuth();
  const { qty, buy, loading } = usePowerUps();
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);

  const openBundleCheckout = async (priceId: string) => {
    if (!user) { toast.error("Sign in to purchase"); return; }
    try {
      setCheckoutPriceId(priceId);
      const { url } = await createCheckoutSession({
        priceId,
        customerEmail: user.email ?? undefined,
        customData: { packId: priceId },
      });
      window.location.href = url;
    } catch (e) {
      toast.error((e as Error).message || "Checkout failed");
      setCheckoutPriceId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-money bundles */}
      <section>
        <h3 className="font-display text-cream-light text-sm mb-2 tracking-wide">💎 Best Value Bundles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BOOST_BUNDLES.map((b) => (
            <motion.div
              key={b.priceId}
              whileHover={{ scale: 1.02 }}
              className="panel-wood border-2 border-gold rounded-lg p-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{b.emoji}</span>
                <div className="flex-1">
                  <div className="font-display text-cream-light text-sm">{b.name}</div>
                  <div className="text-[10px] text-cream/70">{b.description}</div>
                </div>
                <div className="font-display text-gold text-lg">{b.price}</div>
              </div>
              <button
                onClick={() => openBundleCheckout(b.priceId)}
                disabled={checkoutPriceId === b.priceId}
                className="btn-press w-full px-3 py-1.5 rounded-full font-display text-xs bg-gold text-wood-dark disabled:opacity-50"
              >
                {checkoutPriceId === b.priceId ? "Opening…" : "Buy with Card"}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Individual coin purchases */}
      {(["arena", "pvp", "board"] as PowerUpKind[]).map((kind) => (
        <section key={kind}>
          <h3 className="font-display text-cream-light text-sm mb-2 tracking-wide">{KIND_LABEL[kind]}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {POWER_UPS.filter((p) => p.kind === kind).map((p) => (
              <div key={p.id} className="panel-wood rounded-lg p-2.5 flex items-center gap-2.5">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="font-display text-cream-light text-xs truncate">{p.name}</div>
                    {p.preview && (
                      <span className="text-[8px] bg-wood-dark text-gold px-1 rounded">SOON</span>
                    )}
                    <span className="text-[10px] text-cream/60 ml-auto">×{qty(p.id)}</span>
                  </div>
                  <div className="text-[10px] text-cream/70 leading-tight">{p.description}</div>
                </div>
                <button
                  onClick={() => buy(p.id, 1)}
                  disabled={loading}
                  className="btn-press shrink-0 px-2 py-1 rounded-full font-display text-[10px] bg-gold text-wood-dark disabled:opacity-50"
                  title={`Buy 1 for ${p.coinPrice} coins`}
                >
                  🪙 {p.coinPrice}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}