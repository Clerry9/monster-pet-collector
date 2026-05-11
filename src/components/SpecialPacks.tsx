import { motion } from "framer-motion";
import { CreditCard, Sparkles, Layers } from "lucide-react";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SpecialPack {
  id: string;
  priceId: string;
  emoji: string;
  name: string;
  tagline: string;
  perks: string[];
  costCents: number;
  highlight?: "best" | "popular" | "new";
  /** Number of cards granted by this pack. Clamped to MAX_CARDS_PER_PACK. */
  cards?: number;
}

/** Hard ceiling: no Special Pack may grant more than this many cards. */
export const MAX_CARDS_PER_PACK = 8;

const SPECIAL_PACKS: SpecialPack[] = [
  {
    id: "starter",
    priceId: "special_starter_price",
    emoji: "🎁",
    name: "Starter Bundle",
    tagline: "Kickstart your journey",
    perks: ["+30 Rolls", "+500 Coins"],
    cards: 1,
    costCents: 199,
    highlight: "new",
  },
  {
    id: "card",
    priceId: "special_card_price",
    emoji: "🃏",
    name: "Card Collector",
    tagline: "Boosted card chances",
    perks: ["+50 Rolls", "+1,000 Coins"],
    cards: 3,
    costCents: 499,
    highlight: "popular",
  },
  {
    id: "monster",
    priceId: "special_monster_price",
    emoji: "👾",
    name: "Monster Master",
    tagline: "Power up your team",
    perks: ["+150 Rolls", "+3,000 Coins", "Gold Dice unlock"],
    costCents: 999,
  },
  {
    id: "vip",
    priceId: "special_vip_price",
    emoji: "👑",
    name: "VIP Mega Bundle",
    tagline: "Everything, everywhere",
    perks: ["+500 Rolls", "+10,000 Coins", "Gold Dice + 2 Monsters"],
    cards: 8,
    costCents: 2999,
    highlight: "best",
  },
];

const HIGHLIGHT_STYLES: Record<NonNullable<SpecialPack["highlight"]>, { label: string; cls: string }> = {
  new: { label: "NEW", cls: "bg-energy-pink text-cream-light" },
  popular: { label: "POPULAR", cls: "bg-candy-red text-cream-light" },
  best: { label: "BEST VALUE", cls: "bg-wood-dark text-gold" },
};

export function SpecialPacks() {
  const { openCheckout, loading } = usePaddleCheckout();
  const { user } = useAuth();

  const handleBuy = async (pack: SpecialPack) => {
    if (!user) {
      toast.error("Please log in to make purchases");
      return;
    }
    // Lightweight analytics — logged to the browser console and surfaced in
    // any analytics relay listening to console events. Records the clamped
    // card count we expect the server to grant.
    const clampedCards = Math.min(pack.cards ?? 0, MAX_CARDS_PER_PACK);
    console.info("[analytics] special_pack_purchase_initiated", {
      packId: `special_${pack.id}`,
      priceId: pack.priceId,
      costCents: pack.costCents,
      cards: clampedCards,
      userId: user.id,
    });
    try {
      await openCheckout({
        priceId: pack.priceId,
        customerEmail: user.email,
        customData: { userId: user.id, packId: `special_${pack.id}` },
      });
    } catch {
      toast.error("Failed to open checkout");
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="banner-gold inline-flex mx-auto px-5 py-1.5 self-center">
        <h2 className="font-display text-xl tracking-wide flex items-center gap-2">
          <Sparkles size={18} /> SPECIAL PACKAGES <Sparkles size={18} />
        </h2>
      </div>

      <p className="text-center text-xs font-display text-wood-dark/70">
        Limited-time bundles — best value on rolls, coins & unlocks
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SPECIAL_PACKS.map((pack) => {
          const highlight = pack.highlight ? HIGHLIGHT_STYLES[pack.highlight] : null;
          return (
            <motion.div
              key={pack.id}
              whileHover={{ y: -3 }}
              className="relative panel-wood p-3 flex flex-col items-center gap-2"
            >
              {highlight && (
                <span className={`absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-display border-2 border-wood-dark shadow-chunky-sm ${highlight.cls}`}>
                  {highlight.label}
                </span>
              )}

              <div className="pill-gold w-16 h-16 rounded-full flex items-center justify-center text-3xl">
                <span aria-hidden>{pack.emoji}</span>
              </div>

              <div className="text-center">
                <h3 className="font-display text-base text-cream-light tracking-wide leading-tight">
                  {pack.name}
                </h3>
                <p className="text-[10px] font-display text-cream/80 leading-tight">{pack.tagline}</p>
              </div>

              <ul className="w-full bg-cream/95 rounded-xl border-2 border-wood-dark px-2 py-1.5 space-y-0.5">
                {(() => {
                  const clampedCards = Math.min(pack.cards ?? 0, MAX_CARDS_PER_PACK);
                  if (clampedCards <= 0) return null;
                  return (
                    <li className="text-[11px] font-body font-bold text-wood-dark flex items-center gap-1.5">
                      <Layers className="text-candy-red shrink-0" size={12} aria-hidden />
                      +{clampedCards} Card{clampedCards === 1 ? "" : "s"}
                    </li>
                  );
                })()}
                {pack.perks.map((perk) => (
                  <li key={perk} className="text-[11px] font-body font-bold text-wood-dark flex items-center gap-1.5">
                    <span className="text-candy-red" aria-hidden>✦</span> {perk}
                  </li>
                ))}
              </ul>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleBuy(pack)}
                disabled={loading}
                className="btn-press w-full py-2 rounded-full font-display text-base flex items-center justify-center gap-1.5 disabled:opacity-60"
                aria-label={`Buy ${pack.name} for $${(pack.costCents / 100).toFixed(2)}`}
              >
                <CreditCard size={14} />
                ${(pack.costCents / 100).toFixed(2)}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-[10px] font-body text-wood-dark/60">
        Purchases process securely. Rolls & coins are credited after payment confirms.
      </p>
    </div>
  );
}
