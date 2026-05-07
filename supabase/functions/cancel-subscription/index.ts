import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json',
};

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
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    const { subscriptionId, action } = await req.json();
    if (!subscriptionId || (action !== 'cancel' && action !== 'resume')) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: corsHeaders });
    }

    // Verify ownership using service role
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: row } = await admin
      .from('subscriptions')
      .select('*')
      .eq('paddle_subscription_id', subscriptionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!row) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
    }
    const env = row.environment as PaddleEnv;

    if (action === 'cancel') {
      // Cancel at end of billing period via Paddle SDK
      const paddle = getPaddleClient(env);
      await paddle.subscriptions.cancel(subscriptionId, { effectiveFrom: 'next_billing_period' });
    } else {
      // Resume = clear scheduled cancellation
      const res = await gatewayFetch(env, `/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduled_change: null }),
      });
      if (!res.ok) {
        const txt = await res.text();
        return new Response(JSON.stringify({ error: 'Paddle error', detail: txt }), { status: 400, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (e) {
    console.error('cancel-subscription error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});