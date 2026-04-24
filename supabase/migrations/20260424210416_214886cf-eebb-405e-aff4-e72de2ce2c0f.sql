ALTER TABLE public.game_state
  ADD COLUMN IF NOT EXISTS energy integer NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS energy_updated_at timestamptz NOT NULL DEFAULT now();