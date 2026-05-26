
-- =========================================
-- Phase 4A: Battle system tables
-- =========================================

-- 1. Monster combat stats definition (server-authoritative)
CREATE TABLE public.monster_stats_def (
  monster_id text PRIMARY KEY,
  base_hp int NOT NULL DEFAULT 100,
  base_atk int NOT NULL DEFAULT 15,
  base_def int NOT NULL DEFAULT 10,
  base_spd int NOT NULL DEFAULT 10,
  signature_move_name text NOT NULL DEFAULT 'Power Strike',
  signature_move_desc text NOT NULL DEFAULT '1.5x attack damage',
  signature_multiplier numeric NOT NULL DEFAULT 1.5,
  rarity text NOT NULL DEFAULT 'common',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monster_stats_def ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated reads monster stats"
  ON public.monster_stats_def FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins manage monster stats"
  ON public.monster_stats_def FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Battles table
CREATE TABLE public.battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('pve','arena','pvp')),
  attacker_monster jsonb NOT NULL,
  defender_monster jsonb NOT NULL,
  winner text CHECK (winner IN ('attacker','defender','draw')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','ended')),
  current_turn int NOT NULL DEFAULT 1,
  attacker_hp int NOT NULL,
  defender_hp int NOT NULL,
  attacker_special_cd int NOT NULL DEFAULT 0,
  defender_special_cd int NOT NULL DEFAULT 0,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  rewards jsonb,
  arena_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX idx_battles_user ON public.battles(user_id, created_at DESC);
CREATE INDEX idx_battles_arena_run ON public.battles(arena_run_id);

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own battles"
  ON public.battles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "service role manages battles"
  ON public.battles FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Arena runs
CREATE TABLE public.arena_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  monster_id text NOT NULL,
  monster_level int NOT NULL DEFAULT 1,
  monster_rarity text NOT NULL DEFAULT 'common',
  current_hp int NOT NULL,
  max_hp int NOT NULL,
  wave int NOT NULL DEFAULT 1,
  best_wave int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','choosing','ended')),
  atk_buff_pct int NOT NULL DEFAULT 0,
  coins_earned int NOT NULL DEFAULT 0,
  shards_earned int NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

CREATE INDEX idx_arena_runs_user_status ON public.arena_runs(user_id, status);
CREATE INDEX idx_arena_runs_best ON public.arena_runs(best_wave DESC);

ALTER TABLE public.arena_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own arena runs"
  ON public.arena_runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "anyone reads arena leaderboard summary"
  ON public.arena_runs FOR SELECT
  TO authenticated
  USING (status = 'ended');

CREATE POLICY "service role manages arena runs"
  ON public.arena_runs FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. PvP defense teams
CREATE TABLE public.pvp_defense_teams (
  user_id uuid PRIMARY KEY,
  monster_id text NOT NULL,
  monster_level int NOT NULL DEFAULT 1,
  monster_rarity text NOT NULL DEFAULT 'common',
  power int NOT NULL DEFAULT 0,
  wins int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  rating int NOT NULL DEFAULT 1000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pvp_defense_power ON public.pvp_defense_teams(power);
CREATE INDEX idx_pvp_defense_rating ON public.pvp_defense_teams(rating DESC);

ALTER TABLE public.pvp_defense_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads pvp defense teams"
  ON public.pvp_defense_teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users set own defense team"
  ON public.pvp_defense_teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own defense team"
  ON public.pvp_defense_teams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service role manages pvp"
  ON public.pvp_defense_teams FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 5. Seed monster_stats_def for all 9 existing monsters
INSERT INTO public.monster_stats_def (monster_id, base_hp, base_atk, base_def, base_spd, signature_move_name, signature_move_desc, signature_multiplier, rarity) VALUES
  ('gobby',        100, 15, 10, 12, 'Power Strike',   '1.5x attack damage',                                  1.5, 'common'),
  ('mossfang',     110, 18, 12, 11, 'Quick Slash',    'Hits twice for 0.8x each',                            1.6, 'rare'),
  ('fluffina',     105, 17, 14, 14, 'Quick Slash',    'Hits twice for 0.8x each',                            1.6, 'rare'),
  ('drako',        115, 20, 12, 13, 'Quick Slash',    'Hits twice for 0.8x each',                            1.6, 'rare'),
  ('vexor',        130, 24, 16, 10, 'Crushing Blow',  '2x attack, ignores 50% defense',                      2.0, 'epic'),
  ('cyclops',      140, 26, 18,  9, 'Crushing Blow',  '2x attack, ignores 50% defense',                      2.0, 'epic'),
  ('tidecaller',   135, 25, 17, 11, 'Crushing Blow',  '2x attack, ignores 50% defense',                      2.0, 'epic'),
  ('shadowfiend',  170, 32, 22, 12, 'Cataclysm',      '2.5x attack + 20% bleed for 2 turns',                 2.5, 'legendary'),
  ('aurorix',      165, 30, 24, 14, 'Cataclysm',      '2.5x attack + 20% bleed for 2 turns',                 2.5, 'legendary');

-- 6. Add shards column to game_state if not present (Phase 2 may not be applied yet)
ALTER TABLE public.game_state
  ADD COLUMN IF NOT EXISTS shards int NOT NULL DEFAULT 0;

-- 7. Helper: grant battle rewards (coins + shards + xp)
CREATE OR REPLACE FUNCTION public.grant_battle_rewards(p_user_id uuid, p_coins int, p_shards int, p_xp int)
RETURNS public.game_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.game_state;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'only service role may grant battle rewards';
  END IF;
  IF p_coins < 0 OR p_shards < 0 OR p_xp < 0 THEN
    RAISE EXCEPTION 'amounts must be non-negative';
  END IF;
  UPDATE public.game_state
     SET coins  = LEAST(coins  + p_coins,  1000000000),
         shards = LEAST(shards + p_shards, 1000000),
         xp     = LEAST(xp     + p_xp,     2000000000),
         updated_at = now()
   WHERE user_id = p_user_id
  RETURNING * INTO v_row;
  RETURN v_row;
END
$$;
