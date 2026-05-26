import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

// External (human-readable) price IDs that should appear on the public Pricing page,
// in the order they should be displayed.
const PUBLIC_PRICE_IDS = [
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
];

function formatAmount(amountCents: number, currency: string): string {
  const value = amountCents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let envParam = url.searchParams.get("environment");
    if (!envParam) {
      try {
        const body = await req.json();
        envParam = body?.environment ?? null;
      } catch { /* no body */ }
    }
    const environment: StripeEnv = envParam === "live" ? "live" : "sandbox";
    const stripe = createStripeClient(environment);

    type Tier = {
      externalId: string;
      name: string;
      description: string;
      priceFormatted: string;
      amountCents: number;
      currency: string;
    };

    // Fetch all prices by lookup_key in one shot (max 10 per call → batch).
    const tiersByExternal: Record<string, Tier> = {};
    const chunks: string[][] = [];
    for (let i = 0; i < PUBLIC_PRICE_IDS.length; i += 10) {
      chunks.push(PUBLIC_PRICE_IDS.slice(i, i + 10));
    }
    for (const chunk of chunks) {
      const prices = await stripe.prices.list({
        lookup_keys: chunk,
        expand: ["data.product"],
        active: true,
        limit: 100,
      });
      for (const price of prices.data) {
        const externalId = price.lookup_key;
        if (!externalId || !PUBLIC_PRICE_IDS.includes(externalId)) continue;
        const product: any = price.product;
        const amount = price.unit_amount ?? 0;
        const currency = (price.currency ?? "usd").toUpperCase();
        tiersByExternal[externalId] = {
          externalId,
          name: product?.name ?? externalId,
          description: product?.description ?? "",
          priceFormatted: formatAmount(amount, currency),
          amountCents: amount,
          currency,
        };
      }
    }

    // Preserve the configured display order and drop missing ones.
    const tiers = PUBLIC_PRICE_IDS
      .map((id) => tiersByExternal[id])
      .filter(Boolean);

    return new Response(JSON.stringify({ tiers, environment }), {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("list-pricing error", err);
    return new Response(
      JSON.stringify({ tiers: [], error: (err as Error).message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
