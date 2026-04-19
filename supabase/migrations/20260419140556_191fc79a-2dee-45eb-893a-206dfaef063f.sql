ALTER TABLE public.game_state
  ADD COLUMN IF NOT EXISTS island_stars integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_card_flips integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_spin_at timestamptz;