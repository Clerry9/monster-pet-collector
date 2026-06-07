import { createStripeClient, corsHeaders } from "../_shared/stripe.ts";

/**
 * One-shot admin utility: creates (or refreshes) the FREE100 test promo code.
 * 100% off, valid for 2 days from creation. Sandbox only.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const stripe = createStripeClient("sandbox");
    const CODE = "FREE100";
    const expiresAt = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60;

    // Deactivate any existing promo code with the same code so we can recreate it cleanly.
    const existingPromos = await stripe.promotionCodes.list({ code: CODE, limit: 10 });
    for (const p of existingPromos.data) {
      if (p.active) await stripe.promotionCodes.update(p.id, { active: false });
    }

    // Pin to a pre-dahlia API version for the coupon/promotion_codes calls —
    // the dahlia release reshaped these endpoints and `coupon` is no longer
    // accepted as a top-level parameter on promotion_codes.
    // Stripe gateway forces the dahlia API version, which renamed the
    // promotion_codes link field from `coupon` to `discount`. Bypass the SDK
    // and post form-encoded params via rawRequest so we control the body
    // exactly.
    const coupon = await stripe.coupons.create(
      {
        percent_off: 100,
        duration: "once",
        name: "FREE100 — 2 day test",
        redeem_by: expiresAt,
      },
    );

    // Try a few known field names — Stripe API has changed the linker field
    // across recent versions (`coupon`, `discount`).
    let promo: any;
    const candidateFields = ["discount", "coupon"] as const;
    let lastErr: unknown;
    for (const field of candidateFields) {
      try {
        promo = await (stripe as any).rawRequest(
          "POST",
          "/v1/promotion_codes",
          { [field]: coupon.id, code: CODE, expires_at: expiresAt },
          {},
        );
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!promo) throw lastErr ?? new Error("Failed to create promotion_code");

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
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});