import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { gatewayFetch, type PaddleEnv } from "../_shared/paddle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

// External (human-readable) price IDs that should appear on the public Pricing page,
// in the order they should be displayed.
const PUBLIC_PRICE_IDS = [
  "value_pack_price",
  "mega_pack_price",
  "ultra_pack_price",
  "silver_dice_price",
  "gold_dice_price",
  "star_pack_price",
  "season_pass_price",
  "special_starter_price",
  "special_card_price",
  "special_monster_price",
  "special_vip_price",
];

function formatAmount(amount: string, currency: string): string {
  // Paddle returns amounts in the lowest denomination as a string (e.g. "499" = $4.99)
  const value = Number(amount) / 100;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const envParam = url.searchParams.get("environment");
    let environment: PaddleEnv = "live";
    if (envParam === "sandbox" || envParam === "live") environment = envParam;

    // Fetch all matching prices in one call (include the parent product for name/desc).
    const externalFilter = PUBLIC_PRICE_IDS.join(",");
    const path = `/prices?external_id=${encodeURIComponent(externalFilter)}&include=product&per_page=200&status=active`;
    const response = await gatewayFetch(environment, path);
    const data = await response.json();

    if (!Array.isArray(data?.data)) {
      return new Response(
        JSON.stringify({ tiers: [], error: "No pricing data" }),
        { status: 200, headers: corsHeaders },
      );
    }

    // Build a lookup of included products by id.
    const products: Record<string, { name?: string; description?: string }> = {};
    for (const inc of data.included ?? []) {
      if (inc?.id) products[inc.id] = { name: inc.name, description: inc.description };
    }

    type Tier = {
      externalId: string;
      name: string;
      description: string;
      priceFormatted: string;
      amountCents: number;
      currency: string;
    };

    const tiersByExternal: Record<string, Tier> = {};
    for (const price of data.data) {
      const externalId: string | null = price.external_id ?? null;
      if (!externalId || !PUBLIC_PRICE_IDS.includes(externalId)) continue;

      const product = price.product_id ? products[price.product_id] : null;
      const amount: string = price.unit_price?.amount ?? "0";
      const currency: string = price.unit_price?.currency_code ?? "USD";

      tiersByExternal[externalId] = {
        externalId,
        name: product?.name ?? price.name ?? externalId,
        description: price.description ?? product?.description ?? "",
        priceFormatted: formatAmount(amount, currency),
        amountCents: Number(amount),
        currency,
      };
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
