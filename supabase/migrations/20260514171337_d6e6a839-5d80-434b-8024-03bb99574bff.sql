
REVOKE EXECUTE ON FUNCTION public.claim_daily_streak() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_ad_reward_status() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_ad_reward(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.buy_cosmetic(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.equip_cosmetic(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.unequip_cosmetic(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_achievement(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.bump_mission_progress(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_mission(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_or_roll_daily_missions() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.spend_coins_rolls(integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.unlock_dice_tier(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.buy_dice_pack(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.consume_paid_roulette_spin() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_roulette_spin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_season_leaderboard(text, integer) FROM anon, public;
