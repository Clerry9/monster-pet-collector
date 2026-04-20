
-- 1. Drop overly-broad leaderboard SELECT policies
DROP POLICY IF EXISTS "Anyone can view season progress for leaderboard" ON public.season_progress;
DROP POLICY IF EXISTS "Anyone can view profiles for leaderboard" ON public.profiles;

-- 2. Restrict own-row policies on season_progress to authenticated only
DROP POLICY IF EXISTS "Users can view own season progress" ON public.season_progress;
DROP POLICY IF EXISTS "Users can insert own season progress" ON public.season_progress;
DROP POLICY IF EXISTS "Users can update own season progress" ON public.season_progress;

CREATE POLICY "Users can view own season progress"
  ON public.season_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own season progress"
  ON public.season_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own season progress"
  ON public.season_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Public leaderboard views with only the columns needed
CREATE OR REPLACE VIEW public.season_leaderboard
WITH (security_invoker = true) AS
SELECT user_id, season_id, symbols
FROM public.season_progress;

CREATE OR REPLACE VIEW public.profile_leaderboard
WITH (security_invoker = true) AS
SELECT user_id, display_name, level
FROM public.profiles;

-- Views need their own RLS-equivalent policies via underlying tables.
-- Since security_invoker uses the caller's permissions, and we removed the
-- broad SELECT, we need a dedicated policy that allows authenticated users
-- to read just these limited columns. We do that by adding back a
-- column-restricted SELECT policy that returns rows only when accessed
-- through the views' columns -- in practice we add a permissive SELECT
-- policy back but readers will only access via the view (the view itself
-- limits columns).

-- Allow authenticated users to read minimal leaderboard columns from underlying tables.
-- We accomplish this with a SECURITY DEFINER function returning the leaderboard rows.
DROP VIEW IF EXISTS public.season_leaderboard;
DROP VIEW IF EXISTS public.profile_leaderboard;

CREATE OR REPLACE FUNCTION public.get_season_leaderboard(_season_id text, _limit int DEFAULT 20)
RETURNS TABLE (user_id uuid, symbols int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, symbols
  FROM public.season_progress
  WHERE season_id = _season_id
  ORDER BY symbols DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_profiles(_user_ids uuid[])
RETURNS TABLE (user_id uuid, display_name text, level int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, display_name, level
  FROM public.profiles
  WHERE user_id = ANY(_user_ids);
$$;

REVOKE ALL ON FUNCTION public.get_season_leaderboard(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_season_leaderboard(text, int) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_profiles(uuid[]) TO authenticated, anon;
