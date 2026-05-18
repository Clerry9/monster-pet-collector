-- 1) Revoke EXECUTE on internal trigger/helper functions from regular users
REVOKE ALL ON FUNCTION public.clamp_game_state_ranges() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) Harden user-scoped RLS policies: explicitly exclude anonymous JWTs.
-- Pattern: drop + recreate the existing per-user policies adding
--   AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false

-- game_state
DROP POLICY IF EXISTS "Users can view own game state" ON public.game_state;
CREATE POLICY "Users can view own game state" ON public.game_state
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id
              AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- daily_streaks
DROP POLICY IF EXISTS "users view own streak" ON public.daily_streaks;
CREATE POLICY "users view own streak" ON public.daily_streaks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- daily_missions
DROP POLICY IF EXISTS "users view own missions" ON public.daily_missions;
CREATE POLICY "users view own missions" ON public.daily_missions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- season_progress
DROP POLICY IF EXISTS "Users can view own season progress" ON public.season_progress;
CREATE POLICY "Users can view own season progress" ON public.season_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- roulette_state
DROP POLICY IF EXISTS "Users view own roulette state" ON public.roulette_state;
CREATE POLICY "Users view own roulette state" ON public.roulette_state
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

DROP POLICY IF EXISTS "Users insert own roulette state" ON public.roulette_state;
CREATE POLICY "Users insert own roulette state" ON public.roulette_state
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id
              AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- roulette_spins
DROP POLICY IF EXISTS "Users view own spins" ON public.roulette_spins;
CREATE POLICY "Users view own spins" ON public.roulette_spins
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- user_achievements
DROP POLICY IF EXISTS "users view own achievements" ON public.user_achievements;
CREATE POLICY "users view own achievements" ON public.user_achievements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

DROP POLICY IF EXISTS "users insert own achievements (progress only)" ON public.user_achievements;
CREATE POLICY "users insert own achievements (progress only)" ON public.user_achievements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id
              AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
              AND completed_at IS NULL
              AND claimed_at IS NULL
              AND progress = 0);

DROP POLICY IF EXISTS "users update own achievements (progress only)" ON public.user_achievements;
CREATE POLICY "users update own achievements (progress only)" ON public.user_achievements
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id
         AND claimed_at IS NULL
         AND completed_at IS NULL
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false)
  WITH CHECK (auth.uid() = user_id
              AND completed_at IS NULL
              AND claimed_at IS NULL
              AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
              AND progress >= 0
              AND progress <= COALESCE(
                (SELECT target FROM public.achievements_def WHERE code = user_achievements.code),
                0
              ));

-- purchases
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- pack_analytics
DROP POLICY IF EXISTS "Users view own pack analytics" ON public.pack_analytics;
CREATE POLICY "Users view own pack analytics" ON public.pack_analytics
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);

-- ad_reward_claims
DROP POLICY IF EXISTS "users view own ad claims" ON public.ad_reward_claims;
CREATE POLICY "users view own ad claims" ON public.ad_reward_claims
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false);