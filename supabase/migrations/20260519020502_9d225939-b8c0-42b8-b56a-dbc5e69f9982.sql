CREATE OR REPLACE FUNCTION public.claim_daily_streak()
RETURNS TABLE(current_streak int, best_streak int, reward_coins int, reward_rolls int, reward_energy int, already_claimed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_today date := (now() at time zone 'utc')::date;
  v_row public.daily_streaks;
  v_new_streak int;
  v_coins int := 0;
  v_rolls int := 0;
  v_energy int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_row FROM public.daily_streaks WHERE user_id = v_uid;

  IF v_row.user_id IS NOT NULL AND v_row.updated_at > v_now - interval '24 hours' THEN
    RETURN QUERY SELECT v_row.current_streak, v_row.best_streak, 0, 0, 0, true;
    RETURN;
  END IF;

  IF v_row.user_id IS NULL THEN
    v_new_streak := 1;
  ELSIF v_row.updated_at > v_now - interval '48 hours' THEN
    v_new_streak := v_row.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  v_coins := 50 + LEAST(v_new_streak, 30) * 10;
  IF v_new_streak % 3 = 0 THEN v_rolls := 2; END IF;
  IF v_new_streak % 7 = 0 THEN v_energy := 50; v_rolls := v_rolls + 3; END IF;

  INSERT INTO public.daily_streaks (user_id, current_streak, best_streak, last_claim_date, total_claims, updated_at)
  VALUES (v_uid, v_new_streak, v_new_streak, v_today, 1, v_now)
  ON CONFLICT (user_id) DO UPDATE
    SET current_streak = v_new_streak,
        best_streak = GREATEST(public.daily_streaks.best_streak, v_new_streak),
        last_claim_date = v_today,
        total_claims = public.daily_streaks.total_claims + 1,
        updated_at = v_now;

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

REVOKE EXECUTE ON FUNCTION public.claim_daily_streak() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_streak() TO authenticated;