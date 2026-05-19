## Scope

Six focused UI/UX refinements. No business-logic or schema changes; daily-streak 24h enforcement already lives in the DB function and `useDailyStreak`/`useDailyReward` hooks.

## 1. Energy refill countdown next to ⚡

- In `TopHud.tsx` (where the smaller `Zap` icon lives), read `msUntilNextEnergy` from `useGameState` (or compute from `lastEnergyTick + regenInterval - now`).
- When `energy < currentBetCost`, render `mm:ss` countdown label beside the icon (`aria-live="polite"`, `role="timer"`). Hidden otherwise.
- Tick via a single `setInterval(1000)` cleared on unmount.

## 2. Bet preview card

- New `BetPreviewCard` rendered inside `BetSelector.tsx` above the confirm button.
- Shows: energy cost (`energyCostForBet(mult)`), expected roulette reward range (coins / rolls / energy) pulled from the existing reward table in `useRewardPool` / lottery config, and a "you have X⚡" line that turns red when insufficient.
- Updates live as the user moves through bet options.

## 3. Persist roulette winner summary

- In `LuckyRouletteModal.tsx`, keep `lastWin` state set when spin resolves; render a "Last win" panel under the wheel.
- Clear `lastWin` only at the start of the next spin (`onSpinStart`), not on close or on timer.

## 4. Keyboard / a11y polish

- `EnergyRefillModal`: confirm it uses shadcn `Dialog` (Radix already gives Escape + focus trap); add `aria-labelledby`, visible `focus-visible:ring` on action buttons, and `autoFocus` on the primary "Watch ad" button.
- `BetSelector`: ensure each bet chip is a `<button>` with `focus-visible:outline`, arrow-key roving tabindex already present — add Enter/Space to confirm.
- `LuckyRouletteModal` wheel: wrap the SVG in a `<button type="button" aria-label="Spin roulette">` so Enter/Space trigger the spin; add `focus-visible:ring-2 ring-primary`.

## 5. Daily streak — real 24h countdown, no random reopen

- `DailyReward.tsx` / `DailyStreakModal.tsx`: drive open state from `nextClaimMs > 0 ? closed : openable`. Remove any `useEffect` that reopens the modal on focus/route change.
- Always show the highlighted `currentDay` chip (even when claimed) and a `mm:ss:hh` countdown beneath it using `msUntilNextClaim` from `useDailyReward`. Highlight advances only when `msUntilNextClaim` hits 0.

## 6. Paddle.js

Already integrated — `src/lib/paddle.ts` loads `https://cdn.paddle.com/paddle/v2/paddle.js` at runtime and `usePaddleCheckout.ts` wraps the checkout flow. No install needed. Will note this in the response, no code change.

## Files to edit

- `src/components/TopHud.tsx` — countdown beside ⚡
- `src/components/BetSelector.tsx` — preview card + keyboard confirm
- `src/components/LuckyRouletteModal.tsx` — persistent last-win panel + button-wrapped wheel
- `src/components/EnergyRefillModal.tsx` — a11y polish
- `src/components/DailyReward.tsx` + `src/components/DailyStreakModal.tsx` — countdown + remove reopen triggers
- (Read-only verification) `src/hooks/useGameState.ts`, `src/hooks/useDailyReward.ts` for exposed timer values; add `msUntilNextEnergy` getter if not already present.

## Out of scope

Spin math, reward odds, RLS/migrations, Paddle install, lottery history, sounds.
