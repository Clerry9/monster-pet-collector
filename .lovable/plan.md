# Plan

## 1. Admin-only `pack_analytics` dashboard

- New route `/admin/pack-analytics` (protected + admin-gated, mirroring `/admin/rewards`).
- New page `src/pages/AdminPackAnalytics.tsx`:
  - Use `useUserRole()` → if not `isAdmin`, render an "Access denied" card.
  - Fetch from `pack_analytics` (RLS already allows admins to SELECT all).
  - Filters (client-side state, server-side query):
    - **User**: text input that matches `user_id` (UUID) — exact match.
    - **Pack**: `<Select>` populated from distinct `pack_id` values (loaded once).
    - **Date range**: two `<Calendar>` popovers (from / to). Use shadcn DatePicker pattern.
    - **Event**: optional select (`pack_fulfilled` / `purchase_initiated` / all).
  - Pagination: 50 rows per page, "Load more" button.
  - Table columns: created_at, event, pack_id, price_id, user_id (truncated, copy button), cards_granted, rolls_granted, coins_granted, stars_granted, dice_tier, monsters_granted, environment, paddle_transaction_id.
  - Summary strip at top: total rows in current filter, sum of cards/rolls/coins granted.
- Add a link to the page from `AdminRewards.tsx` header (admin-only).
- Register the route in `App.tsx` inside `<ProtectedRoute>`.

## 2. Bet selector refresh on energy regen + after rolls

The selector already re-renders when `energy` changes via props, but the bet *list* in `useGameState.setBetMultiplier` and the realtime energy updates may be stale. Fixes:

- In `useGameState.ts`, ensure the realtime `game_state` subscription updates `state.energy` and `state.energy_updated_at` — verify the channel exists; if missing, add one filtered by `user_id`.
- Add a 1-second `setInterval` ticker in `BetSelector` (already present for countdown) that also recomputes `available` via `getAvailableBets(coins, predictedEnergy)` where `predictedEnergy` factors elapsed regen since `energyUpdatedAt`. This way ×2000+ pills appear the moment the player crosses 1000 energy without waiting for a server round-trip.
- After `rollDice` resolves, the existing optimistic `setState` already drops `energy` — confirm `BetSelector` receives the latest `energy` prop from `Index.tsx` (it does via `game.energy`). No change needed beyond the predictive ticker.
- If current bet becomes unavailable (e.g. energy fell below threshold), auto-clamp `betMultiplier` down to the highest available tier in `useGameState` after each roll.

## 3. Season Hub tutorial box off-screen

The coachmark targeting `[data-rail='season']` (or season-related step) renders its popover off-screen on the current 828×724 viewport.

- In `TutorialCoachmark.tsx`, audit the popover positioning logic (around line 157, the "never falls below the visible area" comment). Add horizontal clamping: ensure `left` is clamped to `[8, viewportWidth - popoverWidth - 8]` and `top` to `[8, viewportHeight - popoverHeight - 8]`.
- Add a small responsive max-width to the popover (`max-w-[min(360px,calc(100vw-32px))]`) so it never exceeds viewport width on narrow screens.
- Verify by walking the tutorial on the current viewport.

## 4. Buy Lucky Roulette spins with cash from the Shop

- New Paddle product/price: `roulette_spins_5` ($1.99) and `roulette_spins_25` ($7.99) — created via `payments--batch_create_product`.
- Add server-side fulfillment in `supabase/functions/payments-webhook/index.ts`:
  - Recognize `roulette_spins_5` / `roulette_spins_25` price IDs.
  - Grant N paid spins by inserting N rows into a new `purchased_roulette_spins` counter, OR (simpler) add a `paid_spin_credits` integer column to `roulette_state` and increment it. Recommend the column approach.
- Migration: `ALTER TABLE roulette_state ADD COLUMN paid_spin_credits int NOT NULL DEFAULT 0;`
- Update `useLuckyRouletteCooldown` to expose `paidSpinCredits` and a `consumePaidSpin()` RPC.
- New RPC `consume_paid_roulette_spin()` (SECURITY DEFINER) — decrements `paid_spin_credits` by 1 if > 0.
- Update `LuckyRouletteModal`: when `freeAvailable` is false but `paidSpinCredits > 0`, allow spinning by calling `consumePaidSpin()` instead of charging coins.
- Add a "Roulette Spins" section to `DiceShop.tsx` with two cards (5-pack, 25-pack), each with a Paddle "Buy" button. Mirror existing pack card styling.
- Log purchase to `pack_analytics` (event `pack_fulfilled`, `pack_id = roulette_spins_5/25`, store count in `rolls_granted` for now or add a dedicated field — keep using `rolls_granted` to avoid schema churn).

## Files touched

- New: `src/pages/AdminPackAnalytics.tsx`
- New migration: `paid_spin_credits` column + `consume_paid_roulette_spin` RPC
- `src/App.tsx` — register admin route
- `src/pages/AdminRewards.tsx` — link to new page
- `src/components/BetSelector.tsx` — predictive ticker recompute
- `src/hooks/useGameState.ts` — clamp bet after rolls; ensure realtime updates
- `src/components/TutorialCoachmark.tsx` — viewport clamping
- `src/components/DiceShop.tsx` — roulette spin packs section
- `src/components/LuckyRouletteModal.tsx` — paid spin credit flow
- `src/hooks/useLuckyRouletteCooldown.ts` — expose paid credits
- `supabase/functions/payments-webhook/index.ts` — fulfill roulette spin packs
- Paddle: 2 new products via `payments--batch_create_product`

## Open question

Roulette spin pack pricing — happy with **5 spins / $1.99** and **25 spins / $7.99**, or different tiers/prices?
