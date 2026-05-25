import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, type PaddleEnv } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json',
};

/**
 * Creates a Paddle customer portal session for the caller. The portal lets
 * users update payment methods, view invoices, and self-serve cancel/resume
 * subscriptions. The URL must be opened in a new tab (cannot be iframed).
 *
 * Request body (optional): { subscriptionId?: string }
 *   - If provided, the portal opens scoped to that subscription's manage page.
 *   - Otherwise the general overview URL is returned.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supa.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    let body: { subscriptionId?: string } = {};
    try { body = await req.json(); } catch { /* empty body allowed */ }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Find one subscription row to derive customer + environment. If the
    // caller specifies a subscriptionId, scope the lookup to it.
    const q = admin
      .from('subscriptions')
      .select('paddle_customer_id, paddle_subscription_id, environment, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const { data: rows } = body.subscriptionId
      ? await q.eq('paddle_subscription_id', body.subscriptionId).limit(1)
      : await q.limit(1);
    const sub = rows?.[0];
    if (!sub?.paddle_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No subscription found for this account' }),
        { status: 404, headers: corsHeaders },
      );
    }

    const paddle = getPaddleClient(sub.environment as PaddleEnv);
    // Pass the specific subscription if the caller asked for it; otherwise
    // create a general portal session.
    const portal: any = await paddle.customerPortalSessions.create(
      sub.paddle_customer_id,
      body.subscriptionId ? [body.subscriptionId] : [],
    );

    const generalUrl: string | undefined = portal?.urls?.general?.overview;
    const subscriptionUrl: string | undefined =
      body.subscriptionId
        ? (portal?.urls?.subscriptions ?? []).find(
            (s: any) => s?.id === body.subscriptionId,
          )?.cancelSubscription ?? generalUrl
        : generalUrl;

    return new Response(
      JSON.stringify({ url: subscriptionUrl ?? generalUrl }),
      { headers: corsHeaders },
    );
  } catch (e) {
    console.error('customer-portal error', e);
    return new Response(
      JSON.stringify({ error: (e as Error).message ?? 'Portal session failed' }),
      { status: 500, headers: corsHeaders },
    );
  }
});