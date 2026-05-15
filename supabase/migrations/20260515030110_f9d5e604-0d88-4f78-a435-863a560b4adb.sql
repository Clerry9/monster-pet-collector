
-- 1. game_state UPDATE: extend monotonic constraints to all economic fields
DROP POLICY IF EXISTS "Users can update own game state (no economic increase)" ON public.game_state;

CREATE POLICY "Users can update own game state (no economic increase)"
ON public.game_state
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND coins  <= (SELECT gs.coins  FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND rolls  <= (SELECT gs.rolls  FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND xp     <= (SELECT gs.xp     FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND level  <= (SELECT gs.level  FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND energy <= (SELECT gs.energy FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND island_stars       <= (SELECT gs.island_stars       FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND pending_card_flips <= (SELECT gs.pending_card_flips FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND bet_multiplier     <= (SELECT gs.bet_multiplier     FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND total_steps        <= (SELECT gs.total_steps        FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND cards_collected    <= (SELECT gs.cards_collected    FROM public.game_state gs WHERE gs.user_id = auth.uid())
  -- last_spin_at can only move forward (no cooldown bypass)
  AND (last_spin_at IS NULL OR last_spin_at >= COALESCE(
        (SELECT gs.last_spin_at FROM public.game_state gs WHERE gs.user_id = auth.uid()),
        '-infinity'::timestamptz))
  -- collected_cards: cannot grow and cannot introduce new ids
  AND COALESCE(array_length(collected_cards, 1), 0) <= COALESCE(
        (SELECT array_length(gs.collected_cards, 1) FROM public.game_state gs WHERE gs.user_id = auth.uid()), 0)
  AND NOT EXISTS (
    SELECT 1 FROM unnest(game_state.collected_cards) AS t(c)
    WHERE t.c <> ALL (
      COALESCE((SELECT gs.collected_cards FROM public.game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[])
    )
  )
  -- unlocked_dice_tiers: cannot grow and cannot introduce new tiers
  AND COALESCE(array_length(unlocked_dice_tiers, 1), 0) <= COALESCE(
        (SELECT array_length(gs.unlocked_dice_tiers, 1) FROM public.game_state gs WHERE gs.user_id = auth.uid()), 0)
  AND NOT EXISTS (
    SELECT 1 FROM unnest(game_state.unlocked_dice_tiers) AS t(new_tier)
    WHERE t.new_tier <> ALL (
      COALESCE((SELECT gs.unlocked_dice_tiers FROM public.game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[])
    )
  )
  -- unlocked_monsters: cannot grow and cannot introduce new ids
  AND COALESCE(array_length(unlocked_monsters, 1), 0) <= COALESCE(
        (SELECT array_length(gs.unlocked_monsters, 1) FROM public.game_state gs WHERE gs.user_id = auth.uid()), 0)
  AND NOT EXISTS (
    SELECT 1 FROM unnest(game_state.unlocked_monsters) AS t(m)
    WHERE t.m <> ALL (
      COALESCE((SELECT gs.unlocked_monsters FROM public.game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[])
    )
  )
);

-- 2. game_state INSERT: lock initial row to default baseline values
DROP POLICY IF EXISTS "Users can insert own game state" ON public.game_state;

CREATE POLICY "Users can insert own game state (baseline only)"
ON public.game_state
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND coins = 50
  AND rolls = 10
  AND xp = 0
  AND level = 1
  AND energy = 150
  AND island_stars = 0
  AND pending_card_flips = 0
  AND bet_multiplier = 1
  AND total_steps = 0
  AND cards_collected = 0
  AND position = 0
  AND active_dice_tier = 'basic'
  AND active_monster = 'gobby'
  AND COALESCE(array_length(collected_cards, 1), 0) = 0
  AND COALESCE(array_length(unlocked_dice_tiers, 1), 0) = 1
  AND 'basic' = ANY(unlocked_dice_tiers)
  AND COALESCE(array_length(unlocked_monsters, 1), 0) = 1
  AND 'gobby' = ANY(unlocked_monsters)
  AND last_spin_at IS NULL
);

-- 3. realtime.messages: block anonymous (guest) JWTs from realtime subscriptions
DROP POLICY IF EXISTS "users subscribe to own topics only" ON realtime.messages;

CREATE POLICY "users subscribe to own topics only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  AND position(auth.uid()::text in realtime.topic()) > 0
);
