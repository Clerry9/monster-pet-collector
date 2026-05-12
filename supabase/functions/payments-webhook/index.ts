import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

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

  // Season pass handled separately further below (writes to season_progress)
  season_pass_one_time: { packId: "season_pass" },
  season_pass_t1_price: { packId: "season_pass" },
  season_pass_t2_price: { packId: "season_pass" },
  season_pass_t3_price: { packId: "season_pass" },
  season_pass_t4_price: { packId: "season_pass" },
  season_pass_t5_price: { packId: "season_pass" },

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
      paddle_transaction_id: transactionId,
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
      paddle_transaction_id: ctx?.transactionId ?? null,
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log('Received event:', event.eventType, 'env:', env);

    switch (event.eventType) {
      case EventName.TransactionCompleted: {
        const data = event.data as any;
        const customData = data.customData || {};
        const userId = customData.userId;

        if (!userId) {
          console.error('No userId in customData — cannot grant entitlement');
          break;
        }

        // ---- Idempotency guard ----
        // Each Paddle transaction id is unique. If we've already recorded a
        // 'completed' purchase for this id, the perks were already granted —
        // bail out so a webhook retry / duplicate delivery doesn't double-grant.
        {
          const { data: existing } = await supabase
            .from('purchases')
            .select('id, status')
            .eq('paddle_transaction_id', data.id)
            .maybeSingle();
          if (existing && existing.status === 'completed') {
            console.log('Duplicate transaction event ignored:', data.id);
            break;
          }
        }

        // Extract price info from transaction items
        const item = data.items?.[0];
        const priceExternalId = item?.price?.importMeta?.externalId || item?.price?.id || '';
        const productExternalId = item?.product?.importMeta?.externalId || item?.product?.id || '';

        const perk = PACK_MAP[priceExternalId];
        if (!perk) {
          console.warn('No perk mapping for price:', priceExternalId);
        }
        const rollsToGrant = perk?.rolls ?? 0;
        const coinsToGrant = perk?.coins ?? 0;
        const starsToGrant = perk?.stars ?? 0;
        const cardFlipsToGrant = perk?.cardFlips ?? 0;

        // Record the purchase
        const { error: purchaseError } = await supabase.from('purchases').upsert({
          user_id: userId,
          paddle_transaction_id: data.id,
          product_id: productExternalId,
          price_id: priceExternalId,
          pack_id: perk?.packId || customData.packId || 'unknown',
          rolls_granted: rollsToGrant,
          status: 'completed',
          environment: env,
        }, { onConflict: 'paddle_transaction_id' });

        if (purchaseError) {
          console.error('Failed to record purchase:', purchaseError);
          break;
        }

        // Apply ALL economic rewards in a single read-modify-write so
        // multiple bundles (e.g. VIP) credit atomically.
        if (perk && (rollsToGrant || coinsToGrant || starsToGrant || cardFlipsToGrant || perk.unlockDiceTier || perk.unlockMonsters)) {
          await grantPerks(userId, perk, { priceId: priceExternalId, transactionId: data.id, environment: env });
        }

        // Roulette spin packs — independent fulfillment path (writes to
        // roulette_state, not game_state).
        if (ROULETTE_SPIN_MAP[priceExternalId]) {
          await grantRouletteSpins(userId, priceExternalId, data.id, env);
        }

        // Handle Season Pass purchase
        if (priceExternalId === 'season_pass_one_time' || customData.packId === 'season_pass') {
          const seasonInstanceId = customData.seasonInstanceId;
          if (seasonInstanceId) {
            // Upsert the season_progress row with pass_purchased = true
            const { data: existing } = await supabase
              .from('season_progress')
              .select('*')
              .eq('user_id', userId)
              .eq('season_id', seasonInstanceId)
              .maybeSingle();

            if (existing) {
              await supabase
                .from('season_progress')
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
          } else {
            console.warn('Season pass purchase had no seasonInstanceId in customData');
          }
        }

        console.log(`Purchase fulfilled: user=${userId}, pack=${perk?.packId}, rolls=${rollsToGrant}, coins=${coinsToGrant}`);
        break;
      }

      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated: {
        const data = event.data as any;
        const userId = data.customData?.userId;
        if (!userId) { console.warn('Subscription event without userId'); break; }
        const item = data.items?.[0];
        const priceId = item?.price?.importMeta?.externalId ?? item?.price?.id;
        const productId = item?.product?.importMeta?.externalId ?? item?.product?.id;
        if (!priceId || !productId) { console.warn('Subscription missing externalId'); break; }
        // ---- Subscription renewal idempotency ----
        // For renewals, Paddle fires subscription.updated with a new
        // current_period_start. Only grant recurring perks when the period
        // start advances vs. what we already stored.
        const periodStart = data.currentBillingPeriod?.startsAt;
        const { data: priorSub } = await supabase
          .from('subscriptions')
          .select('current_period_start, status')
          .eq('paddle_subscription_id', data.id)
          .maybeSingle();
        const isNewPeriod =
          !priorSub ||
          (periodStart && priorSub.current_period_start !== periodStart);
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          paddle_subscription_id: data.id,
          paddle_customer_id: data.customerId,
          product_id: productId,
          price_id: priceId,
          status: data.status,
          current_period_start: periodStart,
          current_period_end: data.currentBillingPeriod?.endsAt,
          cancel_at_period_end: data.scheduledChange?.action === 'cancel',
          environment: env,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'paddle_subscription_id' });
        // Grant subscription perks once per billing period.
        if (isNewPeriod && (data.status === 'active' || data.status === 'trialing')) {
          const subPerk = PACK_MAP[priceId];
          if (subPerk) {
            await grantPerks(userId, subPerk, { priceId, transactionId: data.id, environment: env });
            console.log(`Granted subscription perks for ${priceId} period ${periodStart}`);
          }
        }
        console.log(`Subscription ${event.eventType}: ${data.id}`);
        break;
      }

      case EventName.SubscriptionCanceled: {
        const data = event.data as any;
        await supabase.from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('paddle_subscription_id', data.id)
          .eq('environment', env);
        break;
      }

      case EventName.TransactionPaymentFailed:
        console.log('Payment failed:', (event.data as any).id, 'env:', env);
        break;

      default:
        console.log('Unhandled event:', event.eventType);
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
