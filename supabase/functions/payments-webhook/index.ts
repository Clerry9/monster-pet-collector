import { createClient } from 'npm:@supabase/supabase-js@2';
import { type StripeEnv, createStripeClient, verifyWebhook } from '../_shared/stripe.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Server-side perk catalog. ALL economic rewards are defined here so the
// client cannot influence what gets granted. Keep in sync with the UI
// copy in DiceShop.tsx, SpecialPacks.tsx, StarPack pricing, and SeasonHub.
interface Perk {
  packId: string;
  rolls?: number;
  coins?: number;
  stars?: number;          // island_stars
  cardFlips?: number;      // pending_card_flips
  unlockDiceTier?: "silver" | "gold";
  unlockMonsters?: string[]; // monster ids to add to unlocked_monsters
}

/** Server-side hard ceiling on cards granted per Special Pack. Mirrors
 *  MAX_CARDS_PER_PACK in src/components/SpecialPacks.tsx. The client cannot
 *  influence this — even a tampered checkout cannot grant more than this. */
const MAX_CARDS_PER_PACK = 8;

const PACK_MAP: Record<string, Perk> = {
  // Roll bundles
  value_pack_price: { packId: "value", rolls: 15 },
  mega_pack_price:  { packId: "mega",  rolls: 50,  coins: 500 },
  ultra_pack_price: { packId: "ultra", rolls: 150, coins: 2000 },

  // Dice tier unlocks
  silver_dice_price: { packId: "silver_dice", unlockDiceTier: "silver" },
  gold_dice_price:   { packId: "gold_dice",   unlockDiceTier: "gold"   },

  // Star pack — boosts season progression / card flips
  star_pack_price: { packId: "star_pack", stars: 15, cardFlips: 3 },

  // Season pass — also writes pass_purchased=true to season_progress further below.
  // Premium perks (per plan): +5 bonus rolls, exclusive monster auto-unlock.
  season_pass_one_time: { packId: "season_pass", rolls: 5, unlockMonsters: ["drako"] },
  season_pass_t1_price: { packId: "season_pass", rolls: 5, unlockMonsters: ["drako"] },
  season_pass_t2_price: { packId: "season_pass", rolls: 5, unlockMonsters: ["drako"] },
  season_pass_t3_price: { packId: "season_pass", rolls: 5, unlockMonsters: ["mossfang"] },
  season_pass_t4_price: { packId: "season_pass", rolls: 5, unlockMonsters: ["mossfang"] },
  season_pass_t5_price: { packId: "season_pass", rolls: 5, unlockMonsters: ["aurorix"] },

  // Special bundles — must match perk strings shown in SpecialPacks.tsx
  special_starter_price: { packId: "special_starter", rolls: 30,  coins: 500,   cardFlips: 1 },
  special_card_price:    { packId: "special_card",    rolls: 50,  coins: 1000,  cardFlips: 3 },
  special_monster_price: { packId: "special_monster", rolls: 150, coins: 3000,  unlockDiceTier: "gold" },
  special_vip_price:     { packId: "special_vip",     rolls: 500, coins: 10000, cardFlips: 8, unlockDiceTier: "gold", unlockMonsters: ["mossfang", "aurorix"] },

  // Recurring subscriptions — perks granted on every renewal
  collector_club_monthly: { packId: "collector_club", rolls: 50,  coins: 500,  cardFlips: 1 },
  monster_elite_monthly:  { packId: "monster_elite",  rolls: 200, coins: 2500, cardFlips: 5, stars: 10, unlockDiceTier: "gold", unlockMonsters: ["mossfang", "aurorix"] },
};

/** Lucky Roulette paid spin packs — fulfilled by inserting paid spin
 *  credits via the `grant_paid_roulette_spins` RPC instead of touching
 *  game_state. Keep in sync with ROULETTE_SPIN_PACKS in DiceShop.tsx. */
const ROULETTE_SPIN_MAP: Record<string, { packId: string; spins: number }> = {
  roulette_spins_5_price:  { packId: "roulette_spins_5",  spins: 5  },
  roulette_spins_25_price: { packId: "roulette_spins_25", spins: 25 },
};

/** Power-up bundles — grant a fixed mix of boosts on completed payment.
 *  Must stay in sync with power_ups_def seed and PowerUpShop UI. */
const POWER_UP_BUNDLE_MAP: Record<string, { packId: string; grants: { id: string; qty: number }[] }> = {
  boost_bundle_starter: {
    packId: "boost_bundle_starter",
    grants: [
      { id: "arena_iron_skin",    qty: 1 },
      { id: "arena_war_cry",      qty: 1 },
      { id: "arena_phoenix",      qty: 1 },
      { id: "arena_shard_2x",     qty: 1 },
      { id: "pvp_first_strike",   qty: 1 },
      { id: "pvp_lucky_crit",     qty: 1 },
      { id: "pvp_aegis",          qty: 2 },
      { id: "board_coin_rush",    qty: 2 },
      { id: "board_energy_tonic", qty: 2 },
    ], // 12 total
  },
  boost_bundle_big: {
    packId: "boost_bundle_big",
    grants: [
      { id: "arena_iron_skin",    qty: 3 },
      { id: "arena_war_cry",      qty: 3 },
      { id: "arena_phoenix",      qty: 2 },
      { id: "arena_shard_2x",     qty: 2 },
      { id: "pvp_first_strike",   qty: 3 },
      { id: "pvp_lucky_crit",     qty: 3 },
      { id: "pvp_aegis",          qty: 4 },
      { id: "board_coin_rush",    qty: 5 },
      { id: "board_energy_tonic", qty: 5 },
    ], // 30 total
  },
};

async function grantPowerUpBundle(userId: string, priceId: string, transactionId: string, environment: string) {
  const entry = POWER_UP_BUNDLE_MAP[priceId];
  if (!entry) return false;
  for (const g of entry.grants) {
    const { error } = await supabase.rpc('grant_power_up', {
      p_user_id: userId,
      p_power_up_id: g.id,
      p_quantity: g.qty,
    });
    if (error) console.error('grant_power_up failed for', g.id, error);
  }
  console.log(JSON.stringify({
    event: 'pack_fulfilled',
    userId,
    packId: entry.packId,
    totalBoosts: entry.grants.reduce((n, g) => n + g.qty, 0),
  }));
  try {
    await supabase.from('pack_analytics').insert({
      user_id: userId,
      pack_id: entry.packId,
      price_id: priceId,
      stripe_transaction_id: transactionId,
      event: 'pack_fulfilled',
      environment,
    });
  } catch (e) {
    console.error('pack_analytics insert (boost bundle) threw:', e);
  }
  return true;
}

async function grantRouletteSpins(userId: string, priceId: string, transactionId: string, environment: string) {
  const entry = ROULETTE_SPIN_MAP[priceId];
  if (!entry) return false;
  const { error } = await supabase.rpc('grant_paid_roulette_spins', {
    p_user_id: userId,
    p_amount: entry.spins,
  });
  if (error) {
    console.error('grant_paid_roulette_spins failed:', error);
    return false;
  }
  console.log(JSON.stringify({
    event: 'pack_fulfilled',
    userId,
    packId: entry.packId,
    spins: entry.spins,
  }));
  try {
    await supabase.from('pack_analytics').insert({
      user_id: userId,
      pack_id: entry.packId,
      price_id: priceId,
      stripe_transaction_id: transactionId,
      event: 'pack_fulfilled',
      // No dedicated spins column on pack_analytics — record under
      // rolls_granted so admin dashboards have a single quantity column.
      rolls_granted: entry.spins,
      environment,
    });
  } catch (e) {
    console.error('pack_analytics insert (roulette) threw:', e);
  }
  return true;
}

async function grantPerks(userId: string, perk: Perk, ctx?: { priceId?: string; transactionId?: string; environment?: string }) {
  // Clamp Special Pack card grants to the hard ceiling. Applies to any
  // perk in PACK_MAP — defense-in-depth against a future entry exceeding
  // the limit by mistake.
  const clampedFlips = perk.packId.startsWith("special_")
    ? Math.min(perk.cardFlips ?? 0, MAX_CARDS_PER_PACK)
    : (perk.cardFlips ?? 0);
  if ((perk.cardFlips ?? 0) !== clampedFlips) {
    console.warn(`[analytics] pack ${perk.packId}: card grant clamped from ${perk.cardFlips} to ${clampedFlips}`);
  }
  const { data: gameState } = await supabase
    .from('game_state')
    .select('rolls, coins, island_stars, pending_card_flips, unlocked_dice_tiers, active_dice_tier, unlocked_monsters')
    .eq('user_id', userId)
    .maybeSingle();
  const rolls = perk.rolls ?? 0, coins = perk.coins ?? 0, stars = perk.stars ?? 0, flips = clampedFlips;
  // Structured analytics event — surfaced in edge function logs and easy to
  // grep for downstream pipelines. Includes the (clamped) card count so we
  // can audit how many cards each pack actually granted.
  console.log(JSON.stringify({
    event: "pack_fulfilled",
    userId,
    packId: perk.packId,
    rolls, coins, stars, cardFlips: flips,
    diceTier: perk.unlockDiceTier ?? null,
    monsters: perk.unlockMonsters ?? [],
  }));
  // Persist analytics to a queryable table (in addition to the structured log).
  // Failures here are non-fatal — we never want analytics to block fulfillment.
  try {
    const { error: analyticsErr } = await supabase.from('pack_analytics').insert({
      user_id: userId,
      pack_id: perk.packId,
      price_id: ctx?.priceId ?? null,
      stripe_transaction_id: ctx?.transactionId ?? null,
      event: 'pack_fulfilled',
      rolls_granted: rolls,
      coins_granted: coins,
      stars_granted: stars,
      cards_granted: flips,
      dice_tier: perk.unlockDiceTier ?? null,
      monsters_granted: perk.unlockMonsters ?? [],
      environment: ctx?.environment ?? 'sandbox',
    });
    if (analyticsErr) console.error('pack_analytics insert failed:', analyticsErr);
  } catch (e) {
    console.error('pack_analytics insert threw:', e);
  }
  if (gameState) {
    const tiers = gameState.unlocked_dice_tiers || ['basic'];
    const monsters = gameState.unlocked_monsters || ['gobby'];
    let nextTiers = tiers, nextActive = gameState.active_dice_tier;
    if (perk.unlockDiceTier && !tiers.includes(perk.unlockDiceTier)) {
      nextTiers = [...tiers, perk.unlockDiceTier];
      nextActive = perk.unlockDiceTier;
    }
    let nextMonsters = monsters;
    if (perk.unlockMonsters?.length) {
      const add = perk.unlockMonsters.filter((m) => !monsters.includes(m));
      if (add.length) nextMonsters = [...monsters, ...add];
    }
    await supabase.from('game_state').update({
      rolls: gameState.rolls + rolls,
      coins: gameState.coins + coins,
      island_stars: (gameState.island_stars ?? 0) + stars,
      pending_card_flips: (gameState.pending_card_flips ?? 0) + flips,
      unlocked_dice_tiers: nextTiers,
      active_dice_tier: nextActive,
      unlocked_monsters: nextMonsters,
    }).eq('user_id', userId);
  } else {
    await supabase.from('game_state').insert({
      user_id: userId,
      rolls: 10 + rolls,
      coins: 50 + coins,
      island_stars: stars,
      pending_card_flips: flips,
      unlocked_dice_tiers: perk.unlockDiceTier ? ['basic', perk.unlockDiceTier] : ['basic'],
      active_dice_tier: perk.unlockDiceTier ?? 'basic',
      unlocked_monsters: perk.unlockMonsters?.length ? ['gobby', ...perk.unlockMonsters] : ['gobby'],
    });
  }
}

function resolvePriceLookup(price: any): string {
  return price?.lookup_key || price?.metadata?.lovable_external_id || price?.id || '';
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  // Only fulfil one-time payments here. Subscription rows are written by
  // customer.subscription.created/updated handlers, but we still grant the
  // subscription's first-period perks via that path.
  if (session.mode !== 'payment') return;

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  // Idempotency
  const { data: existing } = await supabase
    .from('purchases')
    .select('id, status')
    .eq('stripe_transaction_id', session.id)
    .maybeSingle();
  if (existing && existing.status === 'completed') {
    console.log('Duplicate session ignored:', session.id);
    return;
  }

  // Pull line items with price expanded to get lookup_key
  const stripe = createStripeClient(env);
  const items = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product'],
    limit: 1,
  });
  const item = items.data[0];
  const price = item?.price as any;
  const priceExternalId = resolvePriceLookup(price);
  const productExternalId = (price?.product?.metadata?.lovable_external_id) || price?.product?.id || '';

  const perk = PACK_MAP[priceExternalId];
  if (!perk) console.warn('No perk mapping for price:', priceExternalId);
  const rollsToGrant = perk?.rolls ?? 0;
  const coinsToGrant = perk?.coins ?? 0;
  const starsToGrant = perk?.stars ?? 0;
  const cardFlipsToGrant = perk?.cardFlips ?? 0;

  const { error: purchaseError } = await supabase.from('purchases').upsert({
    user_id: userId,
    stripe_transaction_id: session.id,
    product_id: productExternalId,
    price_id: priceExternalId,
    pack_id: perk?.packId || session.metadata?.packId || 'unknown',
    rolls_granted: rollsToGrant,
    status: 'completed',
    environment: env,
  }, { onConflict: 'stripe_transaction_id' });

  if (purchaseError) {
    console.error('Failed to record purchase:', purchaseError);
    return;
  }

  if (perk && (rollsToGrant || coinsToGrant || starsToGrant || cardFlipsToGrant || perk.unlockDiceTier || perk.unlockMonsters)) {
    await grantPerks(userId, perk, { priceId: priceExternalId, transactionId: session.id, environment: env });
  }

  if (ROULETTE_SPIN_MAP[priceExternalId]) {
    await grantRouletteSpins(userId, priceExternalId, session.id, env);
  }

  if (POWER_UP_BUNDLE_MAP[priceExternalId]) {
    await grantPowerUpBundle(userId, priceExternalId, session.id, env);
  }

  // Season pass one-time purchases (tier prices count here too)
  const seasonInstanceId = session.metadata?.seasonInstanceId;
  if (seasonInstanceId && (priceExternalId.startsWith('season_pass_') || session.metadata?.packId === 'season_pass')) {
    const { data: existingSeason } = await supabase
      .from('season_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('season_id', seasonInstanceId)
      .maybeSingle();
    if (existingSeason) {
      await supabase.from('season_progress')
        .update({ pass_purchased: true })
        .eq('user_id', userId)
        .eq('season_id', seasonInstanceId);
    } else {
      await supabase.from('season_progress').insert({
        user_id: userId,
        season_id: seasonInstanceId,
        pass_purchased: true,
      });
    }
    console.log(`Season pass granted: user=${userId}, season=${seasonInstanceId}`);
  }

  console.log(`Purchase fulfilled: user=${userId}, pack=${perk?.packId}, rolls=${rollsToGrant}, coins=${coinsToGrant}`);
}

async function handleSubscriptionUpsert(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) { console.warn('Subscription event without userId'); return; }
  const item = subscription.items?.data?.[0];
  const price = item?.price;
  const priceId = resolvePriceLookup(price);
  const productId = price?.product;
  if (!priceId || !productId) { console.warn('Subscription missing price info'); return; }

  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const periodStartIso = periodStart ? new Date(periodStart * 1000).toISOString() : null;
  const periodEndIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  const { data: priorSub } = await supabase
    .from('subscriptions')
    .select('current_period_start, status')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  const isNewPeriod =
    !priorSub ||
    (periodStartIso && priorSub.current_period_start !== periodStartIso);

  await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    product_id: productId,
    price_id: priceId,
    status: subscription.status,
    current_period_start: periodStartIso,
    current_period_end: periodEndIso,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });

  if (isNewPeriod && (subscription.status === 'active' || subscription.status === 'trialing')) {
    const subPerk = PACK_MAP[priceId];
    if (subPerk) {
      await grantPerks(userId, subPerk, { priceId, transactionId: subscription.id, environment: env });
      console.log(`Granted subscription perks for ${priceId} period ${periodStartIso}`);
    }
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await supabase.from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id)
    .eq('environment', env);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const rawEnv = new URL(req.url).searchParams.get('env');
  if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
    console.error('Webhook received with invalid env:', rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: 'invalid env' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log('Received event:', event.type, 'env:', env);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, env);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event.data.object, env);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case 'invoice.payment_failed':
        console.log('Payment failed:', (event.data.object as any).id, 'env:', env);
        break;
      default:
        console.log('Unhandled event:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});
