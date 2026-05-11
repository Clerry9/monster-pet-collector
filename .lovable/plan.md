# Plan

## 1. Energy UI matches betMultiplier energy cost

`useGameState.rollDice` charges `Math.max(1, betMultiplier)` energy per roll. The HUD pill in `BetSelector.tsx` only shows `energy/cap` and the multiplier badge in `TopHud.tsx` shows `×N`. There is no display of the actual per-roll cost.

- Export a tiny helper `energyCostForBet(mult)` from `useGameState.ts` so UI and roll logic share one source of truth.
- In `BetSelector.tsx`, append "−N⚡/roll" inside the energy pill, using `energyCostForBet(currentBet)`. When `energy < cost`, color it with a `text-destructive` tone.
- In `TopHud.tsx`, add a small "−N⚡" sublabel under the flame `×N` badge.

## 2. Insufficient-energy toast

`rollDice` returns `null` silently when `energy < energyCost`. The dice button caller (in `GameBoard.tsx` / `Index.tsx`) doesn't surface anything.

- In the roll handler, when `rollDice()` returns `null` AND `energy < cost`, fire `toast.error("Not enough energy", { description: \`Bet ×${bet} costs ${cost}⚡. You have ${energy}⚡.\` })` from `sonner`.

## 3. Persist Special Pack analytics to a database table

Currently only `console.log({ event: "pack_fulfilled", ... })` in `payments-webhook/index.ts`.

New table `pack_analytics`:

| field | type |
|---|---|
| user_id | uuid |
| pack_id | text |
| price_id | text |
| paddle_transaction_id | text |
| event | text  (`purchase_initiated` / `pack_fulfilled`) |
| rolls_granted | int |
| coins_granted | int |
| stars_granted | int |
| cards_granted | int |
| dice_tier | text null |
| monsters_granted | text[] |
| environment | text |
| created_at | timestamptz default now() |

RLS:
- Service role: ALL.
- Users: `SELECT` own rows (`auth.uid() = user_id`).
- No client INSERT — only the edge function (service role) writes.

Edge function changes (`payments-webhook/index.ts`):
- After the existing `console.log("pack_fulfilled", …)`, insert one row with the clamped card count.
- Add a second insert from `purchases-checkout`/initiation flow if applicable; otherwise rely on a new `purchase_initiated` event written from the client via a small new edge function `log-pack-event` (service-role insert) so RLS stays clean. (Simpler: only log `pack_fulfilled` server-side for now — this is the trustworthy event. The "initiated" client log stays in console.)

Decision for v1: write only the server-side `pack_fulfilled` event to the table. Initiated events stay as console analytics (untrusted client signal).

## 4. Expand bet multipliers when energy ≥ 1000

`getAvailableBets(coins)` in `src/data/levels.ts` is the gate. It's currently coin-based only.

- Extend `BET_MULTIPLIERS` with extra tiers: 5000, 10000, 100000 entries (the requested ladder is `1, 5, 10, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 100000` — most exist; add `2000`, `5000`, `10000`, `100000` with appropriate `minCoins`).
- Change `getAvailableBets` signature to `getAvailableBets(coins, energy = 0)`. Tiers above ×1000 are only returned when `energy >= 1000` (in addition to coin gate).
- Update callers (`BetSelector` consumers in `Index.tsx` / `GameBoard.tsx` / `TopHud`) to pass `energy`.
- The `clamp_game_state_ranges` trigger already caps `bet_multiplier` at 1000 — bump cap to 100000 via a small migration (`ALTER FUNCTION` re-create).

## 5. Confirmation toast after Special Pack purchase

The webhook fulfills the pack server-side; the client learns about it via the realtime `game_state` UPDATE subscription in `useGameState.ts`. We need a separate channel for "a pack just fulfilled, here's the card count".

- Subscribe in `useGameState.ts` (or a new `usePackPurchaseToasts` hook mounted in `Index.tsx`) to realtime INSERTs on the new `pack_analytics` table filtered by `user_id=eq.<uid>` and `event=eq.pack_fulfilled`.
- On insert, fire `toast.success("Pack purchased!", { description: \`+${cards_granted} card${cards_granted===1?'':'s'} added — open the card reveal to flip them.\` })`.
- Enable realtime publication on the new table.

## Technical details

Files touched:

- `supabase/migrations/<new>.sql` — create `pack_analytics` table + RLS + add to `supabase_realtime` publication; recreate `clamp_game_state_ranges` raising bet cap to 100000.
- `supabase/functions/payments-webhook/index.ts` — insert into `pack_analytics` inside `grantPerks` after the existing structured log.
- `src/hooks/useGameState.ts` — export `energyCostForBet`; expose `energy` to bet helpers; subscribe to `pack_analytics` realtime and emit a `sonner` toast.
- `src/data/levels.ts` — extend `BET_MULTIPLIERS`; update `getAvailableBets(coins, energy)` to gate ×2000+ behind energy ≥ 1000.
- `src/components/BetSelector.tsx` — show "−N⚡/roll" in the energy pill; pass `energy` through; destructive tint when underfunded.
- `src/components/TopHud.tsx` — small "−N⚡" sublabel under the flame.
- Roll caller (`src/pages/Index.tsx` or `src/components/GameBoard.tsx`) — toast on `rollDice() === null` due to energy.

No client writes to `pack_analytics` — only the service-role webhook inserts, so RLS stays tight.
