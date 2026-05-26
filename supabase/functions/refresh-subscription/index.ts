import { createClient } from 'npm:@supabase/supabase-js@2';
import { type StripeEnv, createStripeClient, corsHeaders } from '../_shared/stripe.ts';

/**
 * Re-syncs the caller's subscription rows from Paddle.
 * Useful when realtime/webhook is lagging behind a recent change.
 * Idempotent — only updates fields, never grants perks (perks are only
 * granted by the webhook on a confirmed period change).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: userData } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: rows } = await admin
      .from('subscriptions')
      .select('stripe_subscription_id, environment')
      .eq('user_id', userId);

    let refreshed = 0;
    for (const row of rows ?? []) {
      try {
        const stripe = createStripeClient(row.environment as StripeEnv);
        const sub: any = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
        const item = sub.items?.data?.[0];
        const periodStart = item?.current_period_start ?? sub.current_period_start;
        const periodEnd = item?.current_period_end ?? sub.current_period_end;
        await admin.from('subscriptions').update({
          status: sub.status,
          current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          cancel_at_period_end: sub.cancel_at_period_end || false,
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', row.stripe_subscription_id);
        refreshed++;
      } catch (e) {
        console.warn('Failed to refresh sub', row.stripe_subscription_id, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, refreshed }), { headers: corsHeaders });
  } catch (e) {
    console.error('refresh-subscription error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});