## Problem

`TopHud` still crashes with `Cannot read properties of null (reading 'toLocaleString')`. Previous fix guarded the top-level number props (gems, coins, xp, etc.), but the prize-roulette reward object itself can have `null` fields that flow straight into `.toLocaleString()`.

Two unguarded paths feed the `preview` reward state:

1. `get_pending_island_landing_reward` RPC (line ~218) — row columns (`amount`, `label`, `emoji`, `kind`) are written into `setPreview` with no validation. If any column is null, every later read of `preview.amount.toLocaleString()` crashes.
2. `lock_island_landing_reward` RPC (line ~272) — same pattern when building `final` from `row`.
3. `pickFromPool` (line ~71) falls back to `pool[0].build()`. If `pool` is briefly empty (loading), this throws and tears down the HUD.

Crash sites that consume those values without guards: lines 172, 181, 440, 514 (`*.amount.toLocaleString()`), plus 402/409 (`preview.amount` in aria text).

## What to build

Single small fix, no behavior change for the happy path.

### 1. Add a `sanitizeReward` helper in `TopHud.tsx`

Takes any partial/unknown reward-shaped object plus a fallback `Reward` and returns a fully-populated `Reward`:

- Coerce `amount` to a finite number (default 0).
- Coerce `kind`, `label`, `emoji` to strings; fall back to the local pool pick if missing.
- Used everywhere a reward enters component state from an untrusted source.

### 2. Wrap both RPC paths

- `get_pending_island_landing_reward` effect: pass `row` through `sanitizeReward(row, pickFromPool(pool))` before `setPreview`.
- `lock_island_landing_reward` block in `runReveal`: same treatment when building `final`.

### 3. Make `pickFromPool` null-safe

If `pool` is empty or the weighted pick fails, return a hardcoded minimal `Reward` (`{ kind: "coins_small", amount: 0, label: "Coins", emoji: "🪙" }`) so the HUD never receives `undefined`.

### 4. Defensive `.toLocaleString()` reads

Replace the four bare `*.amount.toLocaleString()` calls with `(amount ?? 0).toLocaleString()` so a future regression can't crash render.

## Verification

- Reload the page while a server-locked reward exists (the failing path) — HUD should render the prize circle, no error boundary.
- Sign out (RPC fails silently) — HUD should keep cycling local previews.
- Open the page with no game state — no crash, prize circle shows a placeholder until pool loads.

## Files touched

- `src/components/TopHud.tsx` — only file in scope.
