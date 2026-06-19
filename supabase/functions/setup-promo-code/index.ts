import { createStripeClient, corsHeaders } from "../_shared/stripe.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * One-shot admin utility: creates (or refreshes) the FREE100 test promo code.
 * 100% off, valid for 2 days from creation. Sandbox only.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const step: { name: string } = { name: "init" };
  try {
    // Require an authenticated admin caller.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: claimsData.claims.sub,
      _role: "admin",
    });
    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient("sandbox");
    const CODE = "FREE100";
    const expiresAt = Math.floor(Date.now() / 1000) + 5 * 24 * 60 * 60;

    step.name = "list-existing-promos";
    const existingPromos = await stripe.promotionCodes.list({ code: CODE, limit: 10 });
    step.name = "deactivate-existing-promos";
    for (const p of existingPromos.data) {
      if (p.active) await stripe.promotionCodes.update(p.id, { active: false });
    }

    step.name = "create-coupon";
    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: "once",
      name: "FREE100 — 5 day test",
      redeem_by: expiresAt,
    });

    step.name = "create-promo";
    const promo = await (stripe as any).rawRequest(
      "POST",
      "/v1/promotion_codes",
      {
        "promotion[type]": "coupon",
        "promotion[coupon]": coupon.id,
        code: CODE,
        expires_at: expiresAt,
      },
      {},
    );

    return new Response(
      JSON.stringify({
        ok: true,
        code: promo.code,
        coupon_id: coupon.id,
        promo_id: promo.id,
        expires_at: new Date(expiresAt * 1000).toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("setup-promo-code failed at step", step.name, e);
    return new Response(JSON.stringify({ step: step.name, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});