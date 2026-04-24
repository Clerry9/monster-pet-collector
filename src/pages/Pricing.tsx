import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

interface Tier {
  externalId: string;
  name: string;
  description: string;
  priceFormatted: string;
  amountCents: number;
  currency: string;
}

// Static fallback pricing shown when the live pricing API is unavailable
// (e.g., during Paddle domain review before the function is fully configured).
// Keep amounts in sync with the Paddle catalog.
const FALLBACK_TIERS: Tier[] = [
  { externalId: "value_pack_price", name: "Value Pack", description: "Starter bundle of coins and dice", priceFormatted: "$4.99", amountCents: 499, currency: "USD" },
  { externalId: "mega_pack_price", name: "Mega Pack", description: "Larger coin and dice bundle", priceFormatted: "$9.99", amountCents: 999, currency: "USD" },
  { externalId: "ultra_pack_price", name: "Ultra Pack", description: "Premium coin and dice bundle", priceFormatted: "$19.99", amountCents: 1999, currency: "USD" },
  { externalId: "silver_dice_price", name: "Silver Dice", description: "Refill your dice with silver tier", priceFormatted: "$2.99", amountCents: 299, currency: "USD" },
  { externalId: "gold_dice_price", name: "Gold Dice", description: "Refill your dice with gold tier", priceFormatted: "$7.99", amountCents: 799, currency: "USD" },
  { externalId: "star_pack_price", name: "Star Pack", description: "Bonus stars for season progression", priceFormatted: "$4.99", amountCents: 499, currency: "USD" },
  { externalId: "season_pass_price", name: "Season Pass", description: "Unlock premium season rewards track", priceFormatted: "$9.99", amountCents: 999, currency: "USD" },
  { externalId: "special_starter_price", name: "Special Starter", description: "Limited starter offer for new players", priceFormatted: "$2.99", amountCents: 299, currency: "USD" },
  { externalId: "special_card_price", name: "Special Card Pack", description: "Curated card pack with rare drops", priceFormatted: "$6.99", amountCents: 699, currency: "USD" },
  { externalId: "special_monster_price", name: "Special Monster Pack", description: "Exclusive monster bundle", priceFormatted: "$12.99", amountCents: 1299, currency: "USD" },
  { externalId: "special_vip_price", name: "VIP Bundle", description: "Top-tier bundle with all premium perks", priceFormatted: "$29.99", amountCents: 2999, currency: "USD" },
];

const Pricing = () => {
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    const environment = clientToken?.startsWith("test_") ? "sandbox" : "live";
    supabase.functions
      .invoke("list-pricing", { body: { environment } })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          setTiers(FALLBACK_TIERS);
          setUsingFallback(true);
          return;
        }
        const live = data?.tiers ?? [];
        if (live.length === 0) {
          setTiers(FALLBACK_TIERS);
          setUsingFallback(true);
        } else {
          setTiers(live);
        }
      })
      .catch((e) => {
        setError(e?.message ?? "Failed to load pricing");
        setTiers(FALLBACK_TIERS);
        setUsingFallback(true);
      });
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-10">
      <article className="mx-auto max-w-3xl space-y-6">
        <Link to="/" className="text-sm text-primary underline">← Back to game</Link>
        <h1 className="font-display text-4xl text-primary">Pricing</h1>
        <p className="text-muted-foreground">
          All prices reflect the live amounts charged at checkout. Local currency, taxes, and VAT are calculated at checkout based on your location. The game is free to play; purchases are optional.
        </p>

        {tiers === null && (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
            Loading live pricing…
          </div>
        )}

        {tiers && tiers.length > 0 && (
          <div className="space-y-3">
            {usingFallback && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Showing reference pricing in USD. Final prices, currency, and taxes are calculated at checkout based on your location.
              </div>
            )}
            {tiers.map((t) => (
              <div key={t.externalId} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">{t.name}</h2>
                  {t.description && (
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  )}
                </div>
                <div className="font-display text-2xl text-primary whitespace-nowrap">{t.priceFormatted}</div>
              </div>
            ))}
          </div>
        )}

        <section className="space-y-3 pt-4">
          <h2 className="text-2xl font-semibold">Payment & Billing</h2>
          <p>
            Payments are processed securely by <strong>Paddle.com</strong>, the Merchant of Record for all orders placed with JAC Consulting. Paddle handles checkout, billing, tax, invoicing, and refund decisions. One-time purchases only — no subscriptions or auto-renewals. See our{" "}
            <Link to="/refund" className="text-primary underline">Refund Policy</Link> and{" "}
            <Link to="/terms" className="text-primary underline">Terms of Service</Link>. For billing questions, contact{" "}
            <a className="text-primary underline" href="mailto:MPetCinfo@proton.me">MPetCinfo@proton.me</a>.
          </p>
        </section>

        <p className="text-xs text-muted-foreground">
          Prices are fetched live from our payment provider and may change. The Shop tab inside the game always reflects current live pricing.
        </p>
      </article>
      <Footer />
    </main>
  );
};

export default Pricing;
