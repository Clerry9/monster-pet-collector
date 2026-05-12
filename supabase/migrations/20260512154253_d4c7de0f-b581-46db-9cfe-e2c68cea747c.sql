
-- Catalog
CREATE TABLE public.cosmetics_def (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('island_theme','monster_glow','dice_skin')),
  name text NOT NULL,
  description text,
  price_coins integer NOT NULL DEFAULT 0,
  rarity text NOT NULL DEFAULT 'common',
  preview_color text,
  asset_key text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cosmetics_def ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads cosmetics" ON public.cosmetics_def FOR SELECT USING (true);
CREATE POLICY "admins manage cosmetics" ON public.cosmetics_def FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ownership
CREATE TABLE public.user_cosmetics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cosmetic_id text NOT NULL REFERENCES public.cosmetics_def(id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cosmetic_id)
);
ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own cosmetics" ON public.user_cosmetics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "service role manages user cosmetics" ON public.user_cosmetics FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Equipped
ALTER TABLE public.game_state
  ADD COLUMN IF NOT EXISTS equipped_cosmetics jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Buy
CREATE OR REPLACE FUNCTION public.buy_cosmetic(p_cosmetic_id text)
RETURNS public.user_cosmetics
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_def public.cosmetics_def;
  v_owned boolean;
  v_row public.user_cosmetics;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_def FROM public.cosmetics_def WHERE id = p_cosmetic_id AND enabled;
  IF v_def.id IS NULL THEN RAISE EXCEPTION 'unknown cosmetic'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_cosmetics WHERE user_id = v_uid AND cosmetic_id = p_cosmetic_id) INTO v_owned;
  IF v_owned THEN RAISE EXCEPTION 'already owned'; END IF;

  UPDATE public.game_state SET coins = coins - v_def.price_coins, updated_at = now()
   WHERE user_id = v_uid AND coins >= v_def.price_coins;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient coins'; END IF;

  INSERT INTO public.user_cosmetics (user_id, cosmetic_id) VALUES (v_uid, p_cosmetic_id)
  RETURNING * INTO v_row;
  RETURN v_row;
END
$$;

-- Equip
CREATE OR REPLACE FUNCTION public.equip_cosmetic(p_cosmetic_id text)
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_def public.cosmetics_def;
  v_owned boolean;
  v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_def FROM public.cosmetics_def WHERE id = p_cosmetic_id;
  IF v_def.id IS NULL THEN RAISE EXCEPTION 'unknown cosmetic'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.user_cosmetics WHERE user_id = v_uid AND cosmetic_id = p_cosmetic_id) INTO v_owned;
  IF NOT v_owned THEN RAISE EXCEPTION 'not owned'; END IF;

  UPDATE public.game_state
     SET equipped_cosmetics = equipped_cosmetics || jsonb_build_object(v_def.kind, p_cosmetic_id),
         updated_at = now()
   WHERE user_id = v_uid
   RETURNING * INTO v_row;
  RETURN v_row;
END
$$;

-- Unequip
CREATE OR REPLACE FUNCTION public.unequip_cosmetic(p_kind text)
RETURNS public.game_state
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.game_state;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_kind NOT IN ('island_theme','monster_glow','dice_skin') THEN RAISE EXCEPTION 'bad kind'; END IF;
  UPDATE public.game_state
     SET equipped_cosmetics = equipped_cosmetics - p_kind,
         updated_at = now()
   WHERE user_id = v_uid
  RETURNING * INTO v_row;
  RETURN v_row;
END
$$;

-- Seeds
INSERT INTO public.cosmetics_def (id, kind, name, description, price_coins, rarity, preview_color, sort_order) VALUES
  ('theme_sunset','island_theme','Sunset Isle','Warm orange & pink island palette',300,'common','#ff8a5b',10),
  ('theme_aurora','island_theme','Aurora Isle','Cool teal & violet island palette',600,'rare','#7c5cff',20),
  ('theme_volcanic','island_theme','Volcanic Isle','Deep red molten island palette',1200,'epic','#ff2d2d',30),
  ('glow_mint','monster_glow','Mint Glow','Soft mint aura around your monster',250,'common','#7cffb2',10),
  ('glow_gold','monster_glow','Gold Glow','Premium gold aura',800,'rare','#ffd166',20),
  ('glow_rainbow','monster_glow','Rainbow Glow','Animated rainbow aura',2000,'epic','#ff5ce0',30),
  ('dice_neon','dice_skin','Neon Dice','Glowing neon dice face',200,'common','#3affd1',10),
  ('dice_obsidian','dice_skin','Obsidian Dice','Sleek black dice',700,'rare','#1a1a1a',20),
  ('dice_celestial','dice_skin','Celestial Dice','Starfield dice skin',1500,'epic','#5b8cff',30);
