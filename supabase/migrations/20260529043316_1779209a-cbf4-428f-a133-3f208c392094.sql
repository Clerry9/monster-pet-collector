
-- =========================================================
-- arena_seasons
-- =========================================================
CREATE TABLE public.arena_seasons (
  id text PRIMARY KEY,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  rolled_over boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.arena_seasons TO authenticated;
GRANT ALL ON public.arena_seasons TO service_role;
ALTER TABLE public.arena_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated reads seasons" ON public.arena_seasons
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "service role manages seasons" ON public.arena_seasons
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- =========================================================
-- arena_season_scores
-- =========================================================
CREATE TABLE public.arena_season_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id text NOT NULL,
  user_id uuid NOT NULL,
  best_wave integer NOT NULL DEFAULT 0,
  best_monster_id text,
  runs_count integer NOT NULL DEFAULT 0,
  first_reached_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(season_id, user_id)
);
CREATE INDEX idx_arena_scores_season_wave ON public.arena_season_scores (season_id, best_wave DESC, first_reached_at ASC);
GRANT SELECT ON public.arena_season_scores TO authenticated;
GRANT ALL ON public.arena_season_scores TO service_role;
ALTER TABLE public.arena_season_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated reads scores" ON public.arena_season_scores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "service role manages scores" ON public.arena_season_scores
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- =========================================================
-- arena_season_rewards
-- =========================================================
CREATE TABLE public.arena_season_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id text NOT NULL,
  user_id uuid NOT NULL,
  rank integer NOT NULL,
  coins integer NOT NULL DEFAULT 0,
  shards integer NOT NULL DEFAULT 0,
  granted_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  UNIQUE(season_id, user_id)
);
GRANT SELECT ON public.arena_season_rewards TO authenticated;
GRANT ALL ON public.arena_season_rewards TO service_role;
ALTER TABLE public.arena_season_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own rewards" ON public.arena_season_rewards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "service role manages rewards" ON public.arena_season_rewards
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- =========================================================
-- Helpers
-- =========================================================

-- ISO-week id like "2026-W22" and the Monday 00:00 UTC start
CREATE OR REPLACE FUNCTION public._arena_season_window(p_now timestamptz)
RETURNS TABLE(season_id text, starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    to_char(p_now AT TIME ZONE 'UTC', 'IYYY"-W"IW') AS season_id,
    date_trunc('week', p_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS starts_at,
    (date_trunc('week', p_now AT TIME ZONE 'UTC') + interval '7 days') AT TIME ZONE 'UTC' AS ends_at;
$$;

-- =========================================================
-- current_arena_season: get or create the active season
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_arena_season()
RETURNS arena_seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_w record;
  v_row public.arena_seasons;
BEGIN
  SELECT * INTO v_w FROM public._arena_season_window(now());
  SELECT * INTO v_row FROM public.arena_seasons WHERE id = v_w.season_id;
  IF v_row.id IS NULL THEN
    INSERT INTO public.arena_seasons(id, starts_at, ends_at)
    VALUES (v_w.season_id, v_w.starts_at, v_w.ends_at)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_row FROM public.arena_seasons WHERE id = v_w.season_id;
  END IF;
  RETURN v_row;
END
$$;

-- =========================================================
-- record_arena_run_score: server-only score upsert
-- =========================================================
CREATE OR REPLACE FUNCTION public.record_arena_run_score(
  p_user_id uuid,
  p_wave integer,
  p_monster_id text
)
RETURNS arena_season_scores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.arena_seasons;
  v_row public.arena_season_scores;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'only service role may record arena scores';
  END IF;
  IF p_wave < 0 OR p_wave > 10000 THEN
    RAISE EXCEPTION 'bad wave';
  END IF;

  v_season := public.current_arena_season();

  INSERT INTO public.arena_season_scores (season_id, user_id, best_wave, best_monster_id, runs_count, first_reached_at)
  VALUES (v_season.id, p_user_id, p_wave, p_monster_id, 1, now())
  ON CONFLICT (season_id, user_id) DO UPDATE
    SET
      best_wave = GREATEST(public.arena_season_scores.best_wave, EXCLUDED.best_wave),
      best_monster_id = CASE
        WHEN EXCLUDED.best_wave > public.arena_season_scores.best_wave THEN EXCLUDED.best_monster_id
        ELSE public.arena_season_scores.best_monster_id
      END,
      first_reached_at = CASE
        WHEN EXCLUDED.best_wave > public.arena_season_scores.best_wave THEN now()
        ELSE public.arena_season_scores.first_reached_at
      END,
      runs_count = public.arena_season_scores.runs_count + 1,
      updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END
$$;
REVOKE EXECUTE ON FUNCTION public.record_arena_run_score(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_arena_run_score(uuid, integer, text) TO service_role;

-- =========================================================
-- get_arena_leaderboard: top N for active season
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_arena_leaderboard(_limit integer DEFAULT 100)
RETURNS TABLE(
  rank integer,
  user_id uuid,
  display_name text,
  level integer,
  best_wave integer,
  best_monster_id text,
  runs_count integer,
  first_reached_at timestamptz
)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.arena_seasons;
BEGIN
  v_season := public.current_arena_season();
  RETURN QUERY
  SELECT
    (ROW_NUMBER() OVER (ORDER BY s.best_wave DESC, s.first_reached_at ASC))::int AS rank,
    s.user_id,
    COALESCE(p.display_name, 'Player') AS display_name,
    COALESCE(p.level, 1) AS level,
    s.best_wave,
    s.best_monster_id,
    s.runs_count,
    s.first_reached_at
  FROM public.arena_season_scores s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.season_id = v_season.id AND s.best_wave > 0
  ORDER BY s.best_wave DESC, s.first_reached_at ASC
  LIMIT GREATEST(1, LEAST(_limit, 200));
END
$$;

-- =========================================================
-- get_my_arena_rank: caller's rank in active season
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_my_arena_rank()
RETURNS TABLE(rank integer, best_wave integer, runs_count integer, season_id text, ends_at timestamptz)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_season public.arena_seasons;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  v_season := public.current_arena_season();
  RETURN QUERY
  WITH ranked AS (
    SELECT
      s.user_id,
      s.best_wave,
      s.runs_count,
      (ROW_NUMBER() OVER (ORDER BY s.best_wave DESC, s.first_reached_at ASC))::int AS rnk
    FROM public.arena_season_scores s
    WHERE s.season_id = v_season.id AND s.best_wave > 0
  )
  SELECT r.rnk, r.best_wave, r.runs_count, v_season.id, v_season.ends_at
  FROM ranked r WHERE r.user_id = v_uid;
END
$$;

-- =========================================================
-- roll_arena_season: snapshot prior week, pay rewards, open new season
-- =========================================================
CREATE OR REPLACE FUNCTION public.roll_arena_season()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_prev public.arena_seasons;
  v_rec record;
  v_coins int;
  v_shards int;
BEGIN
  -- Roll over any past seasons that haven't been processed yet.
  FOR v_prev IN
    SELECT * FROM public.arena_seasons
    WHERE ends_at <= v_now AND rolled_over = false
    ORDER BY ends_at ASC
  LOOP
    FOR v_rec IN
      SELECT
        s.user_id,
        (ROW_NUMBER() OVER (ORDER BY s.best_wave DESC, s.first_reached_at ASC))::int AS rnk
      FROM public.arena_season_scores s
      WHERE s.season_id = v_prev.id AND s.best_wave > 0
      ORDER BY s.best_wave DESC, s.first_reached_at ASC
      LIMIT 100
    LOOP
      IF v_rec.rnk = 1 THEN
        v_coins := 5000; v_shards := 500;
      ELSIF v_rec.rnk <= 3 THEN
        v_coins := 2500; v_shards := 250;
      ELSIF v_rec.rnk <= 10 THEN
        v_coins := 1000; v_shards := 100;
      ELSIF v_rec.rnk <= 50 THEN
        v_coins := 300;  v_shards := 30;
      ELSE
        v_coins := 100;  v_shards := 10;
      END IF;

      INSERT INTO public.arena_season_rewards (season_id, user_id, rank, coins, shards)
      VALUES (v_prev.id, v_rec.user_id, v_rec.rnk, v_coins, v_shards)
      ON CONFLICT (season_id, user_id) DO NOTHING;
    END LOOP;

    UPDATE public.arena_seasons SET rolled_over = true WHERE id = v_prev.id;
  END LOOP;

  -- Ensure current season row exists
  PERFORM public.current_arena_season();
END
$$;
REVOKE EXECUTE ON FUNCTION public.roll_arena_season() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.roll_arena_season() TO service_role;

-- =========================================================
-- claim_pending_arena_rewards: credit caller for unclaimed reward rows
-- =========================================================
CREATE OR REPLACE FUNCTION public.claim_pending_arena_rewards()
RETURNS TABLE(season_id text, rank integer, coins integer, shards integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total_coins int := 0;
  v_total_shards int := 0;
  v_rec record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  FOR v_rec IN
    SELECT * FROM public.arena_season_rewards
    WHERE user_id = v_uid AND claimed_at IS NULL
    ORDER BY granted_at ASC
    FOR UPDATE
  LOOP
    v_total_coins  := v_total_coins  + v_rec.coins;
    v_total_shards := v_total_shards + v_rec.shards;
    UPDATE public.arena_season_rewards SET claimed_at = now() WHERE id = v_rec.id;
    season_id := v_rec.season_id;
    rank := v_rec.rank;
    coins := v_rec.coins;
    shards := v_rec.shards;
    RETURN NEXT;
  END LOOP;

  IF v_total_coins > 0 OR v_total_shards > 0 THEN
    UPDATE public.game_state
       SET coins  = LEAST(coins  + v_total_coins,  1000000000),
           shards = LEAST(shards + v_total_shards, 1000000),
           updated_at = now()
     WHERE user_id = v_uid;
  END IF;

  RETURN;
END
$$;
