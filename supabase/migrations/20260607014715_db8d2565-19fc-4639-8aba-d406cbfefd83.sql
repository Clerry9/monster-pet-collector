
-- Revoke EXECUTE from anon and public on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.claim_pending_arena_rewards() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_power_up(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_arena_season() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_arena_leaderboard(integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_arena_rank() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_power_up(uuid, text, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purchase_power_up(text, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.use_energy_tonic() FROM anon, PUBLIC;

-- grant_power_up is meant to be service-role only; revoke from authenticated too
REVOKE EXECUTE ON FUNCTION public.grant_power_up(uuid, text, integer) FROM authenticated;

-- Remove pack_analytics from Realtime publication (sensitive Stripe metadata; not needed client-side)
ALTER PUBLICATION supabase_realtime DROP TABLE public.pack_analytics;
