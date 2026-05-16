-- 1) user_achievements: prevent self-completion; restrict SELECT to authenticated
DROP POLICY IF EXISTS "users view own achievements" ON public.user_achievements;
CREATE POLICY "users view own achievements"
  ON public.user_achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own achievements (progress only)" ON public.user_achievements;
CREATE POLICY "users update own achievements (progress only)"
  ON public.user_achievements
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND claimed_at IS NULL
    AND completed_at IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id
    AND completed_at IS NULL
    AND claimed_at IS NULL
  );

-- 2) user_cosmetics: scope policies to authenticated role only
DROP POLICY IF EXISTS "service role manages user cosmetics" ON public.user_cosmetics;
CREATE POLICY "service role manages user cosmetics"
  ON public.user_cosmetics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "users view own cosmetics" ON public.user_cosmetics;
CREATE POLICY "users view own cosmetics"
  ON public.user_cosmetics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);