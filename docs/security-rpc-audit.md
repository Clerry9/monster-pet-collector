# RPC + Edge Function Security Audit

_Last reviewed: 2026-05-26_

## SECURITY DEFINER functions — caller matrix

| Function | Intended caller | Lockdown |
|---|---|---|
| `bootstrap_game_state`, `apply_dice_roll`, `update_game_state`, `spend_coins_rolls`, `set_bet_multiplier`, `set_active_monster`, `set_active_dice_tier`, `grant_card`, `unlock_monster`, `unlock_dice_tier`, `buy_dice_pack`, `add_island_stars`, `record_monster_tap`, `record_spin_cooldown`, `consume_card_flip`, `trade_card`, `equip_cosmetic`, `unequip_cosmetic`, `buy_cosmetic` | authenticated user | enforced via `auth.uid()` inside body; client EXECUTE intentionally allowed |
| `claim_mission`, `bump_mission_progress`, `get_or_roll_daily_missions`, `claim_achievement`, `claim_daily_streak`, `claim_ad_reward` | authenticated user | enforced via `auth.uid()` inside body |
| `consume_paid_roulette_spin`, `record_roulette_spin`, `claim_roulette_spin` | authenticated user | enforced via `auth.uid()` inside body |
| `get_season_leaderboard`, `get_leaderboard_profiles`, `get_ad_reward_status`, `has_role`, `has_active_subscription` | authenticated user (read-only) | safe to expose |
| `grant_battle_rewards`, `grant_paid_roulette_spins` | **service_role only** | EXECUTE revoked from anon/authenticated + body checks `auth.role()` |
| `handle_new_user`, `clamp_game_state_ranges`, `update_updated_at_column` | **trigger only** | EXECUTE revoked from anon/authenticated |

## Edge functions — JWT handling

| Function | Auth strategy | userId source | Notes |
|---|---|---|---|
| `arena-action` | `getUser(token)` via anon client | server-verified `userData.user.id` | service-role admin client used for writes; never trusts body userId |
| `pvp-match` | `getUser(token)` via anon client | server-verified `userData.user.id` | same pattern; ownership re-checked against `game_state.unlocked_monsters` |
| `create-checkout` | `getUser(token)` via anon client | server-verified; `customData.userId` is stripped and overridden | success URL is same-origin validated |
| `customer-portal`, `cancel-subscription`, `refresh-subscription` | `getUser(token)` | server-verified; subscription lookup keyed on verified id | |
| `list-pricing` | public (read-only catalog) | n/a | no PII / no mutations |
| `payments-webhook` | Stripe signature (`PAYMENTS_*_WEBHOOK_SECRET`) | derived from Stripe event metadata, validated against `purchases` row | service-role only on DB writes |

## Confirmed invariants

- No edge function accepts a `userId` from the request body for DB writes.
- All service-role DB clients are constructed server-side using
  `SUPABASE_SERVICE_ROLE_KEY` from env, never echoed back to the client.
- Reward grants (`grant_battle_rewards`, `grant_paid_roulette_spins`) require
  `auth.role() = 'service_role'` AND EXECUTE is revoked from
  anon/authenticated — defense in depth.