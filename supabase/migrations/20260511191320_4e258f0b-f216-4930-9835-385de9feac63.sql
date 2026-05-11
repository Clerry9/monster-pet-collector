
CREATE TABLE public.pack_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_id text NOT NULL,
  price_id text,
  paddle_transaction_id text,
  event text NOT NULL,
  rolls_granted integer NOT NULL DEFAULT 0,
  coins_granted integer NOT NULL DEFAULT 0,
  stars_granted integer NOT NULL DEFAULT 0,
  cards_granted integer NOT NULL DEFAULT 0,
  dice_tier text,
  monsters_granted text[] NOT NULL DEFAULT ARRAY[]::text[],
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pack_analytics_user ON public.pack_analytics(user_id, created_at DESC);

ALTER TABLE public.pack_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pack analytics"
  ON public.pack_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all pack analytics"
  ON public.pack_analytics FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages pack analytics"
  ON public.pack_analytics FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER PUBLICATION supabase_realtime ADD TABLE public.pack_analytics;
ALTER TABLE public.pack_analytics REPLICA IDENTITY FULL;

-- Raise bet multiplier cap from 1000 to 100000.
CREATE OR REPLACE FUNCTION public.clamp_game_state_ranges()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.coins is null or new.coins < 0 then new.coins := 0; end if;
  if new.rolls is null or new.rolls < 0 then new.rolls := 0; end if;
  if new.xp    is null or new.xp    < 0 then new.xp    := 0; end if;
  if new.energy is null or new.energy < 0 then new.energy := 0; end if;
  if new.island_stars is null or new.island_stars < 0 then new.island_stars := 0; end if;
  if new.pending_card_flips is null or new.pending_card_flips < 0 then new.pending_card_flips := 0; end if;
  if new.total_steps is null or new.total_steps < 0 then new.total_steps := 0; end if;
  if new.cards_collected is null or new.cards_collected < 0 then new.cards_collected := 0; end if;

  if new.coins > 1000000000        then new.coins := 1000000000; end if;
  if new.rolls > 1000000           then new.rolls := 1000000;    end if;
  if new.xp    > 2000000000        then new.xp    := 2000000000; end if;
  if new.energy > 1000000          then new.energy := 1000000;   end if;
  if new.island_stars > 1000000    then new.island_stars := 1000000; end if;
  if new.pending_card_flips > 10000 then new.pending_card_flips := 10000; end if;

  if new.level is null or new.level < 1 then new.level := 1; end if;
  if new.level > 999 then new.level := 999; end if;

  if new.bet_multiplier is null or new.bet_multiplier < 1 then new.bet_multiplier := 1; end if;
  if new.bet_multiplier > 100000 then new.bet_multiplier := 100000; end if;

  if new.position is null or new.position < 0 then new.position := 0; end if;

  return new;
end;
$function$;
