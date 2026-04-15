import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Map Paddle price external IDs to pack details
const PACK_MAP: Record<string, { packId: string; rolls: number }> = {
  value_pack_price: { packId: "value", rolls: 15 },
  mega_pack_price: { packId: "mega", rolls: 50 },
  ultra_pack_price: { packId: "ultra", rolls: 150 },
  silver_dice_price: { packId: "silver_dice", rolls: 0 },
  gold_dice_price: { packId: "gold_dice", rolls: 0 },
};

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

        const packInfo = PACK_MAP[priceExternalId];
        const rollsToGrant = packInfo?.rolls ?? parseInt(customData.rolls || '0', 10);

        // Record the purchase
        const { error: purchaseError } = await supabase.from('purchases').upsert({
          user_id: userId,
          paddle_transaction_id: data.id,
          product_id: productExternalId,
          price_id: priceExternalId,
          pack_id: packInfo?.packId || customData.packId || 'unknown',
          rolls_granted: rollsToGrant,
          status: 'completed',
          environment: env,
        }, { onConflict: 'paddle_transaction_id' });

        if (purchaseError) {
          console.error('Failed to record purchase:', purchaseError);
          break;
        }

        // Grant rolls to user's game state
        if (rollsToGrant > 0) {
          const { data: gameState } = await supabase
            .from('game_state')
            .select('rolls')
            .eq('user_id', userId)
            .single();

          if (gameState) {
            await supabase
              .from('game_state')
              .update({ rolls: gameState.rolls + rollsToGrant })
              .eq('user_id', userId);
          } else {
            // Create game state with bonus rolls
            await supabase.from('game_state').insert({
              user_id: userId,
              rolls: 10 + rollsToGrant,
            });
          }
        }

        // Handle dice tier unlocks
        if (packInfo?.packId === 'silver_dice' || packInfo?.packId === 'gold_dice') {
          const tierId = packInfo.packId === 'silver_dice' ? 'silver' : 'gold';
          const { data: gameState } = await supabase
            .from('game_state')
            .select('unlocked_dice_tiers, active_dice_tier')
            .eq('user_id', userId)
            .single();

          if (gameState) {
            const tiers = gameState.unlocked_dice_tiers || ['basic'];
            if (!tiers.includes(tierId)) {
              await supabase
                .from('game_state')
                .update({
                  unlocked_dice_tiers: [...tiers, tierId],
                  active_dice_tier: tierId,
                })
                .eq('user_id', userId);
            }
          }
        }

        console.log(`Purchase fulfilled: user=${userId}, pack=${packInfo?.packId}, rolls=${rollsToGrant}`);
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
