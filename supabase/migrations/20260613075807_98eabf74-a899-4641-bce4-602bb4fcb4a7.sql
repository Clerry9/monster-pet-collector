
-- 1) island_landing_rewards: remove client INSERT/UPDATE
DROP POLICY IF EXISTS "Users insert own island rewards" ON public.island_landing_rewards;
DROP POLICY IF EXISTS "Users update own island rewards" ON public.island_landing_rewards;

REVOKE INSERT, UPDATE, DELETE ON public.island_landing_rewards FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.island_landing_rewards FROM anon;
GRANT SELECT ON public.island_landing_rewards TO authenticated;
GRANT ALL ON public.island_landing_rewards TO service_role;

DROP POLICY IF EXISTS "Service role manages island rewards" ON public.island_landing_rewards;
CREATE POLICY "Service role manages island rewards"
ON public.island_landing_rewards
AS PERMISSIVE
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2) pack_analytics: revoke column-level SELECT on Stripe identifiers
REVOKE SELECT (stripe_transaction_id, price_id) ON public.pack_analytics FROM authenticated;
REVOKE SELECT (stripe_transaction_id, price_id) ON public.pack_analytics FROM anon;

-- 3) realtime.messages: strict equality, no substring match
DO $$
DECLARE
  drops text;
BEGIN
  SELECT string_agg(format('DROP POLICY IF EXISTS %I ON realtime.messages;', policyname), E'\n')
    INTO drops
    FROM pg_policies WHERE schemaname='realtime' AND tablename='messages';
  IF drops IS NOT NULL THEN
    EXECUTE drops;
  END IF;
END$$;

CREATE POLICY "users subscribe to own topics only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  COALESCE(((auth.jwt() ->> 'is_anonymous')::boolean), false) = false
  AND realtime.topic() = 'season-' || auth.uid()::text
);
