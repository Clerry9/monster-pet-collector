-- 1) monster_progress table
CREATE TABLE public.monster_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  monster_id text NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, monster_id)
);

GRANT SELECT ON public.monster_progress TO authenticated;
GRANT ALL ON public.monster_progress TO service_role;

ALTER TABLE public.monster_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own monster progress"
ON public.monster_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "service role manages monster progress"
ON public.monster_progress
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_monster_progress_updated_at
BEFORE UPDATE ON public.monster_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) arena_runs additions
ALTER TABLE public.arena_runs
  ADD COLUMN IF NOT EXISTS win_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pending_choices jsonb;

-- 3) monster_stats_def additions
ALTER TABLE public.monster_stats_def
  ADD COLUMN IF NOT EXISTS element text NOT NULL DEFAULT 'neutral';

-- 4) RPC to grant monster XP (service-role only)
CREATE OR REPLACE FUNCTION public.grant_monster_xp(p_user_id uuid, p_monster_id text, p_xp integer)
RETURNS public.monster_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.monster_progress;
  v_threshold int;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'only service role may grant monster xp';
  END IF;
  IF p_xp < 0 OR p_xp > 1000000 THEN
    RAISE EXCEPTION 'bad xp amount';
  END IF;

  INSERT INTO public.monster_progress (user_id, monster_id, xp, level)
  VALUES (p_user_id, p_monster_id, p_xp, 1)
  ON CONFLICT (user_id, monster_id) DO UPDATE
    SET xp = public.monster_progress.xp + EXCLUDED.xp,
        updated_at = now()
  RETURNING * INTO v_row;

  -- Level up loop: threshold = floor(100 * level^1.5)
  LOOP
    v_threshold := floor(100 * power(v_row.level, 1.5))::int;
    EXIT WHEN v_row.xp < v_threshold OR v_row.level >= 100;
    UPDATE public.monster_progress
       SET xp = xp - v_threshold,
           level = level + 1,
           updated_at = now()
     WHERE id = v_row.id
    RETURNING * INTO v_row;
  END LOOP;

  RETURN v_row;
END
$$;