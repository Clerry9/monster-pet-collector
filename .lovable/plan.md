## Goals

1. Stop the **COIN HAUL** (and other reward) celebration from looping.
2. Move the **mute** button onto the main play page (always visible).
3. Add a **production-safe debug flag** for the lottery overlay/console logs.
4. Clean up the **lottery bubble** so it disappears the instant the next roll begins.
5. Add a **per-session reward history** of lottery landings + ⚡ bonuses.
6. Add an **end-to-end test** proving the wheel always stops on landing and never spins forever.

## Changes

### 1. Fix celebration loop — `src/components/RewardCelebration.tsx`
Root cause: the effect depends on `[kind, onDone]`. `Index.tsx` passes a fresh `() => setCelebration(null)` each render, so every parent re-render re-runs the effect, clears `shown`, then sets it again → endless restart of the 1.4s timer; user sees a stuck banner.

- Drop `onDone` from the dependency array (use a `useRef` to always call the latest callback), OR memoize `onDone` in `Index.tsx` with `useCallback`. I'll do both: ref inside the component (defensive) + `useCallback` in `Index.tsx`.
- Also guard against re-triggering for the same `kind` instance by tracking the last-handled value in a ref.

### 2. Mute button on main play page — `src/pages/Index.tsx`
- Move the existing mute button out of the slide-down drawer (`max-h-[80vh]` panel) and render it as a fixed top-left chip on the board tab (mirrors the existing TOUR / menu chips on the right), so it's reachable without opening the menu.
- Keep the in-drawer toggle removed to avoid duplication.

### 3. Production-safe debug flag — `src/components/LotteryDebugOverlay.tsx` + `src/components/LotteryRoulette.tsx`
- Read `import.meta.env.VITE_LOTTERY_DEBUG` and treat **production builds as off by default** unless that flag is `"1"`.
- Compute `enabled = import.meta.env.DEV && (env flag !== "0") || (env flag === "1" forces on)`, plus the existing `localStorage`/query-param escape hatches — but only when not explicitly disabled by the env flag.
- Wrap the `console.debug("[lottery] reset…")` call in `LotteryRoulette.tsx` behind the same helper (extract `isLotteryDebugEnabled()` into a tiny shared util, e.g. `src/lib/lotteryDebug.ts`) so production never logs.

### 4. Lottery bubble cleanup on next roll — `src/components/LotteryRoulette.tsx` / `GameBoard.tsx`
- In the `landedKey` reset effect, set `hidden = true` immediately and only flip back to `false` once `spinning` actually goes true (rising edge). That guarantees no overlap frame between the previous result snapshot and the new spin.
- In `GameBoard.tsx`, also clear `lastResult`-driven `showResult` UI on the rising edge of `isRolling` so the right-side award popup unmounts at roll-start.

### 5. Per-session reward history — new `src/hooks/useLotteryHistory.ts` + small UI
- In-memory ring buffer keyed by the active monster id (resets on tab close; persisted optionally to `sessionStorage` under `lov_lottery_history_v1`).
- Entry shape: `{ at, monsterId, tileType, tileLabel, emoji, value, luckyEnergy }`.
- Push from `GameBoard.tsx` inside the landing handler (where `lastResult` becomes the final tile) and from `LotteryRoulette.onLuckyEnergy`.
- Render a small "Last spins" list inside the existing settings/help area on the board (or a tiny collapsible chip near the wheel — final placement TBD with a screenshot pass, no new tabs).

### 6. E2E test — `src/components/LotteryRoulette.test.tsx`
Vitest + React Testing Library. Drives the component through a realistic roll cycle and asserts:

```text
- render with spinning=true, result=null, landedKey=1 → shows REEL icon, ticks
- transition to spinning=false, result="coins", landedKey=1 → shows 🪙 (ICONS.coins), no interval still running
- bump landedKey=2 with spinning=true → internal tick resets to 0, hidden=false, fresh spin starts
- transition to spinning=false, result="star", landedKey=2 → shows ⭐ exactly
- repeat 10 cycles in a loop, assert displayed icon === ICONS[result] every time
- assert no setInterval handles leak (use vi.useFakeTimers + getTimerCount)
```
Plus a unit test for `useLotteryHistory` (append + cap at N + sessionStorage round-trip).

## Out of scope
- Backend / RLS / schema changes.
- Dice physics, hop animation, reward economy tuning.
- New tabs, routes, or layouts beyond the mute-button relocation.
