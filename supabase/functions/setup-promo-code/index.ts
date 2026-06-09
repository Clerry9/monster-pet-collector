import { createStripeClient, corsHeaders } from "../_shared/stripe.ts";

/**
 * One-shot admin utility: creates (or refreshes) the FREE100 test promo code.
 * 100% off, valid for 2 days from creation. Sandbox only.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const step: { name: string } = { name: "init" };
  try {
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
      { discount: coupon.id, code: CODE, expires_at: expiresAt },
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