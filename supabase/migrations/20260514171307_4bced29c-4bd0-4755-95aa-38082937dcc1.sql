
-- =========================================================
-- 1. user_achievements: prevent self-completion / self-claim
-- =========================================================
DROP POLICY IF EXISTS "users insert own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "users update own achievements" ON public.user_achievements;

CREATE POLICY "users insert own achievements (progress only)"
ON public.user_achievements
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND completed_at IS NULL
  AND claimed_at IS NULL
);

CREATE POLICY "users update own achievements (progress only)"
ON public.user_achievements
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND claimed_at IS NULL)
WITH CHECK (
  auth.uid() = user_id
  AND completed_at IS NULL
  AND claimed_at IS NULL
);

-- =========================================================
-- 2. daily_missions: server-only completion / claim
-- =========================================================
DROP POLICY IF EXISTS "users insert own missions" ON public.daily_missions;
DROP POLICY IF EXISTS "users update own missions" ON public.daily_missions;

-- INSERTs and UPDATEs are funneled through SECURITY DEFINER RPCs
-- (get_or_roll_daily_missions, bump_mission_progress, claim_mission)
-- which run with elevated privileges and bypass RLS.
-- Clients can only SELECT.

-- =========================================================
-- 3. season_progress: clients cannot inflate progress / purchase pass
-- =========================================================
DROP POLICY IF EXISTS "Users can update own season progress" ON public.season_progress;
DROP POLICY IF EXISTS "Users can insert own season progress" ON public.season_progress;

-- Allow lazy row creation but force a clean baseline.
CREATE POLICY "Users can insert own season progress (baseline only)"
ON public.season_progress
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND symbols = 0
  AND pass_purchased = false
  AND COALESCE(array_length(claimed_tiers, 1), 0) = 0
  AND COALESCE(array_length(cards_unlocked, 1), 0) = 0
);

-- Allow client UPDATE only for monotonic, non-economic fields:
--  * symbols may only grow
--  * claimed_tiers may only grow in length
--  * cards_unlocked may only grow in length
--  * pass_purchased can never be flipped from false to true by a client
CREATE POLICY "Users can update own season progress (monotonic)"
ON public.season_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND symbols >= (
    SELECT sp.symbols FROM public.season_progress sp
    WHERE sp.user_id = auth.uid() AND sp.season_id = season_progress.season_id
  )
  AND COALESCE(array_length(claimed_tiers, 1), 0) >= COALESCE((
    SELECT array_length(sp.claimed_tiers, 1) FROM public.season_progress sp
    WHERE sp.user_id = auth.uid() AND sp.season_id = season_progress.season_id
  ), 0)
  AND COALESCE(array_length(cards_unlocked, 1), 0) >= COALESCE((
    SELECT array_length(sp.cards_unlocked, 1) FROM public.season_progress sp
    WHERE sp.user_id = auth.uid() AND sp.season_id = season_progress.season_id
  ), 0)
  AND pass_purchased = (
    SELECT sp.pass_purchased FROM public.season_progress sp
    WHERE sp.user_id = auth.uid() AND sp.season_id = season_progress.season_id
  )
);

-- =========================================================
-- 4. roulette_spins: lock down post-insert tampering and deletion
-- =========================================================
DROP POLICY IF EXISTS "Users insert own spins" ON public.roulette_spins;
DROP POLICY IF EXISTS "Users update own spins" ON public.roulette_spins;
DROP POLICY IF EXISTS "Users delete own spins" ON public.roulette_spins;

-- Inserts must start unclaimed; reward_amount bounded to a sane ceiling.
CREATE POLICY "Users insert own spins (unclaimed)"
ON public.roulette_spins
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND claimed_at IS NULL
  AND reward_amount >= 0
  AND reward_amount <= 100000
);

-- Clients cannot UPDATE spins anymore; claim_roulette_spin RPC handles it.
-- Clients cannot DELETE spins (history is read-only).

-- =========================================================
-- 5. ad_reward_claims: explicit server-only write policy
-- =========================================================
CREATE POLICY "service role manages ad reward claims"
ON public.ad_reward_claims
FOR ALL
TO public
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- =========================================================
-- 6. game_state: tier substitution check
-- =========================================================
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
  AND xp <= (SELECT gs.xp FROM public.game_state gs WHERE gs.user_id = auth.uid()) + 1000000
  AND level <= (SELECT gs.level FROM public.game_state gs WHERE gs.user_id = auth.uid())
  AND COALESCE(array_length(unlocked_dice_tiers, 1), 0) <= COALESCE(
    (SELECT array_length(gs.unlocked_dice_tiers, 1) FROM public.game_state gs WHERE gs.user_id = auth.uid()),
    0
  )
  -- Subset check: every tier in the new array must already exist in the prior array.
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(unlocked_dice_tiers) AS new_tier
    WHERE new_tier <> ALL (
      COALESCE(
        (SELECT gs.unlocked_dice_tiers FROM public.game_state gs WHERE gs.user_id = auth.uid()),
        ARRAY[]::text[]
      )
    )
  )
);

-- =========================================================
-- 7. user_roles: scope to authenticated only
-- =========================================================
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Users view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =========================================================
-- 8. Realtime: restrict channel topics to the subscribing user
-- =========================================================
-- Drop any prior overly permissive policies on realtime.messages, then
-- only allow subscribing to topics that end with the user's own uuid.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', p.policyname);
  END LOOP;
END$$;

CREATE POLICY "users subscribe to own topics only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- realtime.topic() returns the channel name the row belongs to.
  -- We require topics to be suffixed with the authenticated user's uuid,
  -- e.g. "season-<uuid>", "roulette_spins:<uuid>:<nonce>".
  position(auth.uid()::text in realtime.topic()) > 0
);

-- =========================================================
-- 9. Lock down internal SECURITY DEFINER helpers from direct API
-- =========================================================
-- has_role and get_leaderboard_profiles are intended for use inside other
-- SECURITY DEFINER functions / RLS policies, not as a public API surface.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_profiles(uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.clamp_game_state_ranges() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.grant_paid_roulette_spins(uuid, integer) FROM anon, authenticated, public;
