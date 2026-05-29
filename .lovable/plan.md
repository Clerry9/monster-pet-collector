# Power-Ups Feature Plan

Rail changes are already done (Arena + PvP added to left rail; gap tightened). This plan covers the new Power-Ups system.

## What you'll get

A unified "Boosts" system with 9 items split across three contexts. Each boost stacks in your inventory and is consumed when used.

**Arena Boosts** (used at run start)
- Iron Skin — +25% starting HP
- War Cry — +20% ATK for the whole run
- Phoenix Feather — auto-revive once at 1 HP
- Shard Doubler — 2x shards from this run

**PvP Boosts** (used on next attack)
- First Strike — guaranteed first turn
- Lucky Crit — +30% crit chance this match
- Aegis Shield — block first incoming hit

**Board Boosts** (used on next roll)
- Coin Rush — 2x coin rewards for next 5 rolls
- Energy Tonic — instant full energy refill

## Pricing

- Single use: 250–800 coins depending on power
- **Starter Boost Bundle** (real money): 12 boosts (mix of all 9 types) for $4.99 — ~40% discount vs coins
- **Big Boost Bundle** (real money): 30 boosts for $9.99 — ~55% discount

## Where to buy

- **Shop tab**: New "Boosts" section above existing dice packs
- **Pre-battle modal**: Quick-buy strip shown when entering Arena or PvP (only relevant boosts shown)
- Board boosts: small icon row above the dice roller

## Technical plan

### Database
New migration adds:
- `power_ups_def` (id, kind: arena|pvp|board, name, description, effect_json, coin_price, sort_order) — admin/public read
- `user_power_ups` (user_id, power_up_id, quantity) — RLS: users read own; service_role writes
- Seed 9 power-ups via insert tool

### Edge functions
- `power-up-purchase` — atomically debits coins from `game_state` and increments `user_power_ups` (server-validated price)
- `power-up-consume` — decrements quantity; called by `arena-action` (op:"start") and `pvp-match` to apply effects server-side
- Extend `payments-webhook` to grant bundle contents on `boost_bundle_starter` / `boost_bundle_big` Stripe products
- Add two Stripe products via payments tool

### Combat integration
- `arena-action` start op accepts `power_ups: string[]`, applies effects to initial `ArenaRun` (hp/atk/revive/shard multiplier flag stored in `items` jsonb)
- `pvp-match` accepts pre-match boost; applies to attacker's first turn
- Board boosts apply client-side via existing `useGameState` (coin rush flag, energy refill)

### UI components
- `src/data/powerUps.ts` — typed catalog mirroring DB
- `src/hooks/usePowerUps.ts` — fetch inventory, purchase, consume
- `src/components/PowerUpShop.tsx` — Shop tab section + reusable card grid
- `src/components/PreBattleBoostBar.tsx` — pre-battle picker for Arena/PvP
- Wire into existing `SpecialPacks`/Shop tab, `Arena.tsx`, `PvP.tsx`

### Files touched (estimate)
- 1 migration + 1 data insert
- 2 new edge functions, 1 webhook edit
- 4 new client files, ~5 edited (Arena.tsx, PvP.tsx, Shop/SpecialPacks, useGameState, arena-action)

## Order of work
1. Migration + seed + Stripe products
2. Edge functions (purchase + consume + webhook)
3. Client hook + Shop section
4. Pre-battle modal + Arena/PvP wiring
5. Board boost integration

Approve and I'll build it.