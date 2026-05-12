-- Daily missions: catalog + per-user per-day rows + RPCs

CREATE TABLE IF NOT EXISTS public.missions_def (
  code text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  target int NOT NULL DEFAULT 1,
  reward_kind text NOT NULL,
  reward_amount int NOT NULL DEFAULT 0,
  weight int NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.missions_def ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads missions" ON public.missions_def FOR SELECT USING (true);
CREATE POLICY "admins manage missions" ON public.missions_def FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.daily_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_date date NOT NULL,
  code text NOT NULL,
  target int NOT NULL,
  progress int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_date, code)
);

CREATE INDEX IF NOT EXISTS idx_daily_missions_user_date
  ON public.daily_missions (user_id, mission_date);

ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own missions" ON public.daily_missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own missions" ON public.daily_missions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own missions" ON public.daily_missions FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_daily_missions_updated
  BEFORE UPDATE ON public.daily_missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed catalog
INSERT INTO public.missions_def (code, title, description, target, reward_kind, reward_amount, weight) VALUES
  ('roll_10',     'Warming Up',       'Roll the dice 10 times today',       10,  'coins',  100, 3),
  ('roll_30',     'On a Roll',        'Roll the dice 30 times today',       30,  'rolls',    3, 2),
  ('coins_500',   'Coin Hunter',      'Earn 500 coins today',              500,  'rolls',    2, 3),
  ('coins_2000',  'Treasure Day',     'Earn 2000 coins today',            2000,  'energy',  50, 1),
  ('crit_3',      'Sharpshooter',     'Land 3 critical hits today',          3,  'coins',  150, 2),
  ('cards_2',     'Card Collector',   'Draw 2 new cards today',              2,  'coins',  120, 2),
  ('pack_1',      'Pack Opener',      'Open 1 card pack today',              1,  'coins',  100, 2),
  ('levelup_1',   'Climbing',         'Level up at least once today',        1,  'energy',  30, 2),
  ('roulette_1',  'Spin to Win',      'Spin the lucky roulette today',       1,  'coins',   80, 3),
  ('login',       'Daily Drop-In',    'Open the game today',                 1,  'coins',   50, 4)
ON CONFLICT (code) DO NOTHING;

-- RPC: fetch today's missions, rolling 3 deterministically if absent
CREATE OR REPLACE FUNCTION public.get_or_roll_daily_missions()
RETURNS SETOF public.daily_missions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_count int;
  v_seed bigint;
  v_pick record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT COUNT(*) INTO v_count FROM public.daily_missions
   WHERE user_id = v_uid AND mission_date = v_today;

  IF v_count = 0 THEN
    -- Deterministic seed per user/day
    v_seed := abs(('x' || substr(md5(v_uid::text || v_today::text), 1, 8))::bit(32)::int);

    FOR v_pick IN
      SELECT code, target FROM public.missions_def
       WHERE enabled
       ORDER BY md5(code || v_seed::text)
       LIMIT 3
    LOOP
      INSERT INTO public.daily_missions (user_id, mission_date, code, target)
      VALUES (v_uid, v_today, v_pick.code, v_pick.target)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN QUERY
    SELECT * FROM public.daily_missions
     WHERE user_id = v_uid AND mission_date = v_today;
END
$$;

-- RPC: claim a completed mission
CREATE OR REPLACE FUNCTION public.claim_mission(p_code text)
RETURNS TABLE(reward_kind text, reward_amount int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_dm public.daily_missions;
  v_def public.missions_def;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_dm FROM public.daily_missions
   WHERE user_id = v_uid AND mission_date = v_today AND code = p_code;
  IF v_dm.id IS NULL THEN RAISE EXCEPTION 'mission not assigned today'; END IF;
  IF v_dm.claimed_at IS NOT NULL THEN RAISE EXCEPTION 'already claimed'; END IF;
  IF v_dm.progress < v_dm.target THEN RAISE EXCEPTION 'mission not complete'; END IF;

  SELECT * INTO v_def FROM public.missions_def WHERE code = p_code;
  IF v_def.code IS NULL THEN RAISE EXCEPTION 'unknown mission'; END IF;

  UPDATE public.daily_missions
     SET claimed_at = now(),
         completed_at = COALESCE(completed_at, now()),
         updated_at = now()
   WHERE id = v_dm.id;

  IF v_def.reward_kind = 'coins' THEN
    UPDATE public.game_state SET coins = LEAST(coins + v_def.reward_amount, 1000000000), updated_at = now() WHERE user_id = v_uid;
  ELSIF v_def.reward_kind = 'rolls' THEN
    UPDATE public.game_state SET rolls = LEAST(rolls + v_def.reward_amount, 1000000), updated_at = now() WHERE user_id = v_uid;
  ELSIF v_def.reward_kind = 'energy' THEN
    UPDATE public.game_state SET energy = LEAST(energy + v_def.reward_amount, 1000000), updated_at = now() WHERE user_id = v_uid;
  END IF;

  RETURN QUERY SELECT v_def.reward_kind, v_def.reward_amount;
END
$$;

-- RPC: bump progress on today's missions matching a code
CREATE OR REPLACE FUNCTION public.bump_mission_progress(p_code text, p_delta int DEFAULT 1)
RETURNS public.daily_missions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_row public.daily_missions;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_delta <= 0 THEN RAISE EXCEPTION 'delta must be positive'; END IF;

  UPDATE public.daily_missions
     SET progress = LEAST(progress + p_delta, target),
         completed_at = CASE
           WHEN completed_at IS NULL AND (progress + p_delta) >= target THEN now()
           ELSE completed_at
         END,
         updated_at = now()
   WHERE user_id = v_uid
     AND mission_date = v_today
     AND code = p_code
     AND claimed_at IS NULL
  RETURNING * INTO v_row;

  RETURN v_row;
END
$$;