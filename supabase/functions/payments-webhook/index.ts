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

  // Special bundles — must match perk strings shown in SpecialPacks.tsx
  special_starter_price: { packId: "special_starter", rolls: 30,  coins: 500,   cardFlips: 1 },
  special_card_price:    { packId: "special_card",    rolls: 50,  coins: 1000,  cardFlips: 3 },
  special_monster_price: { packId: "special_monster", rolls: 150, coins: 3000,  unlockDiceTier: "gold" },
  special_vip_price:     { packId: "special_vip",     rolls: 500, coins: 10000, unlockDiceTier: "gold", unlockMonsters: ["mossfang", "aurorix"] },

  // Recurring subscriptions — perks granted on every renewal
  collector_club_monthly: { packId: "collector_club", rolls: 50,  coins: 500,  cardFlips: 1 },
  monster_elite_monthly:  { packId: "monster_elite",  rolls: 200, coins: 2500, cardFlips: 5, stars: 10, unlockDiceTier: "gold", unlockMonsters: ["mossfang", "aurorix"] },
};

async function grantPerks(userId: string, perk: Perk) {
  const { data: gameState } = await supabase
    .from('game_state')
    .select('rolls, coins, island_stars, pending_card_flips, unlocked_dice_tiers, active_dice_tier, unlocked_monsters')
    .eq('user_id', userId)
    .maybeSingle();
  const rolls = perk.rolls ?? 0, coins = perk.coins ?? 0, stars = perk.stars ?? 0, flips = perk.cardFlips ?? 0;
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
          await grantPerks(userId, perk);
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
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          paddle_subscription_id: data.id,
          paddle_customer_id: data.customerId,
          product_id: productId,
          price_id: priceId,
          status: data.status,
          current_period_start: data.currentBillingPeriod?.startsAt,
          current_period_end: data.currentBillingPeriod?.endsAt,
          cancel_at_period_end: data.scheduledChange?.action === 'cancel',
          environment: env,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'paddle_subscription_id' });
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
