import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

const responseHeaders = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Content-Type": "application/json",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, responseHeaders);
  }

  // Require an authenticated caller to prevent unauthenticated probing of
  // the Paddle catalog and rate-limit exhaustion.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      ...responseHeaders,
    });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supa = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supa.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      ...responseHeaders,
    });
  }

  const { priceId, environment } = await req.json();
  if (!priceId) {
    return new Response(JSON.stringify({ error: "priceId required" }), {
      status: 400,
      ...responseHeaders,
    });
  }

  // Validate environment input (only allow known values).
  const env: PaddleEnv = environment === "live" ? "live" : "sandbox";

  const response = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
  const data = await response.json();

  if (!data.data?.length) {
    return new Response(JSON.stringify({ error: "Price not found" }), {
      status: 404,
      ...responseHeaders,
    });
  }

  return new Response(JSON.stringify({ paddleId: data.data[0].id }), responseHeaders);
});
