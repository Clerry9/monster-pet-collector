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

const Pricing = () => {
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const environment = clientToken?.startsWith("test_") ? "sandbox" : "live";
    supabase.functions
      .invoke("list-pricing", { body: { environment } })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          setTiers([]);
          return;
        }
        setTiers(data?.tiers ?? []);
      })
      .catch((e) => {
        setError(e?.message ?? "Failed to load pricing");
        setTiers([]);
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

        {tiers !== null && tiers.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
            Pricing is being prepared. Please check back shortly.
            {error && <div className="mt-2 text-xs opacity-70">{error}</div>}
          </div>
        )}

        {tiers && tiers.length > 0 && (
          <div className="space-y-3">
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
            Payments are processed securely by Paddle, our Merchant of Record. One-time purchases only — no subscriptions or auto-renewals. See our{" "}
            <Link to="/refund" className="text-primary underline">Refund Policy</Link> and{" "}
            <Link to="/terms" className="text-primary underline">Terms of Service</Link>.
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
