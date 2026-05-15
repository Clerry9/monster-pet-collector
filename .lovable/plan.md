## Goal

Migrate every gameplay write that currently goes through `supabase.from("game_state").upsert(...)` into named SECURITY DEFINER RPCs, so the strict RLS we added last turn no longer blocks legitimate gameplay. Tighten ancillary RLS, audit RPC EXECUTE grants, and add a regression checklist.

## Migration: new RPCs

All `SECURITY DEFINER`, `SET search_path = public`, EXECUTE revoked from `anon, public` and granted only to `authenticated`. Each validates `auth.uid()` and clamps via the existing `clamp_game_state_ranges` trigger.

1. `apply_dice_roll(p_steps int, p_energy_cost int, p_coin_delta int, p_xp_delta int, p_position int, p_bet_multiplier int)` → `game_state`.
   Verifies `energy >= p_energy_cost` and `bet_multiplier <= unlocked cap`, deducts energy, adds coins/xp, sets new position, increments `total_steps`, sets `last_spin_at = now()`. Bounded ranges on every delta.

2. `consume_card_flip()` → `game_state`. Decrements `pending_card_flips` (must be > 0). Used when the reveal animation completes.

3. `grant_card(p_card_id text)` → `game_state`. Appends to `collected_cards` if not already present, increments `cards_collected`. Validates `p_card_id` against a server-side allowlist (use a small `cards_def` lookup or hard-coded array — we'll embed the catalog in the function to avoid a new table).

4. `unlock_monster(p_monster_id text)` → `game_state`. Appends to `unlocked_monsters` if not present. Validated against a hard-coded server catalog matching `src/data/monsters.ts`.

5. `set_active_monster(p_monster_id text)` / `set_active_dice_tier(p_tier_id text)` / `set_bet_multiplier(p_mult int)` / `tap_monster(p_monster_id text)` — small mutators that operate only on free-form/cosmetic fields but still go through definer functions for consistency. (`bet_multiplier` is rate-limited only by gameplay, so we just clamp 1..MAX.)

6. `add_island_star()` → game_state. Increments `island_stars` by 1 and grants `pending_card_flips += 1` when star count crosses thresholds (mirrors current client logic).

7. `add_pending_card_flips(p_amount int)` is *not* exposed — only the above grant paths can add flips.

8. `sync_game_state_metadata(p_state jsonb)` → `game_state`. Whitelist-only updater for non-economic fields the client owns (e.g. `equipped_cosmetics`, `monster_taps` map, `energy_updated_at`). Rejects any economic key.

## Client rewire (`src/hooks/useGameState.ts`)

- `saveToDb` now only calls `sync_game_state_metadata` for whitelisted fields. It no longer pushes coins/rolls/xp/level/energy/etc.
- The optimistic `update(...)` helper still updates local React state immediately so UI stays snappy. After the RPC resolves, we replace local state with the row returned by the RPC (server is source of truth).
- Each economic action wires to its RPC:
  - `roll()` → `apply_dice_roll`
  - `addCoins/addRolls/addEnergy/addXp/setPosition` (any caller that increases) is removed; gameplay flows must use RPC paths.
  - `collectCard` → `grant_card`
  - `consumePendingCardFlip` → `consume_card_flip`
  - `unlockMonster` → `unlock_monster`
  - `setActiveMonster` → `set_active_monster`
  - `setActiveDiceTier` → `set_active_dice_tier`
  - `setBetMultiplier` → `set_bet_multiplier`
  - Existing `buy_dice_pack` / `unlock_dice_tier` / `spend_coins_rolls` already RPC — keep.
- First-login bootstrap: instead of upserting local state, call a new `bootstrap_game_state()` RPC that inserts a baseline row idempotently.

## RLS tightening

- `achievements_def`, `cosmetics_def`, `missions_def`, `reward_pool_overrides`: change `anyone reads` policy from `{public}` to `{authenticated}` so unauthenticated/guest sessions can't read game catalogs. Admin-management policies scoped to `{authenticated}`.
- `daily_missions`: already INSERT/UPDATE/DELETE-locked. Add an explicit `SELECT TO authenticated` and drop the `{public}` role.
- `daily_streaks`, `ad_reward_claims`, `purchases`, `subscriptions`, `pack_analytics`, `user_cosmetics`, `roulette_spins`, `season_progress`, `game_state`, `profiles`: re-scope all `SELECT` policies from `{public}` to `{authenticated}` so anonymous JWTs cannot probe them.

## RPC EXECUTE audit

Apply the same revoke pattern to every `SECURITY DEFINER` function in `public`:

```sql
REVOKE EXECUTE ON FUNCTION public.<name>(...) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.<name>(...) TO authenticated;
```

Special cases:
- `grant_paid_roulette_spins` — revoke from `authenticated` too (service-role only).
- `clamp_game_state_ranges` / `update_updated_at_column` / `handle_new_user` — trigger functions; revoke EXECUTE from `public, anon, authenticated`.

## Regression test checklist

Add `docs/QA-rls-lockdown.md` with explicit gameplay paths to verify:

1. New user signs in → `bootstrap_game_state` runs, baseline row exists.
2. Roll dice (each bet multiplier) → energy deducts, coins/xp credit, position advances, no RLS error.
3. Land on a card tile → `grant_card` succeeds, card appears in collection.
4. Card reveal animation completes → `consume_card_flip` decrements counter.
5. Unlock new monster (level threshold or pack) → `unlock_monster` succeeds.
6. Switch active monster / dice tier / bet multiplier → mutator RPCs succeed.
7. Buy dice pack / unlock dice tier / spend coins-rolls → existing RPCs succeed.
8. Claim daily streak (Daily Reward modal) → coins/rolls/energy server-credited.
9. Claim mission / achievement → rewards credited.
10. Roulette: free spin, paid spin, claim → all succeed.
11. DevTools: try `supabase.from('game_state').update({coins: 9_999_999})` → rejected by RLS.
12. DevTools: try `supabase.rpc('apply_dice_roll', {p_energy_cost: -1000, ...})` → rejected by parameter validation.

## Out of scope

- Building a new `cards_def`/`monsters_def` table. The first iteration hard-codes the catalogs inside the RPC; we can normalize later.
- Reworking the offline-energy-regen anchor. We continue letting the client compute display energy locally between server reads; the server still owns the canonical `energy` value.
