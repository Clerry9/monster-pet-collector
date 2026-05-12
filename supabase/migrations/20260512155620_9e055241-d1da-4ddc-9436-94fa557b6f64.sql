REVOKE EXECUTE ON FUNCTION public.buy_cosmetic(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.equip_cosmetic(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.unequip_cosmetic(text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.buy_cosmetic(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.equip_cosmetic(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unequip_cosmetic(text) TO authenticated;