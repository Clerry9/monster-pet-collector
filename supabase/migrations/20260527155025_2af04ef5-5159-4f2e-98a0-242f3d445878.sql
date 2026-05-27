REVOKE EXECUTE ON FUNCTION public.grant_monster_xp(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_monster_xp(uuid, text, integer) TO service_role;