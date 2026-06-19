
-- Harden daily_missions: writes are service-role only (RPCs run as SECURITY DEFINER)
REVOKE INSERT, UPDATE, DELETE ON public.daily_missions FROM authenticated, anon;
GRANT ALL ON public.daily_missions TO service_role;
DROP POLICY IF EXISTS "Service role manages daily_missions" ON public.daily_missions;
CREATE POLICY "Service role manages daily_missions"
  ON public.daily_missions FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Hide Stripe identifiers from the purchasing user (mirror pack_analytics)
REVOKE SELECT (stripe_transaction_id, price_id) ON public.purchases FROM authenticated, anon;
GRANT SELECT (stripe_transaction_id, price_id) ON public.purchases TO service_role;
