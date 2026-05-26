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

    const metadata: Record<string, string> = {
      userId,
      ...Object.fromEntries(
        Object.entries(customData).map(([k, v]) => [k, String(v)]),
      ),
    };

    const session = await stripe.checkout.sessions.create({
      mode: isRecurring ? "subscription" : "payment",
      line_items: [{ price: price.id, quantity }],
      success_url: successUrl || `${new URL(req.url).origin}/?checkout=success`,
      cancel_url: successUrl ? successUrl.replace("checkout=success", "checkout=canceled") : undefined,
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