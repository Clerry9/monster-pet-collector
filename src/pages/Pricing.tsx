import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Helmet } from "react-helmet-async";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

interface Tier {
  externalId: string;
  name: string;
  description: string;
  priceFormatted: string;
  amountCents: number;
  currency: string;
}

// Canonical list of public Paddle external_ids surfaced on this page. Must be
// kept in sync with PUBLIC_PRICE_IDS in supabase/functions/list-pricing/index.ts.
const EXPECTED_EXTERNAL_IDS = [
  "value_pack_price",
  "mega_pack_price",
  "ultra_pack_price",
  "silver_dice_price",
  "gold_dice_price",
  "star_pack_price",
  "season_pass_t1_price",
  "season_pass_t2_price",
  "season_pass_t3_price",
  "season_pass_t4_price",
  "season_pass_t5_price",
  "special_starter_price",
  "special_card_price",
  "special_monster_price",
  "special_vip_price",
  "collector_club_monthly",
  "monster_elite_monthly",
] as const;

// Static fallback pricing shown when the live pricing API is unavailable
// (e.g., during Paddle domain review before the function is fully configured).
// Amounts are USD reference prices — checkout always shows the localized
// price from Paddle.
const FALLBACK_TIERS: Tier[] = [
  { externalId: "value_pack_price", name: "Value Pack", description: "Starter bundle of coins and dice", priceFormatted: "$4.99", amountCents: 499, currency: "USD" },
  { externalId: "mega_pack_price", name: "Mega Pack", description: "Larger coin and dice bundle", priceFormatted: "$9.99", amountCents: 999, currency: "USD" },
  { externalId: "ultra_pack_price", name: "Ultra Pack", description: "Premium coin and dice bundle", priceFormatted: "$19.99", amountCents: 1999, currency: "USD" },
  { externalId: "silver_dice_price", name: "Silver Dice", description: "Refill your dice with silver tier", priceFormatted: "$2.99", amountCents: 299, currency: "USD" },
  { externalId: "gold_dice_price", name: "Gold Dice", description: "Refill your dice with gold tier", priceFormatted: "$7.99", amountCents: 799, currency: "USD" },
  { externalId: "star_pack_price", name: "Star Pack", description: "Bonus stars for season progression", priceFormatted: "$4.99", amountCents: 499, currency: "USD" },
  { externalId: "season_pass_t1_price", name: "Season Pass (Tier 1)", description: "Levels 1-19", priceFormatted: "$9.99", amountCents: 999, currency: "USD" },
  { externalId: "season_pass_t2_price", name: "Season Pass (Tier 2)", description: "Levels 20-39", priceFormatted: "$12.99", amountCents: 1299, currency: "USD" },
  { externalId: "season_pass_t3_price", name: "Season Pass (Tier 3)", description: "Levels 40-59", priceFormatted: "$15.99", amountCents: 1599, currency: "USD" },
  { externalId: "season_pass_t4_price", name: "Season Pass (Tier 4)", description: "Levels 60-79", priceFormatted: "$18.99", amountCents: 1899, currency: "USD" },
  { externalId: "season_pass_t5_price", name: "Season Pass (Tier 5)", description: "Levels 80+", priceFormatted: "$21.99", amountCents: 2199, currency: "USD" },
  { externalId: "special_starter_price", name: "Special Starter", description: "Limited starter offer for new players", priceFormatted: "$2.99", amountCents: 299, currency: "USD" },
  { externalId: "special_card_price", name: "Special Card Pack", description: "Curated card pack with rare drops", priceFormatted: "$6.99", amountCents: 699, currency: "USD" },
  { externalId: "special_monster_price", name: "Special Monster Pack", description: "Exclusive monster bundle", priceFormatted: "$12.99", amountCents: 1299, currency: "USD" },
  { externalId: "special_vip_price", name: "VIP Bundle", description: "Top-tier bundle with all premium perks", priceFormatted: "$29.99", amountCents: 2999, currency: "USD" },
  { externalId: "collector_club_monthly", name: "Collector Club (monthly)", description: "Monthly membership: rolls, coins, and a card flip every renewal", priceFormatted: "$4.99/mo", amountCents: 499, currency: "USD" },
  { externalId: "monster_elite_monthly", name: "Monster Elite (monthly)", description: "Top monthly tier: big rolls, coins, stars, gold dice, and exclusive monsters", priceFormatted: "$14.99/mo", amountCents: 1499, currency: "USD" },
];

// Dev-time validation: warn if the fallback list drifts from the expected
// public Paddle external_ids. Helps Paddle reviewers and avoids silent gaps.
(function validateFallbackTiers() {
  const fallbackIds = new Set(FALLBACK_TIERS.map((t) => t.externalId));
  const missing = EXPECTED_EXTERNAL_IDS.filter((id) => !fallbackIds.has(id));
  const extra = FALLBACK_TIERS.map((t) => t.externalId).filter(
    (id) => !(EXPECTED_EXTERNAL_IDS as readonly string[]).includes(id),
  );
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn("[Pricing] Fallback tiers missing expected externalIds:", missing);
  }
  if (extra.length > 0) {
    // eslint-disable-next-line no-console
    console.warn("[Pricing] Fallback tiers contain unknown externalIds:", extra);
  }
})();

const FALLBACK_TIMEOUT_MS = 3000;

// External IDs treated as recurring subscriptions for badge rendering.
const SUBSCRIPTION_PRICE_IDS = new Set<string>([
  "collector_club_monthly",
  "monster_elite_monthly",
]);

function PricingSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

const Pricing = () => {
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const settledRef = useRef(false);

  const settleWithFallback = (reason: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (reason) {
      // eslint-disable-next-line no-console
      console.warn("[Pricing] Falling back to static tiers:", reason);
    }
    setTiers(FALLBACK_TIERS);
    setUsingFallback(true);
  };

  const settleWithLive = (live: Tier[]) => {
    if (settledRef.current) return;
    settledRef.current = true;
    // Cross-check live data against expected IDs and warn on gaps.
    const liveIds = new Set(live.map((t) => t.externalId));
    const missing = EXPECTED_EXTERNAL_IDS.filter((id) => !liveIds.has(id));
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.warn("[Pricing] Live pricing missing externalIds, backfilling from fallback:", missing);
    }
    // Backfill any missing tiers from the static list so the UI is never empty/partial.
    const merged = [...live];
    for (const id of missing) {
      const fb = FALLBACK_TIERS.find((t) => t.externalId === id);
      if (fb) merged.push(fb);
    }
    setTiers(merged);
    setUsingFallback(false);
  };

  useEffect(() => {
    const environment = clientToken?.startsWith("test_") ? "sandbox" : "live";

    const timeoutId = window.setTimeout(() => {
      settleWithFallback(`list-pricing did not respond within ${FALLBACK_TIMEOUT_MS}ms`);
    }, FALLBACK_TIMEOUT_MS);

    supabase.functions
      .invoke("list-pricing", { body: { environment } })
      .then(({ data, error }) => {
        window.clearTimeout(timeoutId);
        if (settledRef.current) return;
        if (error) {
          setError(error.message);
          settleWithFallback(`list-pricing error: ${error.message}`);
          return;
        }
        const live = data?.tiers ?? [];
        if (live.length === 0) {
          settleWithFallback("list-pricing returned 0 tiers");
        } else {
          settleWithLive(live as Tier[]);
        }
      })
      .catch((e) => {
        window.clearTimeout(timeoutId);
        setError(e?.message ?? "Failed to load pricing");
        settleWithFallback(`list-pricing threw: ${e?.message ?? "unknown"}`);
      });

    return () => window.clearTimeout(timeoutId);
  }, []);

  // Currency shown in the fallback notice — defaults to USD since fallback
  // amounts are USD reference prices.
  const fallbackCurrency = "USD";

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-10">
      <SEO
        title="Pricing — Monster Pet Collector coin & dice packs"
        description="Coin packs, dice tier upgrades, season passes, and monthly subscriptions for Monster Pet Collector. Secure checkout via Paddle."
        path="/pricing"
      />
      {tiers && tiers.length > 0 && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@graph": tiers.map((t) => ({
                "@type": "Product",
                name: t.name,
                description: t.description,
                brand: { "@type": "Brand", name: "Monster Pet Collector" },
                offers: {
                  "@type": "Offer",
                  price: (t.amountCents / 100).toFixed(2),
                  priceCurrency: t.currency,
                  availability: "https://schema.org/InStock",
                  url: "https://monsterpetcol.com/pricing",
                },
              })),
            })}
          </script>
        </Helmet>
      )}
      <article className="mx-auto max-w-3xl space-y-6">
        <Link to="/" className="text-sm text-primary underline">← Back to game</Link>
        <h1 className="font-display text-4xl text-primary">Pricing</h1>
        <p className="text-muted-foreground">
          All prices reflect the live amounts charged at checkout. Local currency, taxes, and VAT are calculated at checkout based on your location. The game is free to play; purchases are optional.
        </p>

        {tiers === null && <PricingSkeleton />}

        {tiers && tiers.length > 0 && (
          <div className="space-y-3">
            {usingFallback && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Showing reference pricing in <strong>{fallbackCurrency}</strong>. Final prices, currency, and taxes are calculated at checkout based on your location.
                {error && <div className="mt-1 opacity-70">Live pricing unavailable: {error}</div>}
              </div>
            )}
            {tiers.map((t) => (
              <div key={t.externalId} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate flex items-center gap-2">
                    <span className="truncate">{t.name}</span>
                    {SUBSCRIPTION_PRICE_IDS.has(t.externalId) && (
                      <span className="shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-display uppercase tracking-wider px-2 py-0.5 border border-primary/30">
                        Subscription
                      </span>
                    )}
                  </h2>
                  {t.description && (
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  )}
                </div>
                <div className="font-display text-2xl text-primary whitespace-nowrap">
                  {t.priceFormatted}
                  {usingFallback && (
                    <span className="ml-1 align-middle text-[10px] font-body uppercase tracking-wide text-muted-foreground">
                      {t.currency}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <section className="space-y-3 pt-4">
          <h2 className="text-2xl font-semibold">Payment & Billing</h2>
          <p>
            Payments are processed securely by <strong>Paddle.com</strong>, the Merchant of Record for all orders placed with JAC Consulting. Paddle handles checkout, billing, tax, invoicing, and refund decisions. Most items are one-time purchases. <strong>Collector Club</strong> and <strong>Monster Elite</strong> are monthly subscriptions that auto-renew until you cancel — you can cancel anytime from the in-game <em>My Account</em> screen and keep access through the end of the paid period. See our{" "}
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
