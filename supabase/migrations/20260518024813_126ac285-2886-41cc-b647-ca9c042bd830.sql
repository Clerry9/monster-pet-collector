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
  AND claimed_at IS NULL
  AND completed_at IS NULL
  AND progress >= 0
  AND progress <= COALESCE(
    (SELECT target FROM public.achievements_def WHERE code = user_achievements.code),
    0
  )
);