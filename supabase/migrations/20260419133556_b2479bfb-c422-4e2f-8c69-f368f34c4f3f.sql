-- Allow authenticated users to read all season_progress rows for leaderboard display
CREATE POLICY "Anyone can view season progress for leaderboard"
ON public.season_progress
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to read all profiles for leaderboard display
CREATE POLICY "Anyone can view profiles for leaderboard"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Helpful index for leaderboard ordering
CREATE INDEX IF NOT EXISTS idx_season_progress_season_symbols
ON public.season_progress (season_id, symbols DESC);