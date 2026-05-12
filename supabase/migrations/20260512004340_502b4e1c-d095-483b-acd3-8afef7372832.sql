-- Daily login streaks
CREATE TABLE public.daily_streaks (
  user_id uuid PRIMARY KEY,
  current_streak int NOT NULL DEFAULT 0,
  best_streak int NOT NULL DEFAULT 0,
  last_claim_date date,
  total_claims int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own streak" ON public.daily_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service role manages streaks" ON public.daily_streaks FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Achievements catalog (admin-curated)
CREATE TABLE public.achievements_def (
  code text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  target int NOT NULL DEFAULT 1,
  reward_kind text NOT NULL,
  reward_amount int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.achievements_def ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads achievements" ON public.achievements_def FOR SELECT USING (true);
CREATE POLICY "admins manage achievements" ON public.achievements_def FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  progress int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own achievements" ON public.user_achievements FOR UPDATE USING (auth.uid() = user_id);

-- Ad reward claim log (used for cooldown + cap enforcement)
CREATE TABLE public.ad_reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_kind text NOT NULL,
  amount int NOT NULL DEFAULT 0,
  claimed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_reward_claims_user_kind_time ON public.ad_reward_claims(user_id, reward_kind, claimed_at DESC);
ALTER TABLE public.ad_reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own ad claims" ON public.ad_reward_claims FOR SELECT USING (auth.uid() = user_id);

-- Daily streak claim RPC (idempotent per day)
CREATE OR REPLACE FUNCTION public.claim_daily_streak()
RETURNS TABLE(current_streak int, best_streak int, reward_coins int, reward_rolls int, reward_energy int, already_claimed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_row public.daily_streaks;
  v_new_streak int;
  v_coins int := 0;
  v_rolls int := 0;
  v_energy int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_row FROM public.daily_streaks WHERE user_id = v_uid;

  IF v_row.user_id IS NOT NULL AND v_row.last_claim_date = v_today THEN
    RETURN QUERY SELECT v_row.current_streak, v_row.best_streak, 0, 0, 0, true;
    RETURN;
  END IF;

  IF v_row.user_id IS NULL THEN
    v_new_streak := 1;
  ELSIF v_row.last_claim_date = v_today - 1 THEN
    v_new_streak := v_row.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  -- Reward ladder
  v_coins := 50 + LEAST(v_new_streak, 30) * 10;
  IF v_new_streak % 3 = 0 THEN v_rolls := 2; END IF;
  IF v_new_streak % 7 = 0 THEN v_energy := 50; v_rolls := v_rolls + 3; END IF;

  INSERT INTO public.daily_streaks (user_id, current_streak, best_streak, last_claim_date, total_claims)
  VALUES (v_uid, v_new_streak, v_new_streak, v_today, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = v_new_streak,
        best_streak = GREATEST(public.daily_streaks.best_streak, v_new_streak),
        last_claim_date = v_today,
        total_claims = public.daily_streaks.total_claims + 1,
        updated_at = now();

  -- Grant rewards
  UPDATE public.game_state
     SET coins = LEAST(coins + v_coins, 1000000000),
         rolls = LEAST(rolls + v_rolls, 1000000),
         energy = LEAST(energy + v_energy, 1000000),
         updated_at = now()
   WHERE user_id = v_uid;

  RETURN QUERY SELECT
    v_new_streak,
    GREATEST(COALESCE(v_row.best_streak, 0), v_new_streak),
    v_coins, v_rolls, v_energy, false;
END
$$;

-- Achievement claim RPC
CREATE OR REPLACE FUNCTION public.claim_achievement(p_code text)
RETURNS TABLE(reward_kind text, reward_amount int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_def public.achievements_def;
  v_ua public.user_achievements;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_def FROM public.achievements_def WHERE code = p_code AND enabled;
  IF v_def.code IS NULL THEN RAISE EXCEPTION 'unknown achievement'; END IF;

  SELECT * INTO v_ua FROM public.user_achievements WHERE user_id = v_uid AND code = p_code;
  IF v_ua.id IS NULL OR v_ua.completed_at IS NULL THEN RAISE EXCEPTION 'achievement not completed'; END IF;
  IF v_ua.claimed_at IS NOT NULL THEN RAISE EXCEPTION 'already claimed'; END IF;

  UPDATE public.user_achievements SET claimed_at = now(), updated_at = now()
   WHERE id = v_ua.id;

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

-- Ad reward claim RPC (server-enforced cooldown + cap)
CREATE OR REPLACE FUNCTION public.claim_ad_reward(p_kind text)
RETURNS TABLE(reward_kind text, amount int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_amount int;
  v_cooldown_ms bigint;
  v_daily_cap int;
  v_today_count int;
  v_last_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  CASE p_kind
    WHEN 'energy_50'   THEN v_amount := 50;  v_cooldown_ms := 30 * 60 * 1000; v_daily_cap := 6;
    WHEN 'coins_200'   THEN v_amount := 200; v_cooldown_ms := 30 * 60 * 1000; v_daily_cap := 6;
    WHEN 'roulette_spin' THEN v_amount := 1; v_cooldown_ms := 24 * 60 * 60 * 1000; v_daily_cap := 1;
    WHEN 'card_pack'   THEN v_amount := 1;   v_cooldown_ms := 24 * 60 * 60 * 1000; v_daily_cap := 1;
    ELSE RAISE EXCEPTION 'unknown reward kind: %', p_kind;
  END CASE;

  SELECT MAX(claimed_at) INTO v_last_at FROM public.ad_reward_claims
    WHERE user_id = v_uid AND reward_kind = p_kind;
  IF v_last_at IS NOT NULL AND (extract(epoch FROM (now() - v_last_at)) * 1000) < v_cooldown_ms THEN
    RAISE EXCEPTION 'cooldown active';
  END IF;

  SELECT COUNT(*) INTO v_today_count FROM public.ad_reward_claims
    WHERE user_id = v_uid AND reward_kind = p_kind
      AND claimed_at >= (now() at time zone 'utc')::date;
  IF v_today_count >= v_daily_cap THEN RAISE EXCEPTION 'daily cap reached'; END IF;

  -- Grant
  IF p_kind = 'energy_50' THEN
    UPDATE public.game_state SET energy = LEAST(energy + v_amount, 1000000), updated_at = now() WHERE user_id = v_uid;
  ELSIF p_kind = 'coins_200' THEN
    UPDATE public.game_state SET coins = LEAST(coins + v_amount, 1000000000), updated_at = now() WHERE user_id = v_uid;
  ELSIF p_kind = 'roulette_spin' THEN
    INSERT INTO public.roulette_state (user_id, paid_spin_credits) VALUES (v_uid, 1)
    ON CONFLICT (user_id) DO UPDATE SET paid_spin_credits = public.roulette_state.paid_spin_credits + 1, updated_at = now();
  ELSIF p_kind = 'card_pack' THEN
    UPDATE public.game_state SET pending_card_flips = LEAST(pending_card_flips + 1, 10000), updated_at = now() WHERE user_id = v_uid;
  END IF;

  INSERT INTO public.ad_reward_claims (user_id, reward_kind, amount) VALUES (v_uid, p_kind, v_amount);

  RETURN QUERY SELECT p_kind, v_amount;
END
$$;

-- Get last claim per kind for client-side cooldown UI
CREATE OR REPLACE FUNCTION public.get_ad_reward_status()
RETURNS TABLE(reward_kind text, last_claim_at timestamptz, today_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT reward_kind,
         MAX(claimed_at) AS last_claim_at,
         COUNT(*) FILTER (WHERE claimed_at >= (now() at time zone 'utc')::date)::int AS today_count
    FROM public.ad_reward_claims
   WHERE user_id = auth.uid()
   GROUP BY reward_kind;
$$;

-- Seed achievements
INSERT INTO public.achievements_def (code, title, description, target, reward_kind, reward_amount, sort_order) VALUES
  ('first_roll', 'First Roll', 'Roll the dice for the first time', 1, 'coins', 50, 10),
  ('rolls_100', 'Getting Started', 'Roll the dice 100 times', 100, 'coins', 200, 20),
  ('rolls_1000', 'Dice Veteran', 'Roll the dice 1,000 times', 1000, 'coins', 2000, 30),
  ('cards_5', 'Collector I', 'Collect 5 unique cards', 5, 'coins', 100, 40),
  ('cards_25', 'Collector II', 'Collect 25 unique cards', 25, 'rolls', 25, 50),
  ('cards_100', 'Master Collector', 'Collect 100 unique cards', 100, 'coins', 5000, 60),
  ('level_5', 'Apprentice', 'Reach level 5', 5, 'coins', 250, 70),
  ('level_25', 'Adept', 'Reach level 25', 25, 'rolls', 50, 80),
  ('level_50', 'Master', 'Reach level 50', 50, 'energy', 200, 90),
  ('streak_7', 'Loyal Roller', 'Maintain a 7-day login streak', 7, 'coins', 1000, 100),
  ('streak_30', 'Dedicated', 'Maintain a 30-day login streak', 30, 'rolls', 100, 110),
  ('coins_10k', 'Money Maker', 'Earn 10,000 coins (lifetime)', 10000, 'coins', 1000, 120);

CREATE TRIGGER trg_user_achievements_updated_at BEFORE UPDATE ON public.user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_daily_streaks_updated_at BEFORE UPDATE ON public.daily_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();