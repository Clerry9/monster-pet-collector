# Lottery wheel — debug & QA

## Enable debug overlay

- `localStorage.setItem("lov_lottery_debug", "1")` then reload, **or**
- visit any board URL with `?lotteryDebug=1`.

The HUD (top-right of the board) shows:
`tile`, `steps`, `isRolling`, `showResult`, `spinning`, and the wheel `key/absStep`.
Every state change is also logged via `console.debug("[lottery]", …)`.

## Expected per-roll lifecycle

1. Tap roll → `isRolling: true`, `spinning: true`, wheel reel ticks.
2. Dice settles → `isRolling: false`, `spinning: true` (still locked-on-the-way-down), monster hops.
3. Monster lands → `showResult: true`, `spinning: false`, wheel snaps to **exactly** `ICONS[tile]` (or ⚡ on lucky bonus).
4. Next roll → `landedKey` (absStep) bumps, internal state resets, bubble disappears immediately.

## Red flags

- Wheel still ticking with `spinning: false` → reset effect didn't fire (check `landedKey` actually changed).
- Displayed icon ≠ `tile` while `showResult: true` → render fallthrough bug.
- Bubble lingers across rolls → `hidden`/unmount logic regressed.