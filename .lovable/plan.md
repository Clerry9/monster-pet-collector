# Plan: Roulette polish — ball, odds, history, shared rewards, tutorial, tests, rail countdown

## 1. Visible rolling ball

In `LuckyRouletteModal.tsx`, render a small ball element above the wheel (separate SVG layer that does **not** rotate with the wheel — easier to track visually). During spin:

- Compute the winning slot's center angle from the wheel's final rotation.
- Animate the ball along the rim (SVG circle path or framer-motion `animate` on a `<circle>` whose `cx`/`cy` are derived from a tweened angle), spiraling slightly inward as it slows so it visibly settles into a wedge.
- ~3.6s, ease-out matching the wheel deceleration; lands so the ball sits on the winning wedge under the pointer at the top.

## 2. Odds legend (always visible before spin)

Add a compact two-column legend inside the modal (between wheel and action buttons). Each row shows: color swatch • emoji • reward label • odds (`12.5%` for uniform 8 slots). When odds become non-uniform later (see §4) the panel reads from a single source of truth.

The legend doubles as the "reward per slot" display the user asked for, so we don't need a separate component.

## 3. Last-spins history

- New file `src/hooks/useRouletteHistory.ts` — persists last 10 spins in `localStorage` (key `luckyRoulette.history.v1`). Shape: `{ at: number; pickedSlot: number; landedSlot: number; rewardLabel: string; rewardEmoji: string; won: boolean; paid: boolean }`.
- Helpers: `appendEntry`, `clear`, `entries`.
- In the modal, append on every spin resolution.
- New collapsible "Recent spins" panel inside the modal (closed by default) that lists the last 10 with a ✓ / ✗ badge, picked vs landed emoji, paid/free icon, and relative time. Includes a "Clear history" button.

## 4. Shared reward pool with island/season

Today the wheel has its own slot table. Refactor so all roulette rewards come from one place:

- New file `src/data/rewardPool.ts` exports a unified `RewardKind` and `Reward` type plus a `SHARED_POOL` (weighted) used by both island spins and the lucky wheel.
- `IslandRewardRoulette.tsx` switches to import from this module (existing `IslandReward` type re-exported as alias to keep `Index.tsx` switch statements compiling — same `kind` strings: `coins_small`, `coins_med`, `coins_jackpot`, `rolls`, `card_flip`, `island_star`, `monster_food`).
- `LuckyRouletteModal.tsx` derives its 8 slot table from the same pool: pick the 8 highest-weight prize templates and assign each a slot. Slot odds come from each template's relative weight (normalized to 100%) — so the legend in §2 reflects real probabilities, and the ball still lands uniformly across slots (1/8) but each slot represents a real shared prize.
- Update `Index.tsx`'s `LuckyRouletteReward` switch to handle the unified `kind` set (drop `coins`/`season_xp` synonyms or map them through the same handler used for the island roulette). `season_xp` slot — keep one slot wired to `season.addSymbols`.

## 5. Tutorial step for the wheel

- The wheel's `<svg>` already has a stable wrapper; add `data-tutorial="roulette-wheel"` on the wheel container and `data-tutorial="roulette-pointer"` on the pointer triangle.
- Extend `tutorialSteps` in `Index.tsx` with two new steps shown after the existing roulette rail step:
  1. Highlights `roulette-wheel` — body: "Tap any wedge to bet on it."
  2. Highlights `roulette-pointer` — body: "When the ball stops here, you win that prize — but only if it's your wedge."
- The tutorial open-on-rail flow (`onLearnMore("roulette")`) opens the lucky modal first (so the wedges exist in the DOM) before advancing the coachmark. Add an `onBeforeStep`-style handler in `Index.tsx`: when the next step's selector starts with `roulette-`, ensure `setLuckyOpen(true)` first.
- Add the new step indices to the rail mapping `roulette: …`.

## 6. Slot reward labels visible pre-spin

Already partially solved by §2 (odds legend lists every slot). Additionally, render a small text label under each wedge's emoji (amount only — e.g. "150" / "JP") so the wheel itself is self-describing. On hover/focus of a wedge, show a tooltip with the full label.

## 7. Pick-then-win

Already implemented — keep as is.

## 8. Tests

Add `vitest` + `@testing-library/react` tests (testing infra already present per `vitest.config.ts`):

- `src/components/LuckyRouletteModal.test.tsx`
  - Renders 8 wedges with correct accessible names.
  - Spin button is disabled until a wedge is picked.
  - Picking a wedge sets `aria-checked` and enables the spin button.
  - Free-spin cooldown is respected (mock `localStorage` with a recent timestamp → button shows countdown and is disabled; no timestamp → enabled).
  - Paid spin disabled when `coins < 100`.
  - Esc closes the modal (calls `onClose`).
  - History entry is appended after a spin (mock `Math.random` to force a known winning slot; advance timers; assert localStorage write).
- `src/components/TutorialCoachmark.test.tsx`
  - Renders title + body of the current step with proper `aria-modal`, `role="dialog"`, `aria-labelledby`.
  - `Enter`/`ArrowRight` advances; `ArrowLeft` goes back; `Escape` calls `onClose`.
  - `onFinish` fires on the last step's primary action.
  - Focus is trapped inside the card (Tab from last focusable wraps to first).
  - Tooltip horizontal position stays inside the viewport when target rect is near the right edge (mock `getBoundingClientRect`, render, assert `style.left` stays within `[halfW+12, vw-halfW-12]`).
  - When `open` flips false, focus is restored to the previously focused element.

## 9. Free-spin countdown on the rail button

- Lift the cooldown reading into a tiny shared hook `useLuckyRouletteCooldown()` (reads `STORAGE_KEY`, ticks every second, exposes `{ freeAvailable, remainingMs }`). Used by both the modal and the rail button.
- In `SideRails.tsx`, the `RailItem` already supports `countdownMs`. In `Index.tsx`, plumb the hook's `remainingMs` (or `undefined` when free) into the `roulette` rail item via a new prop `rouletteCooldownMs`. When 0/undefined, show the existing "NEW" hot badge instead.
- Tooltip body updates to "Free spin ready!" or "Next free spin in HH:MM:SS".

## Files touched / created

Created:
- `src/hooks/useRouletteHistory.ts`
- `src/hooks/useLuckyRouletteCooldown.ts`
- `src/data/rewardPool.ts`
- `src/components/LuckyRouletteModal.test.tsx`
- `src/components/TutorialCoachmark.test.tsx`

Edited:
- `src/components/LuckyRouletteModal.tsx` — ball animation, legend, history panel, shared pool, wedge labels, `data-tutorial` hooks.
- `src/components/IslandRewardRoulette.tsx` — switch to shared pool.
- `src/components/SideRails.tsx` — accept and display roulette cooldown.
- `src/pages/Index.tsx` — new tutorial steps, rail-to-step mapping, open-modal-before-tutorial-step logic, pass cooldown to rail, updated reward switch.

## Out of scope

- No backend / payments / entitlement changes.
- No visual redesign of the existing island roulette beyond the pool refactor.
