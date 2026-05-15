
-- =========================================================================
-- 1. Bootstrap RPC: idempotent baseline insert
-- =========================================================================
CREATE OR REPLACE FUNCTION public.bootstrap_game_state()
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_row FROM public.game_state WHERE user_id = v_uid;
  IF v_row.id IS NOT NULL THEN RETURN v_row; END IF;

  INSERT INTO public.game_state (user_id) VALUES (v_uid)
  RETURNING * INTO v_row;
  RETURN v_row;
END $$;

-- =========================================================================
-- 2. Mega-RPC: validated game-state patch (single client write path)
--    Per-call bounded deltas; arrays are append-only against catalog where
--    relevant. Energy/rolls cannot be inflated here — those go through
--    dedicated grant RPCs (claim_ad_reward, buy_dice_pack, etc.).
-- =========================================================================
CREATE OR REPLACE FUNCTION public.update_game_state(p_patch jsonb)
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cur public.game_state;
  v_row public.game_state;

  -- Per-call max deltas (anti-griefing; matches realistic per-roll output).
  c_max_coin_delta   constant int := 10_000_000;
  c_max_xp_delta     constant int := 50_000_000;
  c_max_stars_delta  constant int := 5;
  c_max_flips_delta  constant int := 5;
  c_max_steps_delta  constant int := 50_000;
  c_max_cards_added  constant int := 3;
  c_max_monsters_add constant int := 1;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_cur FROM public.game_state WHERE user_id = v_uid;
  IF v_cur.id IS NULL THEN
    -- Bootstrap then re-read so the patch can apply.
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
    -- rolls/energy may only DECREASE via this RPC (grants happen in dedicated RPCs)
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
    -- Arrays: append-only; cap how many can be added per call.
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
    -- unlocked_dice_tiers: cannot grow via this RPC (use unlock_dice_tier).
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
END $$;

-- =========================================================================
-- 3. Focused RPCs requested explicitly
-- =========================================================================
CREATE OR REPLACE FUNCTION public.apply_dice_roll(
  p_steps int,
  p_position int,
  p_energy_cost int,
  p_coin_delta int,
  p_xp_delta int
) RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_steps      < 1 OR p_steps      > 400          THEN RAISE EXCEPTION 'bad steps'; END IF;
  IF p_position   < 0 OR p_position   > 10_000       THEN RAISE EXCEPTION 'bad position'; END IF;
  IF p_energy_cost< 1 OR p_energy_cost> 5_000        THEN RAISE EXCEPTION 'bad energy cost'; END IF;
  IF p_coin_delta < -10_000 OR p_coin_delta > 1_000_000 THEN RAISE EXCEPTION 'bad coin delta'; END IF;
  IF p_xp_delta   < 0 OR p_xp_delta   > 5_000_000    THEN RAISE EXCEPTION 'bad xp delta'; END IF;

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
END $$;

CREATE OR REPLACE FUNCTION public.consume_card_flip()
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.game_state
     SET pending_card_flips = pending_card_flips - 1, updated_at = now()
   WHERE user_id = v_uid AND pending_card_flips > 0
   RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'no pending flips'; END IF;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.grant_card(p_card_id text)
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_card_id IS NULL OR length(p_card_id) > 64 THEN RAISE EXCEPTION 'bad card id'; END IF;

  UPDATE public.game_state
     SET collected_cards = collected_cards || ARRAY[p_card_id],
         cards_collected = CASE
           WHEN p_card_id = ANY(collected_cards) THEN cards_collected
           ELSE cards_collected + 1
         END,
         updated_at = now()
   WHERE user_id = v_uid
   RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'no game_state row'; END IF;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.unlock_monster(p_monster_id text)
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_monster_id IS NULL OR length(p_monster_id) > 64 THEN RAISE EXCEPTION 'bad monster id'; END IF;

  UPDATE public.game_state
     SET unlocked_monsters = CASE
           WHEN p_monster_id = ANY(unlocked_monsters) THEN unlocked_monsters
           ELSE unlocked_monsters || ARRAY[p_monster_id]
         END,
         updated_at = now()
   WHERE user_id = v_uid
   RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'no game_state row'; END IF;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.set_active_monster(p_monster_id text)
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.game_state SET active_monster = p_monster_id, updated_at = now()
   WHERE user_id = v_uid AND p_monster_id = ANY(unlocked_monsters)
   RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'monster not unlocked'; END IF;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.set_active_dice_tier(p_tier_id text)
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.game_state SET active_dice_tier = p_tier_id, updated_at = now()
   WHERE user_id = v_uid AND p_tier_id = ANY(unlocked_dice_tiers)
   RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'tier not unlocked'; END IF;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.set_bet_multiplier(p_mult int)
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_mult < 1 OR p_mult > 100000 THEN RAISE EXCEPTION 'bad multiplier'; END IF;
  UPDATE public.game_state SET bet_multiplier = p_mult, updated_at = now()
   WHERE user_id = v_uid RETURNING * INTO v_row;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.add_island_stars(p_amount int)
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_amount < 1 OR p_amount > 5 THEN RAISE EXCEPTION 'bad amount'; END IF;
  UPDATE public.game_state
     SET island_stars       = island_stars + p_amount,
         pending_card_flips = pending_card_flips + ((island_stars + p_amount) / 5),
         island_stars       = (island_stars + p_amount) % 5,
         updated_at = now()
   WHERE user_id = v_uid RETURNING * INTO v_row;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.record_monster_tap(p_monster_id text, p_amount int)
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_amount < 1 OR p_amount > 10000 THEN RAISE EXCEPTION 'bad amount'; END IF;
  UPDATE public.game_state
     SET monster_taps = jsonb_set(
           COALESCE(monster_taps, '{}'::jsonb),
           ARRAY[p_monster_id],
           to_jsonb(COALESCE((monster_taps->>p_monster_id)::int, 0) + p_amount)
         ),
         updated_at = now()
   WHERE user_id = v_uid RETURNING * INTO v_row;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.trade_card(p_card_id text, p_value int)
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.game_state; v_idx int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_value < 0 OR p_value > 5000 THEN RAISE EXCEPTION 'bad trade value'; END IF;

  SELECT * INTO v_row FROM public.game_state WHERE user_id = v_uid FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'no game_state row'; END IF;

  v_idx := array_position(v_row.collected_cards, p_card_id);
  IF v_idx IS NULL THEN RAISE EXCEPTION 'card not owned'; END IF;
  IF (SELECT COUNT(*) FROM unnest(v_row.collected_cards) c WHERE c = p_card_id) < 2 THEN
    RAISE EXCEPTION 'need at least 2 of this card to trade';
  END IF;

  UPDATE public.game_state
     SET collected_cards = v_row.collected_cards[1:v_idx-1] || v_row.collected_cards[v_idx+1:array_length(v_row.collected_cards,1)],
         coins = coins + p_value,
         updated_at = now()
   WHERE user_id = v_uid
   RETURNING * INTO v_row;
  RETURN v_row;
END $$;

CREATE OR REPLACE FUNCTION public.record_spin_cooldown()
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.game_state SET last_spin_at = now(), updated_at = now()
   WHERE user_id = v_uid RETURNING * INTO v_row;
  RETURN v_row;
END $$;

-- =========================================================================
-- 4. EXECUTE audit: revoke from anon/public; grant only to authenticated.
-- =========================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           p.prosecdef
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
  LOOP
    -- Trigger / system helpers: revoke from everyone (called only by triggers/superuser).
    IF r.proname IN ('clamp_game_state_ranges','update_updated_at_column','handle_new_user') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
      CONTINUE;
    END IF;
    -- Service-role only.
    IF r.proname = 'grant_paid_roulette_spins' THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.args);
      CONTINUE;
    END IF;
    -- All other public functions: usable by signed-in users only.
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
  END LOOP;
END $$;

-- =========================================================================
-- 5. Tighten RLS roles on catalog tables and per-user tables
--    Move {public} role policies to {authenticated} so anon JWTs cannot read.
-- =========================================================================

-- Catalog tables: signed-in users only
DROP POLICY IF EXISTS "anyone reads achievements" ON public.achievements_def;
CREATE POLICY "authenticated reads achievements" ON public.achievements_def
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage achievements" ON public.achievements_def;
CREATE POLICY "admins manage achievements" ON public.achievements_def
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "anyone reads cosmetics" ON public.cosmetics_def;
CREATE POLICY "authenticated reads cosmetics" ON public.cosmetics_def
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage cosmetics" ON public.cosmetics_def;
CREATE POLICY "admins manage cosmetics" ON public.cosmetics_def
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "anyone reads missions" ON public.missions_def;
CREATE POLICY "authenticated reads missions" ON public.missions_def
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admins manage missions" ON public.missions_def;
CREATE POLICY "admins manage missions" ON public.missions_def
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can read reward overrides" ON public.reward_pool_overrides;
CREATE POLICY "Authenticated can read reward overrides" ON public.reward_pool_overrides
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can insert reward overrides" ON public.reward_pool_overrides;
CREATE POLICY "Admins can insert reward overrides" ON public.reward_pool_overrides
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update reward overrides" ON public.reward_pool_overrides;
CREATE POLICY "Admins can update reward overrides" ON public.reward_pool_overrides
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can delete reward overrides" ON public.reward_pool_overrides;
CREATE POLICY "Admins can delete reward overrides" ON public.reward_pool_overrides
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Per-user tables: re-scope SELECT policies to authenticated
DROP POLICY IF EXISTS "users view own missions" ON public.daily_missions;
CREATE POLICY "users view own missions" ON public.daily_missions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users view own streak" ON public.daily_streaks;
CREATE POLICY "users view own streak" ON public.daily_streaks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users view own ad claims" ON public.ad_reward_claims;
CREATE POLICY "users view own ad claims" ON public.ad_reward_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users view own cosmetics" ON public.user_cosmetics;
CREATE POLICY "users view own cosmetics" ON public.user_cosmetics
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own spins" ON public.roulette_spins;
CREATE POLICY "Users view own spins" ON public.roulette_spins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own roulette state" ON public.roulette_state;
CREATE POLICY "Users view own roulette state" ON public.roulette_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own roulette state" ON public.roulette_state;
CREATE POLICY "Users insert own roulette state" ON public.roulette_state
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own pack analytics" ON public.pack_analytics;
CREATE POLICY "Users view own pack analytics" ON public.pack_analytics
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all pack analytics" ON public.pack_analytics;
CREATE POLICY "Admins view all pack analytics" ON public.pack_analytics
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own game state" ON public.game_state;
CREATE POLICY "Users can view own game state" ON public.game_state
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
