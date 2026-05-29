-- ============================================================
-- POWER-UPS SYSTEM
-- ============================================================

-- Catalog table (public-readable, admin-managed)
CREATE TABLE public.power_ups_def (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('arena','pvp','board')),
  name text NOT NULL,
  description text NOT NULL,
  emoji text NOT NULL DEFAULT '⚡',
  effect_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  coin_price integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.power_ups_def TO authenticated;
GRANT ALL ON public.power_ups_def TO service_role;

ALTER TABLE public.power_ups_def ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated reads power-ups"
  ON public.power_ups_def FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage power-ups"
  ON public.power_ups_def FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Inventory (per user)
CREATE TABLE public.user_power_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  power_up_id text NOT NULL REFERENCES public.power_ups_def(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, power_up_id)
);

GRANT SELECT ON public.user_power_ups TO authenticated;
GRANT ALL ON public.user_power_ups TO service_role;

ALTER TABLE public.user_power_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own power-ups"
  ON public.user_power_ups FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "service role manages power-ups"
  ON public.user_power_ups FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_user_power_ups_user ON public.user_power_ups(user_id);

-- Purchase with coins (atomic; server-validated price)
CREATE OR REPLACE FUNCTION public.purchase_power_up(p_power_up_id text, p_quantity integer DEFAULT 1)
RETURNS user_power_ups
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_def public.power_ups_def;
  v_total_cost int;
  v_row public.user_power_ups;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_quantity < 1 OR p_quantity > 50 THEN RAISE EXCEPTION 'bad quantity'; END IF;

  SELECT * INTO v_def FROM public.power_ups_def WHERE id = p_power_up_id AND enabled;
  IF v_def.id IS NULL THEN RAISE EXCEPTION 'unknown power-up'; END IF;

  v_total_cost := v_def.coin_price * p_quantity;

  UPDATE public.game_state SET coins = coins - v_total_cost, updated_at = now()
   WHERE user_id = v_uid AND coins >= v_total_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient coins'; END IF;

  INSERT INTO public.user_power_ups (user_id, power_up_id, quantity)
  VALUES (v_uid, p_power_up_id, p_quantity)
  ON CONFLICT (user_id, power_up_id) DO UPDATE
    SET quantity = public.user_power_ups.quantity + EXCLUDED.quantity,
        updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;

-- Consume one (called by client OR by service role for combat)
CREATE OR REPLACE FUNCTION public.consume_power_up(p_power_up_id text)
RETURNS user_power_ups
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.user_power_ups;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  UPDATE public.user_power_ups
     SET quantity = quantity - 1, updated_at = now()
   WHERE user_id = v_uid AND power_up_id = p_power_up_id AND quantity > 0
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'power-up not available'; END IF;
  RETURN v_row;
END $$;

-- Service-role grant (used by edge functions for combat consumption + webhook bundle grants)
CREATE OR REPLACE FUNCTION public.grant_power_up(p_user_id uuid, p_power_up_id text, p_quantity integer)
RETURNS user_power_ups
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_row public.user_power_ups;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'only service role may grant power-ups';
  END IF;
  IF p_quantity = 0 THEN RAISE EXCEPTION 'quantity required'; END IF;

  INSERT INTO public.user_power_ups (user_id, power_up_id, quantity)
  VALUES (p_user_id, p_power_up_id, GREATEST(p_quantity, 0))
  ON CONFLICT (user_id, power_up_id) DO UPDATE
    SET quantity = GREATEST(public.user_power_ups.quantity + p_quantity, 0),
        updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END $$;