-- Restrict EXECUTE on SECURITY DEFINER leaderboard helpers to authenticated users only
REVOKE EXECUTE ON FUNCTION public.get_season_leaderboard(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_season_leaderboard(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_profiles(uuid[]) TO authenticated;

-- Restrict realtime season channel subscribe policy to authenticated role only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime'
      AND tablename = 'messages'
      AND policyname = 'Users can subscribe to own season channel'
  ) THEN
    EXECUTE 'DROP POLICY "Users can subscribe to own season channel" ON realtime.messages';
  END IF;
END $$;

CREATE POLICY "Users can subscribe to own season channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
