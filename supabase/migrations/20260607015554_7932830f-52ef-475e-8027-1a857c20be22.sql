-- 1) Restrict game_state UPDATE policy to authenticated role only (was public/anon)
DROP POLICY IF EXISTS "Users can update own game state (no economic increase)" ON public.game_state;

CREATE POLICY "Users can update own game state (no economic increase)"
ON public.game_state
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (coins <= (SELECT gs.coins FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND (rolls <= (SELECT gs.rolls FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND (xp <= (SELECT gs.xp FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND (level <= (SELECT gs.level FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND (energy <= (SELECT gs.energy FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND (island_stars <= (SELECT gs.island_stars FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND (pending_card_flips <= (SELECT gs.pending_card_flips FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND (bet_multiplier <= (SELECT gs.bet_multiplier FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND (total_steps <= (SELECT gs.total_steps FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND (cards_collected <= (SELECT gs.cards_collected FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND (shards <= (SELECT gs.shards FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND ("position" = (SELECT gs."position" FROM public.game_state gs WHERE gs.user_id = auth.uid()))
  AND ((last_spin_at IS NULL) OR (last_spin_at >= COALESCE((SELECT gs.last_spin_at FROM public.game_state gs WHERE gs.user_id = auth.uid()), '-infinity'::timestamptz)))
  AND (COALESCE(array_length(collected_cards, 1), 0) <= COALESCE((SELECT array_length(gs.collected_cards, 1) FROM public.game_state gs WHERE gs.user_id = auth.uid()), 0))
  AND (NOT EXISTS (SELECT 1 FROM unnest(game_state.collected_cards) t(c) WHERE t.c <> ALL (COALESCE((SELECT gs.collected_cards FROM public.game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[]))))
  AND (COALESCE(array_length(unlocked_dice_tiers, 1), 0) = COALESCE((SELECT array_length(gs.unlocked_dice_tiers, 1) FROM public.game_state gs WHERE gs.user_id = auth.uid()), 0))
  AND (NOT EXISTS (SELECT 1 FROM unnest(game_state.unlocked_dice_tiers) t(new_tier) WHERE t.new_tier <> ALL (COALESCE((SELECT gs.unlocked_dice_tiers FROM public.game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[]))))
  AND (NOT EXISTS (SELECT 1 FROM unnest(COALESCE((SELECT gs.unlocked_dice_tiers FROM public.game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[])) t(old_tier) WHERE t.old_tier <> ALL (game_state.unlocked_dice_tiers)))
  AND (COALESCE(array_length(unlocked_monsters, 1), 0) = COALESCE((SELECT array_length(gs.unlocked_monsters, 1) FROM public.game_state gs WHERE gs.user_id = auth.uid()), 0))
  AND (NOT EXISTS (SELECT 1 FROM unnest(game_state.unlocked_monsters) t(m) WHERE t.m <> ALL (COALESCE((SELECT gs.unlocked_monsters FROM public.game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[]))))
  AND (NOT EXISTS (SELECT 1 FROM unnest(COALESCE((SELECT gs.unlocked_monsters FROM public.game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[])) t(old_m) WHERE t.old_m <> ALL (game_state.unlocked_monsters)))
);

-- 2) Restrict Stripe-sensitive columns on pack_analytics from regular users.
--    Users keep row-level read access for their own analytics, but cannot
--    read stripe_transaction_id / price_id. Admins (via "Admins view all
--    pack analytics" policy) and service_role retain full column access.
REVOKE SELECT (stripe_transaction_id, price_id) ON public.pack_analytics FROM authenticated;

-- Ensure pack_analytics is NOT in the realtime publication (sensitive Stripe metadata)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pack_analytics'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.pack_analytics';
  END IF;
END $$;
