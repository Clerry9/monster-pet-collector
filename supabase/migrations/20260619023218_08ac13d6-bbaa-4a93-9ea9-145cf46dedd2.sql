
CREATE OR REPLACE FUNCTION public.update_game_state(p_patch jsonb)
 RETURNS game_state
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_cur public.game_state;
  v_row public.game_state;

  -- Per-call max deltas (anti-griefing; tightened to realistic single-roll output).
  c_max_coin_delta   constant int := 100_000;
  c_max_xp_delta     constant int := 500_000;
  c_max_stars_delta  constant int := 5;
  c_max_flips_delta  constant int := 5;
  c_max_steps_delta  constant int := 5_000;
  c_max_cards_added  constant int := 3;
  c_max_monsters_add constant int := 1;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_cur FROM public.game_state WHERE user_id = v_uid;
  IF v_cur.id IS NULL THEN
    PERFORM public.bootstrap_game_state();
    SELECT * INTO v_cur FROM public.game_state WHERE user_id = v_uid;
  END IF;

  UPDATE public.game_state SET
    coins = LEAST(
      GREATEST(COALESCE((p_patch->>'coins')::int, v_cur.coins), 0),
      v_cur.coins + c_max_coin_delta
    ),
    xp = LEAST(
      GREATEST(COALESCE((p_patch->>'xp')::int, v_cur.xp), v_cur.xp),
      v_cur.xp + c_max_xp_delta
    ),
    level = LEAST(
      GREATEST(COALESCE((p_patch->>'level')::int, v_cur.level), v_cur.level),
      v_cur.level + 5
    ),
    rolls  = LEAST(GREATEST(COALESCE((p_patch->>'rolls')::int,  v_cur.rolls),  0), v_cur.rolls),
    energy = LEAST(GREATEST(COALESCE((p_patch->>'energy')::int, v_cur.energy), 0), v_cur.energy),
    energy_updated_at = COALESCE((p_patch->>'energy_updated_at')::timestamptz, v_cur.energy_updated_at),
    island_stars = LEAST(
      GREATEST(COALESCE((p_patch->>'island_stars')::int, v_cur.island_stars), 0),
      v_cur.island_stars + c_max_stars_delta
    ),
    pending_card_flips = LEAST(
      GREATEST(COALESCE((p_patch->>'pending_card_flips')::int, v_cur.pending_card_flips), 0),
      v_cur.pending_card_flips + c_max_flips_delta
    ),
    total_steps = LEAST(
      GREATEST(COALESCE((p_patch->>'total_steps')::int, v_cur.total_steps), v_cur.total_steps),
      v_cur.total_steps + c_max_steps_delta
    ),
    cards_collected = GREATEST(
      LEAST(COALESCE((p_patch->>'cards_collected')::int, v_cur.cards_collected), v_cur.cards_collected + c_max_cards_added),
      v_cur.cards_collected
    ),
    bet_multiplier = LEAST(GREATEST(COALESCE((p_patch->>'bet_multiplier')::int, v_cur.bet_multiplier), 1), 100000),
    position = GREATEST(COALESCE((p_patch->>'position')::int, v_cur.position), 0),
    last_spin_at = GREATEST(
      COALESCE((p_patch->>'last_spin_at')::timestamptz, v_cur.last_spin_at),
      v_cur.last_spin_at
    ),
    collected_cards = (
      SELECT array_agg(c) FROM (
        SELECT DISTINCT unnest(v_cur.collected_cards || COALESCE(
          ARRAY(SELECT jsonb_array_elements_text(p_patch->'collected_cards')),
          v_cur.collected_cards
        )) AS c
      ) x
      WHERE true
    ),
    unlocked_monsters = (
      WITH new_set AS (
        SELECT DISTINCT m FROM unnest(
          v_cur.unlocked_monsters || COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(p_patch->'unlocked_monsters')),
            v_cur.unlocked_monsters
          )
        ) AS m
      ),
      added AS (
        SELECT m FROM new_set WHERE m <> ALL (v_cur.unlocked_monsters)
      )
      SELECT CASE
        WHEN (SELECT COUNT(*) FROM added) > c_max_monsters_add
          THEN v_cur.unlocked_monsters
        ELSE (SELECT array_agg(m) FROM new_set)
      END
    ),
    unlocked_dice_tiers = v_cur.unlocked_dice_tiers,
    active_dice_tier = CASE
      WHEN p_patch ? 'active_dice_tier'
        AND (p_patch->>'active_dice_tier') = ANY(v_cur.unlocked_dice_tiers)
      THEN p_patch->>'active_dice_tier'
      ELSE v_cur.active_dice_tier
    END,
    active_monster = CASE
      WHEN p_patch ? 'active_monster'
        AND (p_patch->>'active_monster') = ANY(v_cur.unlocked_monsters)
      THEN p_patch->>'active_monster'
      ELSE v_cur.active_monster
    END,
    monster_taps = COALESCE(p_patch->'monster_taps', v_cur.monster_taps),
    equipped_cosmetics = COALESCE(p_patch->'equipped_cosmetics', v_cur.equipped_cosmetics),
    updated_at = now()
  WHERE user_id = v_uid
  RETURNING * INTO v_row;

  RETURN v_row;
END $function$;

CREATE OR REPLACE FUNCTION public.apply_dice_roll(p_steps integer, p_position integer, p_energy_cost integer, p_coin_delta integer, p_xp_delta integer)
 RETURNS game_state
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_steps      < 1 OR p_steps      > 400          THEN RAISE EXCEPTION 'bad steps'; END IF;
  IF p_position   < 0 OR p_position   > 10000        THEN RAISE EXCEPTION 'bad position'; END IF;
  IF p_energy_cost< 1 OR p_energy_cost> 5000         THEN RAISE EXCEPTION 'bad energy cost'; END IF;
  IF p_coin_delta < -10000 OR p_coin_delta > 100000  THEN RAISE EXCEPTION 'bad coin delta'; END IF;
  IF p_xp_delta   < 0 OR p_xp_delta   > 500000       THEN RAISE EXCEPTION 'bad xp delta'; END IF;

  UPDATE public.game_state
     SET energy      = GREATEST(0, energy - p_energy_cost),
         coins       = GREATEST(0, coins + p_coin_delta),
         xp          = xp + p_xp_delta,
         position    = p_position,
         total_steps = total_steps + p_steps,
         last_spin_at= now(),
         updated_at  = now()
   WHERE user_id = v_uid
     AND energy >= p_energy_cost
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'insufficient energy'; END IF;
  RETURN v_row;
END $function$;
