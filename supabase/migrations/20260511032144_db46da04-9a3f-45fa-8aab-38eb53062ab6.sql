
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Roulette free-spin cooldown sync
CREATE TABLE public.roulette_state (
  user_id uuid PRIMARY KEY,
  last_free_spin_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roulette_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own roulette state"
  ON public.roulette_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own roulette state"
  ON public.roulette_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own roulette state"
  ON public.roulette_state FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_roulette_state_updated
BEFORE UPDATE ON public.roulette_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Roulette spin history + idempotent claim
CREATE TABLE public.roulette_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  picked_slot int NOT NULL,
  landed_slot int NOT NULL,
  reward_kind text NOT NULL,
  reward_label text NOT NULL,
  reward_emoji text NOT NULL,
  reward_amount int NOT NULL,
  picked_label text NOT NULL,
  picked_emoji text NOT NULL,
  won boolean NOT NULL,
  paid boolean NOT NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_roulette_spins_user_created
  ON public.roulette_spins(user_id, created_at DESC);

ALTER TABLE public.roulette_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own spins"
  ON public.roulette_spins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own spins"
  ON public.roulette_spins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own spins"
  ON public.roulette_spins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own spins"
  ON public.roulette_spins FOR DELETE USING (auth.uid() = user_id);

-- Idempotent claim: marks claimed_at only on the first successful call.
-- Returns the row regardless so callers can detect "already claimed".
CREATE OR REPLACE FUNCTION public.claim_roulette_spin(p_spin_id uuid)
RETURNS public.roulette_spins
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.roulette_spins;
  v_was_unclaimed boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  UPDATE public.roulette_spins
     SET claimed_at = now()
   WHERE id = p_spin_id
     AND user_id = v_uid
     AND claimed_at IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NOT NULL THEN
    v_was_unclaimed := true;
  ELSE
    SELECT * INTO v_row
      FROM public.roulette_spins
     WHERE id = p_spin_id AND user_id = v_uid;
  END IF;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'spin not found';
  END IF;

  RETURN v_row;
END
$$;

-- Reward pool overrides (admin tunable)
CREATE TABLE public.reward_pool_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  static_label text NOT NULL UNIQUE,
  weight int NOT NULL DEFAULT 0 CHECK (weight >= 0),
  min_amount int,
  max_amount int,
  emoji text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_pool_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reward overrides"
  ON public.reward_pool_overrides FOR SELECT USING (true);
CREATE POLICY "Admins can insert reward overrides"
  ON public.reward_pool_overrides FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reward overrides"
  ON public.reward_pool_overrides FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reward overrides"
  ON public.reward_pool_overrides FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_reward_pool_overrides_updated
BEFORE UPDATE ON public.reward_pool_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_spins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_pool_overrides;
