CREATE TABLE public.season_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  season_id TEXT NOT NULL,
  symbols INTEGER NOT NULL DEFAULT 0,
  pass_purchased BOOLEAN NOT NULL DEFAULT false,
  claimed_tiers INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  cards_unlocked TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, season_id)
);

ALTER TABLE public.season_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own season progress"
  ON public.season_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own season progress"
  ON public.season_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own season progress"
  ON public.season_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_season_progress_updated_at
  BEFORE UPDATE ON public.season_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_season_progress_user_season ON public.season_progress(user_id, season_id);