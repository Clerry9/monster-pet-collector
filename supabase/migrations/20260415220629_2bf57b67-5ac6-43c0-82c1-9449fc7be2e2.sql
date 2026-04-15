ALTER TABLE public.game_state
ADD COLUMN level integer NOT NULL DEFAULT 1,
ADD COLUMN xp integer NOT NULL DEFAULT 0,
ADD COLUMN bet_multiplier integer NOT NULL DEFAULT 1;