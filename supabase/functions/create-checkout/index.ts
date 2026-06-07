import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: userData } = await supa.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const {
      priceId,
      quantity = 1,
      customerEmail,
      customData = {},
      successUrl,
      environment,
    }: {
      priceId?: string;
      quantity?: number;
      customerEmail?: string;
      customData?: Record<string, string>;
      successUrl?: string;
      environment?: StripeEnv;
    } = body;

    if (!priceId) {
      return new Response(JSON.stringify({ error: "priceId required" }), { status: 400, headers: corsHeaders });
    }

    const env: StripeEnv = environment === "live" ? "live" : "sandbox";
    const stripe = createStripeClient(env);

    // Resolve lookup_key → Stripe price id
    const prices = await stripe.prices.list({ lookup_keys: [priceId], expand: ["data.product"], limit: 1 });
    const price = prices.data[0];
    if (!price) {
      return new Response(JSON.stringify({ error: `Unknown price: ${priceId}` }), { status: 404, headers: corsHeaders });
    }
    const isRecurring = !!price.recurring;

    // Strip any client-supplied userId from customData so it cannot
    // override the server-validated userId from the JWT.
    const safeCustomData = Object.fromEntries(
      Object.entries(customData)
        .filter(([k]) => k !== "userId")
        .map(([k, v]) => [k, String(v)]),
    );
    const metadata: Record<string, string> = {
      ...safeCustomData,
      userId, // always wins
    };

    // Validate successUrl against an allow-list of real app origins.
    // NOTE: req.url is the edge-function host (supabase.co), NOT the app —
    // using it as the fallback redirects users to a Functions 404
    // ("requested path is invalid") when they hit back from Stripe.
    const ALLOWED_ORIGINS = new Set<string>([
      "https://monsterpetcol.com",
      "https://www.monsterpetcol.com",
      "https://creature-collection-crafter.lovable.app",
      "https://id-preview--e925fb75-03fc-4263-80d5-abbe0769e5dd.lovable.app",
      "http://localhost:5173",
      "http://localhost:8080",
    ]);
    const isAllowedOrigin = (origin: string | null) => {
      if (!origin) return false;
      if (ALLOWED_ORIGINS.has(origin)) return true;
      // Permit Lovable preview subdomains for this project.
      return /^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)
        || /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin);
    };
    const requestOrigin = req.headers.get("origin") ?? req.headers.get("referer");
    const originHost = (() => {
      try { return requestOrigin ? new URL(requestOrigin).origin : null; } catch { return null; }
    })();
    const fallbackOrigin = isAllowedOrigin(originHost)
      ? originHost!
      : "https://monsterpetcol.com";
    const isSafeUrl = (u?: string) => {
      if (!u) return false;
      try { return isAllowedOrigin(new URL(u).origin); } catch { return false; }
    };
    const safeSuccessUrl = isSafeUrl(successUrl)
      ? successUrl!
      : `${fallbackOrigin}/?checkout=success`;
    const safeCancelUrl = safeSuccessUrl.replace("checkout=success", "checkout=canceled");

    const session = await stripe.checkout.sessions.create({
      mode: isRecurring ? "subscription" : "payment",
      line_items: [{ price: price.id, quantity }],
      success_url: safeSuccessUrl,
      cancel_url: safeCancelUrl,
      allow_promotion_codes: true,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      metadata,
      ...(isRecurring ? { subscription_data: { metadata } } : {}),
    });

    return new Response(JSON.stringify({ url: session.url }), { headers: corsHeaders });
  } catch (e) {
    console.error("create-checkout error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});