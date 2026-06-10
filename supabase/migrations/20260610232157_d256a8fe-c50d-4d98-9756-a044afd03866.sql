
CREATE TABLE public.island_landing_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  amount integer NOT NULL,
  label text NOT NULL,
  emoji text NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ilr_user_pending ON public.island_landing_rewards (user_id)
  WHERE claimed_at IS NULL AND expired_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.island_landing_rewards TO authenticated;
GRANT ALL ON public.island_landing_rewards TO service_role;

ALTER TABLE public.island_landing_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own island rewards" ON public.island_landing_rewards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own island rewards" ON public.island_landing_rewards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own island rewards" ON public.island_landing_rewards
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_ilr_updated_at
  BEFORE UPDATE ON public.island_landing_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lock a new pending reward; validates amount against per-kind caps and
-- expires any prior unclaimed row so only one is pending at a time.
CREATE OR REPLACE FUNCTION public.lock_island_landing_reward(
  p_kind text, p_amount integer, p_label text, p_emoji text
)
RETURNS public.island_landing_rewards
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_min int; v_max int;
  v_row public.island_landing_rewards;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_label IS NULL OR length(p_label) > 48 OR p_emoji IS NULL OR length(p_emoji) > 16 THEN
    RAISE EXCEPTION 'bad label/emoji';
  END IF;

  CASE p_kind
    WHEN 'coins_small'   THEN v_min := 50;   v_max := 200;
    WHEN 'coins_med'     THEN v_min := 200;  v_max := 600;
    WHEN 'coins_jackpot' THEN v_min := 1000; v_max := 3500;
    WHEN 'rolls'         THEN v_min := 1;    v_max := 15;
    WHEN 'card_flip'     THEN v_min := 1;    v_max := 3;
    WHEN 'island_star'   THEN v_min := 1;    v_max := 3;
    WHEN 'monster_food'  THEN v_min := 10;   v_max := 100;
    WHEN 'season_xp'     THEN v_min := 1;    v_max := 50;
    ELSE RAISE EXCEPTION 'unknown reward kind: %', p_kind;
  END CASE;

  IF p_amount < v_min OR p_amount > v_max THEN
    RAISE EXCEPTION 'amount % out of range for %', p_amount, p_kind;
  END IF;

  -- Expire any older unclaimed pending row.
  UPDATE public.island_landing_rewards
     SET expired_at = now(), updated_at = now()
   WHERE user_id = v_uid AND claimed_at IS NULL AND expired_at IS NULL;

  INSERT INTO public.island_landing_rewards (user_id, kind, amount, label, emoji)
  VALUES (v_uid, p_kind, p_amount, p_label, p_emoji)
  RETURNING * INTO v_row;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.claim_island_landing_reward(p_id uuid)
RETURNS public.island_landing_rewards
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.island_landing_rewards;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.island_landing_rewards
     SET claimed_at = now(), updated_at = now()
   WHERE id = p_id AND user_id = v_uid
     AND claimed_at IS NULL AND expired_at IS NULL
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'no pending reward to claim'; END IF;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.get_pending_island_landing_reward()
RETURNS public.island_landing_rewards
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.island_landing_rewards
   WHERE user_id = auth.uid()
     AND claimed_at IS NULL AND expired_at IS NULL
   ORDER BY locked_at DESC
   LIMIT 1;
$$;
