import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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

// Canonical list of public Paddle external_ids surfaced on this page. Must be
// kept in sync with PUBLIC_PRICE_IDS in supabase/functions/list-pricing/index.ts.
const EXPECTED_EXTERNAL_IDS = [
  "value_pack_price",
  "mega_pack_price",
  "ultra_pack_price",
  "silver_dice_price",
  "gold_dice_price",
  "star_pack_price",
  "season_pass_one_time",
  "special_starter_price",
  "special_card_price",
  "special_monster_price",
  "special_vip_price",
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
  { externalId: "season_pass_one_time", name: "Season Pass", description: "Unlock premium season rewards track", priceFormatted: "$9.99", amountCents: 999, currency: "USD" },
  { externalId: "special_starter_price", name: "Special Starter", description: "Limited starter offer for new players", priceFormatted: "$2.99", amountCents: 299, currency: "USD" },
  { externalId: "special_card_price", name: "Special Card Pack", description: "Curated card pack with rare drops", priceFormatted: "$6.99", amountCents: 699, currency: "USD" },
  { externalId: "special_monster_price", name: "Special Monster Pack", description: "Exclusive monster bundle", priceFormatted: "$12.99", amountCents: 1299, currency: "USD" },
  { externalId: "special_vip_price", name: "VIP Bundle", description: "Top-tier bundle with all premium perks", priceFormatted: "$29.99", amountCents: 2999, currency: "USD" },
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
                  <h2 className="text-lg font-semibold truncate">{t.name}</h2>
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
