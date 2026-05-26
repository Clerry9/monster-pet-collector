
-- 1) Remove public read of all ended arena runs
DROP POLICY IF EXISTS "anyone reads arena leaderboard summary" ON public.arena_runs;

-- 2) Lock down grant_battle_rewards: only service_role may call it
REVOKE EXECUTE ON FUNCTION public.grant_battle_rewards(uuid, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_battle_rewards(uuid, integer, integer, integer) TO service_role;

-- 3) Add shards + position constraints to game_state update policy
DROP POLICY IF EXISTS "Users can update own game state (no economic increase)" ON public.game_state;

CREATE POLICY "Users can update own game state (no economic increase)"
ON public.game_state
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (coins <= (SELECT gs.coins FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND (rolls <= (SELECT gs.rolls FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND (xp <= (SELECT gs.xp FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND (level <= (SELECT gs.level FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND (energy <= (SELECT gs.energy FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND (island_stars <= (SELECT gs.island_stars FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND (pending_card_flips <= (SELECT gs.pending_card_flips FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND (bet_multiplier <= (SELECT gs.bet_multiplier FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND (total_steps <= (SELECT gs.total_steps FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND (cards_collected <= (SELECT gs.cards_collected FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND (shards <= (SELECT gs.shards FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND (position = (SELECT gs.position FROM game_state gs WHERE gs.user_id = auth.uid()))
  AND ((last_spin_at IS NULL) OR (last_spin_at >= COALESCE((SELECT gs.last_spin_at FROM game_state gs WHERE gs.user_id = auth.uid()), '-infinity'::timestamptz)))
  AND (COALESCE(array_length(collected_cards, 1), 0) <= COALESCE((SELECT array_length(gs.collected_cards, 1) FROM game_state gs WHERE gs.user_id = auth.uid()), 0))
  AND (NOT EXISTS (
    SELECT 1 FROM unnest(game_state.collected_cards) t(c)
    WHERE t.c <> ALL (COALESCE((SELECT gs.collected_cards FROM game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[]))
  ))
  AND (COALESCE(array_length(unlocked_dice_tiers, 1), 0) <= COALESCE((SELECT array_length(gs.unlocked_dice_tiers, 1) FROM game_state gs WHERE gs.user_id = auth.uid()), 0))
  AND (NOT EXISTS (
    SELECT 1 FROM unnest(game_state.unlocked_dice_tiers) t(new_tier)
    WHERE t.new_tier <> ALL (COALESCE((SELECT gs.unlocked_dice_tiers FROM game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[]))
  ))
  AND (COALESCE(array_length(unlocked_monsters, 1), 0) <= COALESCE((SELECT array_length(gs.unlocked_monsters, 1) FROM game_state gs WHERE gs.user_id = auth.uid()), 0))
  AND (NOT EXISTS (
    SELECT 1 FROM unnest(game_state.unlocked_monsters) t(m)
    WHERE t.m <> ALL (COALESCE((SELECT gs.unlocked_monsters FROM game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[]))
  ))
);
