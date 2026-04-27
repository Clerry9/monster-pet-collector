
-- ===== Server-side RPCs to control purchases (prevent client bypass) =====

-- 1) Spend coins/rolls atomically (used by mini-games or actions that need both)
create or replace function public.spend_coins_rolls(p_coins int, p_rolls int)
returns public.game_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.game_state;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_coins < 0 or p_rolls < 0 then raise exception 'amounts must be non-negative'; end if;

  update public.game_state
     set coins = coins - p_coins,
         rolls = rolls - p_rolls,
         updated_at = now()
   where user_id = v_uid
     and coins >= p_coins
     and rolls >= p_rolls
   returning * into v_row;

  if v_row.id is null then
    raise exception 'insufficient coins or rolls';
  end if;
  return v_row;
end;
$$;

-- 2) Buy a dice pack with coins (server-validated price/grant)
create or replace function public.buy_dice_pack(p_pack_id text)
returns public.game_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cost int;
  v_rolls int;
  v_row public.game_state;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- Hard-coded server-side pack catalog (must match DICE_PACKS in client)
  case p_pack_id
    when 'starter' then v_cost := 50;  v_rolls := 5;
    when 'value'   then v_cost := 120; v_rolls := 15;
    when 'mega'    then v_cost := 350; v_rolls := 50;
    when 'ultra'   then v_cost := 900; v_rolls := 150;
    else raise exception 'unknown pack: %', p_pack_id;
  end case;

  update public.game_state
     set coins = coins - v_cost,
         rolls = rolls + v_rolls,
         updated_at = now()
   where user_id = v_uid
     and coins >= v_cost
   returning * into v_row;

  if v_row.id is null then raise exception 'insufficient coins'; end if;
  return v_row;
end;
$$;

-- 3) Unlock a paid dice tier with coins (server-validated price/grant)
create or replace function public.unlock_dice_tier(p_tier_id text)
returns public.game_state
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cost int;
  v_row public.game_state;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  case p_tier_id
    when 'silver' then v_cost := 500;
    when 'gold'   then v_cost := 2000;
    else raise exception 'unknown or non-purchasable tier: %', p_tier_id;
  end case;

  update public.game_state
     set unlocked_dice_tiers = case
                                 when p_tier_id = any(unlocked_dice_tiers)
                                   then unlocked_dice_tiers
                                 else array_append(unlocked_dice_tiers, p_tier_id)
                               end,
         coins = case
                   when p_tier_id = any(unlocked_dice_tiers) then coins
                   else coins - v_cost
                 end,
         updated_at = now()
   where user_id = v_uid
     and (p_tier_id = any(unlocked_dice_tiers) or coins >= v_cost)
   returning * into v_row;

  if v_row.id is null then raise exception 'insufficient coins'; end if;
  return v_row;
end;
$$;

-- Lock down execution: only authenticated users
revoke execute on function public.spend_coins_rolls(int, int) from public, anon;
grant  execute on function public.spend_coins_rolls(int, int) to authenticated;
revoke execute on function public.buy_dice_pack(text)        from public, anon;
grant  execute on function public.buy_dice_pack(text)        to authenticated;
revoke execute on function public.unlock_dice_tier(text)     from public, anon;
grant  execute on function public.unlock_dice_tier(text)     to authenticated;

-- ===== Range clamps via trigger (CHECK constraints would block legit values; trigger clamps) =====

create or replace function public.clamp_game_state_ranges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Non-negative resources
  if new.coins is null or new.coins < 0 then new.coins := 0; end if;
  if new.rolls is null or new.rolls < 0 then new.rolls := 0; end if;
  if new.xp    is null or new.xp    < 0 then new.xp    := 0; end if;
  if new.energy is null or new.energy < 0 then new.energy := 0; end if;
  if new.island_stars is null or new.island_stars < 0 then new.island_stars := 0; end if;
  if new.pending_card_flips is null or new.pending_card_flips < 0 then new.pending_card_flips := 0; end if;
  if new.total_steps is null or new.total_steps < 0 then new.total_steps := 0; end if;
  if new.cards_collected is null or new.cards_collected < 0 then new.cards_collected := 0; end if;

  -- Sane upper bounds (prevent overflow exploits)
  if new.coins > 1000000000        then new.coins := 1000000000; end if;
  if new.rolls > 1000000           then new.rolls := 1000000;    end if;
  if new.xp    > 2000000000        then new.xp    := 2000000000; end if;
  if new.energy > 1000000          then new.energy := 1000000;   end if;
  if new.island_stars > 1000000    then new.island_stars := 1000000; end if;
  if new.pending_card_flips > 10000 then new.pending_card_flips := 10000; end if;

  -- Level: must be >= 1, cap at 999 (way above any reachable prestige)
  if new.level is null or new.level < 1 then new.level := 1; end if;
  if new.level > 999 then new.level := 999; end if;

  -- Bet multiplier 1..1000
  if new.bet_multiplier is null or new.bet_multiplier < 1 then new.bet_multiplier := 1; end if;
  if new.bet_multiplier > 1000 then new.bet_multiplier := 1000; end if;

  -- Position non-negative
  if new.position is null or new.position < 0 then new.position := 0; end if;

  return new;
end;
$$;

drop trigger if exists trg_clamp_game_state on public.game_state;
create trigger trg_clamp_game_state
before insert or update on public.game_state
for each row execute function public.clamp_game_state_ranges();

-- ===== Revoke direct UPDATE on game_state to force purchases through RPCs =====
-- We keep INSERT (for first-load upsert) and UPDATE on non-economic columns via a tighter policy.
-- Strategy: drop the broad UPDATE policy and re-create one that BLOCKS changes which
-- would increase economic columns beyond their current row values. This lets the client
-- still save position/xp/energy/etc. naturally, but coins/rolls/unlocked_dice_tiers can
-- only be modified via SECURITY DEFINER RPCs (which bypass RLS).

drop policy if exists "Users can update own game state" on public.game_state;

create policy "Users can update own game state (no economic increase)"
on public.game_state
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  -- Block client from increasing coins beyond current row
  and coins <= (select gs.coins from public.game_state gs where gs.user_id = auth.uid())
  -- Block client from increasing rolls beyond current row
  and rolls <= (select gs.rolls from public.game_state gs where gs.user_id = auth.uid())
  -- Block client from adding new dice tiers (must use unlock_dice_tier RPC)
  and (
    select coalesce(array_length(unlocked_dice_tiers, 1), 0)
      <= coalesce(array_length((select gs.unlocked_dice_tiers from public.game_state gs where gs.user_id = auth.uid()), 1), 0)
  )
);
