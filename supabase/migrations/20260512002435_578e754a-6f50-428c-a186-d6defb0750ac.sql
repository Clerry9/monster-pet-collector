
ALTER TABLE public.roulette_state
  ADD COLUMN IF NOT EXISTS paid_spin_credits integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.consume_paid_roulette_spin()
RETURNS public.roulette_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.roulette_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  UPDATE public.roulette_state
     SET paid_spin_credits = paid_spin_credits - 1,
         updated_at = now()
   WHERE user_id = v_uid
     AND paid_spin_credits > 0
  RETURNING * INTO v_row;

  IF v_row.user_id IS NULL THEN
    RAISE EXCEPTION 'no paid spin credits available';
  END IF;

  RETURN v_row;
END
$$;

CREATE OR REPLACE FUNCTION public.grant_paid_roulette_spins(p_user_id uuid, p_amount integer)
RETURNS public.roulette_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.roulette_state;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'only service role may grant paid spins';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  INSERT INTO public.roulette_state (user_id, paid_spin_credits)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET paid_spin_credits = public.roulette_state.paid_spin_credits + EXCLUDED.paid_spin_credits,
        updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END
$$;
