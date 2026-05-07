import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, type PaddleEnv } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json',
};

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: rows } = await admin
      .from('subscriptions')
      .select('paddle_subscription_id, environment')
      .eq('user_id', userId);

    let refreshed = 0;
    for (const row of rows ?? []) {
      try {
        const paddle = getPaddleClient(row.environment as PaddleEnv);
        const sub: any = await paddle.subscriptions.get(row.paddle_subscription_id);
        await admin.from('subscriptions').update({
          status: sub.status,
          current_period_start: sub.currentBillingPeriod?.startsAt ?? null,
          current_period_end: sub.currentBillingPeriod?.endsAt ?? null,
          cancel_at_period_end: sub.scheduledChange?.action === 'cancel',
          updated_at: new Date().toISOString(),
        }).eq('paddle_subscription_id', row.paddle_subscription_id);
        refreshed++;
      } catch (e) {
        console.warn('Failed to refresh sub', row.paddle_subscription_id, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, refreshed }), { headers: corsHeaders });
  } catch (e) {
    console.error('refresh-subscription error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});