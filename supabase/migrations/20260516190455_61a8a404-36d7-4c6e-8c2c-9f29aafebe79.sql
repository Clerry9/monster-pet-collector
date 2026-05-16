DROP POLICY IF EXISTS "users view own cosmetics" ON public.user_cosmetics;

CREATE POLICY "users view own cosmetics"
ON public.user_cosmetics
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);