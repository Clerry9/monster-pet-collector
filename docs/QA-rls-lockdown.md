# QA: RLS lockdown regression checklist

Run after the strict RLS migration that routes all `game_state` writes through
`update_game_state` and dedicated SECURITY DEFINER RPCs.

## Sign-in / bootstrap
- [ ] Brand-new user signs in → no console error, baseline `game_state` row exists
      (50 coins, 10 rolls, 150 energy, level 1, basic dice + gobby monster).
- [ ] Returning user reload → coins/rolls/energy/cards/monsters all restored from server.

## Gameplay loop
- [ ] Roll dice at ×1 bet → energy −10, position advances, coins/xp credit, no RLS error in console.
- [ ] Roll dice at ×3 bet → energy −30, payout scaled, no RLS error.
- [ ] Roll dice at ×30 bet (if unlocked) → energy −300, no RLS error.
- [ ] Land on a card tile → card appears in collection, `cards_collected` increments.
- [ ] Card-reveal animation completes → `pending_card_flips` decrements.
- [ ] Cross island boundary / land on star → `island_stars` increments; reaching 5 grants +1 flip.
- [ ] Active monster tap/XP from "food" tiles increases monster XP, no RLS error.
- [ ] Trade duplicate card → coin balance grows by trade value, duplicate removed.

## Purchases & unlocks (existing RPCs)
- [ ] Buy dice pack → coins debit, rolls credit (server response).
- [ ] Unlock silver/gold dice tier → tier appears, coins debit.
- [ ] Switch active dice tier → persists across reload.
- [ ] Unlock new monster (auto when collecting MONSTER_PIECES_REQUIRED of its card) → monster appears.
- [ ] Switch active monster → persists across reload.

## Rewards
- [ ] Daily reward modal claim → coins/rolls/energy credited via `claim_daily_streak`.
- [ ] Daily mission claim → reward credited via `claim_mission`.
- [ ] Achievement claim → reward credited via `claim_achievement`.
- [ ] Watch rewarded ad (energy / coins / spin / card) → reward credited via `claim_ad_reward`.
- [ ] Roulette: free spin lands, paid spin consumes credit, claim grants reward.

## Negative tests (DevTools console as a signed-in user)
- [ ] `await supabase.from('game_state').update({coins: 9_999_999}).eq('user_id', (await supabase.auth.getUser()).data.user.id)`
      → returns RLS error, server unchanged.
- [ ] `await supabase.from('game_state').update({energy: 99_999})` → RLS error.
- [ ] `await supabase.from('game_state').update({unlocked_dice_tiers: ['basic','silver','gold']})` → RLS error.
- [ ] `await supabase.rpc('apply_dice_roll', {p_steps: 1, p_position: 0, p_energy_cost: -1000, p_coin_delta: 9_999_999, p_xp_delta: 0})` → "bad energy cost".
- [ ] `await supabase.rpc('grant_paid_roulette_spins', {p_user_id: '…', p_amount: 100})` → "only service role may grant paid spins".
- [ ] Logged-out (anon) `supabase.from('achievements_def').select('*')` → empty / RLS denied.
- [ ] Anonymous (guest) JWT subscribes to a realtime channel → blocked.

## Notes
- All economic increases must originate from a SECURITY DEFINER RPC. The
  `update_game_state` write path is bounded per call (`MAX_COIN_DELTA = 10M`,
  `MAX_XP_DELTA = 50M`, energy/rolls cannot grow through it, arrays append-only).
- If a regression is found, prefer adding a focused RPC over relaxing
  `update_game_state` bounds.