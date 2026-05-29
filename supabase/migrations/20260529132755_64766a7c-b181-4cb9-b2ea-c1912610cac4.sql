CREATE OR REPLACE FUNCTION public.use_energy_tonic()
RETURNS game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.game_state;
  v_inv public.user_power_ups;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  UPDATE public.user_power_ups
     SET quantity = quantity - 1, updated_at = now()
   WHERE user_id = v_uid AND power_up_id = 'board_energy_tonic' AND quantity > 0
  RETURNING * INTO v_inv;
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'no energy tonic available'; END IF;

  UPDATE public.game_state
     SET energy = LEAST(energy + 100, 1000000),
         energy_updated_at = now(),
         updated_at = now()
   WHERE user_id = v_uid
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;