
-- 1. roulette_spins: drop client INSERT policy, add SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Users insert own spins (unclaimed)" ON public.roulette_spins;

CREATE OR REPLACE FUNCTION public.record_roulette_spin(
  p_picked_slot int,
  p_landed_slot int,
  p_reward_kind text,
  p_reward_label text,
  p_reward_emoji text,
  p_reward_amount int,
  p_picked_label text,
  p_picked_emoji text,
  p_won boolean,
  p_paid boolean
) RETURNS public.roulette_spins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.roulette_spins;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_reward_amount < 0 OR p_reward_amount > 100000 THEN
    RAISE EXCEPTION 'invalid reward amount';
  END IF;

  INSERT INTO public.roulette_spins (
    user_id, picked_slot, landed_slot, reward_kind, reward_label,
    reward_emoji, reward_amount, picked_label, picked_emoji, won, paid
  ) VALUES (
    v_uid, p_picked_slot, p_landed_slot, p_reward_kind, p_reward_label,
    p_reward_emoji, p_reward_amount, p_picked_label, p_picked_emoji, p_won, p_paid
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_roulette_spin(int,int,text,text,text,int,text,text,boolean,boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.record_roulette_spin(int,int,text,text,text,int,text,text,boolean,boolean) TO authenticated;

-- 2. season_progress: forbid client-side symbol increases (must equal current)
DROP POLICY IF EXISTS "Users can update own season progress (monotonic)" ON public.season_progress;

CREATE POLICY "Users can update own season progress (no economic increase)"
ON public.season_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND symbols = (
    SELECT sp.symbols FROM public.season_progress sp
    WHERE sp.user_id = auth.uid() AND sp.season_id = season_progress.season_id
  )
  AND COALESCE(array_length(claimed_tiers, 1), 0) = COALESCE((
    SELECT array_length(sp.claimed_tiers, 1) FROM public.season_progress sp
    WHERE sp.user_id = auth.uid() AND sp.season_id = season_progress.season_id
  ), 0)
  AND COALESCE(array_length(cards_unlocked, 1), 0) = COALESCE((
    SELECT array_length(sp.cards_unlocked, 1) FROM public.season_progress sp
    WHERE sp.user_id = auth.uid() AND sp.season_id = season_progress.season_id
  ), 0)
  AND pass_purchased = (
    SELECT sp.pass_purchased FROM public.season_progress sp
    WHERE sp.user_id = auth.uid() AND sp.season_id = season_progress.season_id
  )
);

-- 3. game_state: prohibit any direct XP increase (must be <= current)
DROP POLICY IF EXISTS "Users can update own game state (no economic increase)" ON public.game_state;

CREATE POLICY "Users can update own game state (no economic increase)"
ON public.game_state
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND coins <= (SELECT gs.coins FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND rolls <= (SELECT gs.rolls FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND xp    <= (SELECT gs.xp    FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND level <= (SELECT gs.level FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND COALESCE(array_length(unlocked_dice_tiers, 1), 0) <= COALESCE(
    (SELECT array_length(gs.unlocked_dice_tiers, 1) FROM public.game_state gs WHERE gs.user_id = auth.uid()), 0)
  AND NOT EXISTS (
    SELECT 1 FROM unnest(game_state.unlocked_dice_tiers) AS t(new_tier)
    WHERE t.new_tier <> ALL (
      COALESCE((SELECT gs.unlocked_dice_tiers FROM public.game_state gs WHERE gs.user_id = auth.uid()), ARRAY[]::text[])
    )
  )
);

-- 4. user_achievements: enforce progress=0 on insert
DROP POLICY IF EXISTS "users insert own achievements (progress only)" ON public.user_achievements;

CREATE POLICY "users insert own achievements (progress only)"
ON public.user_achievements
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND completed_at IS NULL
  AND claimed_at IS NULL
  AND progress = 0
);

-- 5. roulette_state: prevent paid_spin_credits from being raised by clients
DROP POLICY IF EXISTS "Users update own roulette state" ON public.roulette_state;

CREATE POLICY "Users update own roulette state (no credit increase)"
ON public.roulette_state
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND paid_spin_credits <= (
    SELECT rs.paid_spin_credits FROM public.roulette_state rs WHERE rs.user_id = auth.uid()
  )
);

-- 6. realtime.messages: restrict to authenticated only (was public)
DROP POLICY IF EXISTS "users subscribe to own topics only" ON realtime.messages;

CREATE POLICY "users subscribe to own topics only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (position(auth.uid()::text in realtime.topic()) > 0);
