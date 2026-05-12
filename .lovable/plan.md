## Goal

Add four monetization/progression systems plus an Energy Core refactor. Ship in phases so each one is testable before the next. All economy mutations stay server-side (RPCs + webhook); RLS prevents client-side cheating.

## Phase 1 — Premium Battle Pass ($4.99 / season, one-time)

**Server**
- New table `season_passes(user_id, season_id, purchased_at, environment, paddle_transaction_id)` with RLS (user reads own; service-role writes).
- New Paddle product `season_pass` + per-season price `season_pass_<id>` ($4.99 one-time, qty 1/1). Created via `create_product` in test only.
- Extend `payments-webhook` to credit `season_passes` on `transaction.completed` when `customData.kind === "season_pass"`.
- New RPC `claim_pass_reward(season_id, tier)` — gates premium-tier rewards by row in `season_passes`.

**Client**
- New `useSeasonPass(seasonId)` hook (filters by `environment`, like `useSubscription`).
- `SeasonHub.tsx`: add "Unlock Pass" CTA → `usePaddleCheckout` with `customData: { userId, kind: "season_pass", seasonId }`.
- Premium perks wired: 2× XP multiplier on coin/XP grant in `useGameState` when pass active; +5 daily rolls granted at first daily login; exclusive monster auto-unlocked on purchase; pass tier rewards visible in `PrestigeRewardsPanel`.

## Phase 2 — Cosmetic Skins Store

**Server**
- Table `cosmetics_def(code, kind, name, price_coins, price_gems, paddle_price_id?, rarity, asset_url, enabled)` — public read, admin write. `kind` = `island_theme | monster_glow | dice_skin | battle_anim`.
- Table `user_cosmetics(user_id, code, equipped, acquired_at)` — RLS user-own.
- Add columns to `game_state`: `equipped_island_theme`, `equipped_monster_glow`, `equipped_dice_skin` (text, nullable, FK by code).
- RPCs: `buy_cosmetic_coins(code)`, `equip_cosmetic(code)`. Paddle-bought cosmetics credited via webhook (extend with `kind: "cosmetic"`).

**Client**
- New `src/components/CosmeticStore.tsx` tab (grid by kind, owned/equip/buy states).
- Apply skins:
  - Island theme → CSS class on board container, theme tokens in `index.css`.
  - Monster glow → `Monster3D` glow prop already exists; map code → gradient.
  - Dice skin → extend existing `DICE_TIERS` rendering.

## Phase 3 — Branching Evolution

**Server**
- Add to `game_state`: `monster_stats jsonb` (`{ atk, def, lck }` per monster id) and `monster_evo_path text` (per active monster).
- RPC `train_monster(monster_id, stat)` — spends energy from new Train category, +1 to chosen stat.
- RPC `evolve_monster(monster_id)` — picks branch when XP threshold + dominant stat ≥ threshold (Mystic=lck, Berserker=atk, Titan=def). Stores chosen path; idempotent.

**Client**
- Update `src/data/monsters.ts`: each evolution stage gets 3 branch variants (image/name/bonus).
- `MonsterDisplay`: show next-branch preview based on current stat lead.
- New training UI inside monster detail.

## Phase 4 — Limited Monsters + Risk-Mode Island

**Limited monsters**
- Table `limited_monsters(code, name, drop_starts_at, drop_ends_at, supply_cap, claimed_count, stat_bonus jsonb)` (public read).
- Table `limited_monster_claims(user_id, code, claimed_at)` unique on (user_id, code).
- RPC `claim_limited_monster(code)` — atomic increment under `claimed_count < supply_cap` (advisory lock or `UPDATE … WHERE claimed_count < supply_cap RETURNING`); inserts claim row, appends to `unlocked_monsters`.
- Monthly seed via admin tool (no cron needed in MVP).

**Risk island**
- New island variant flag in `src/data/levels.ts` (`risk: true`).
- RPC `enter_risk_island(stake)` — debits coin stake, returns run id.
- RPC `resolve_risk_run(run_id, success)` — on success +XP×2 + return stake×1.5; on fail forfeit stake (or 50% if pass active = "insurance").
- Table `risk_runs(id, user_id, stake, status, started_at, resolved_at, payout)`.

## Phase 5 — Energy Core (spend categories)

Refactor existing energy into a single pool spent across actions:

| Action | Cost |
|---|---|
| Roll (existing) | scales with bet (unchanged) |
| Explore island tile | 5 |
| Battle (Phase 4) | 10 |
| Train stat (Phase 3) | 8 |
| Hunt rare monster | 25 |

**Server**
- New RPC `spend_energy(amount, action_kind)` — single source of truth; logs to new `energy_log` table for analytics.
- Replace direct `energy -=` writes in existing RPCs with `spend_energy()` calls.

**Client**
- Rename pill to "Energy Core"; tooltip lists spend categories.
- `EnergyRefillModal` already exists — keep as-is.

## Files

**New**
- `src/components/CosmeticStore.tsx`, `src/hooks/useSeasonPass.ts`, `src/hooks/useCosmetics.ts`, `src/components/RiskIsland.tsx`, `src/components/MonsterTrainPanel.tsx`, `src/data/cosmetics.ts`, `src/data/limitedMonsters.ts`
- Migrations for: `season_passes`, `cosmetics_def`, `user_cosmetics`, `limited_monsters`, `limited_monster_claims`, `risk_runs`, `energy_log`, plus `game_state` column adds.
- Paddle products: `season_pass`, `cosmetic_<code>` per paid skin.

**Edited**
- `supabase/functions/payments-webhook/index.ts` — handle `kind: "season_pass" | "cosmetic"`.
- `src/components/SeasonHub.tsx` — pass CTA + premium tier visuals.
- `src/hooks/useGameState.ts` — XP/coin multiplier when pass active; route energy spends via `spend_energy`.
- `src/data/monsters.ts` — branch evolutions.
- `src/components/MonsterDisplay.tsx` — show branch preview.
- `src/components/GameTabs.tsx` — add Store + Risk Island tabs.

## Out of scope (this plan)

- Real PvP / leaderboard battle simulator (use existing `season_leaderboard` for ranking).
- Cron-based season/limited-monster rotation (manual admin trigger for MVP).
- Asset creation (skin art) — placeholder gradients/emoji until art lands.
- Insurance tokens as separate currency — modeled as a flat 50% penalty reduction for pass holders.

## Suggested order

I'll implement Phase 1 first end-to-end (smallest, fastest revenue). After you confirm it works, I'll proceed to Phase 2, etc. Each phase gets its own approval step so you can stop or reorder anytime.