-- Lock down internal-only SECURITY DEFINER functions: only service_role / triggers may call them.
-- User-facing RPCs (apply_dice_roll, buy_dice_pack, claim_*, etc.) remain callable by authenticated.

REVOKE EXECUTE ON FUNCTION public.grant_battle_rewards(uuid, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.grant_battle_rewards(uuid, integer, integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.grant_paid_roulette_spins(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.grant_paid_roulette_spins(uuid, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.clamp_game_state_ranges() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.clamp_game_state_ranges() TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;