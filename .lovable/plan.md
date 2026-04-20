

## Plan: Fix Island Rendering + Stuck Roll Button

### Issue 1 — Island theme falls back to Level 1 for all levels above 8

In `IsometricBoard.tsx`, `getTheme(levelId)` does `LEVEL_THEMES[levelId] || LEVEL_THEMES[1]`. Since only themes 1-8 exist, **every level from 9 through 1200 silently renders the Goblin Forest theme**, even though the path shape correctly cycles. This makes higher-cycle levels look identical to Level 1 (wrong colors, wrong foliage), which is what's reported as "islands aren't rendering correctly".

**Fix:** cycle `levelId` through the 8 themes the same way `generatePath` does:
```ts
function getTheme(levelId: number): LevelTheme3D {
  const cycled = ((levelId - 1) % 8) + 1;
  return LEVEL_THEMES[cycled] || LEVEL_THEMES[1];
}
```

### Issue 2 — `forwardRef` warnings on `DeadTree` / `CloudPuff` / `LevelFoliage`

React-three-fiber attaches refs to elements as part of its reconciler. When `LevelFoliage` (a plain function component) is used as if it were an R3F primitive, R3F may try to forward a ref to it. The console errors are noisy and may suppress some renders. Fix by wrapping `DeadTree`, `CloudPuff`, and `LevelFoliage` with `React.forwardRef` (just accept and ignore the ref, or forward to the inner `<group>`). Lowest-risk fix: wrap all 8 foliage variants and `LevelFoliage` with `forwardRef` and forward to the root `<group>` / `<mesh>`.

### Issue 3 — Roll button gets stuck, requires page refresh

Looking at `GameBoard.tsx` `performRoll()`: if a user taps PRESS while `rollsRef.current` is stale at 0 (immediately after a previous roll, before parent re-render), the function returns early WITHOUT clearing `isRolling` — but it also doesn't *set* `isRolling`, so that path is fine. The actual stuck case:

- `performRoll` sets `isRolling = true`, runs the dice tick interval (~1 second).
- After ticking, calls `onRollDice()` (parent reduces rolls + updates state) and `setIsRolling(false)`.
- **But** `onRollDice()` in the parent is the hook's `rollDice()` which checks `if (state.rolls <= 0) return null` synchronously against possibly-stale closure state. If the user's state save is in flight (we see flooding 409 errors against `game_state`), the React state can lag and `rollDice()` no-ops → the parent's `rolls` prop never decrements → next tap sees `rollsRef.current > 0` and works → BUT if the user double-taps quickly, `performRoll` is re-entered and `setIsRolling(true)` happens before the prior tick interval finishes its cleanup, leaving a stuck `isRolling=true` whose interval is orphaned. Also: any thrown error inside the interval (e.g. failed `sfxDiceTick`) leaves `isRolling=true` permanently because there's no try/finally.

**Fixes in `performRoll`:**
1. Wrap the entire roll lifecycle in a `try/finally` so `setIsRolling(false)` and `isRollingRef.current = false` ALWAYS run.
2. Store the `setInterval` id in a ref and clear it on unmount + at the start of every new `performRoll` (defensive — prevents orphaned intervals).
3. Add a "watchdog" `useEffect` that detects `isRolling` stuck for >2 seconds with no dice updates and force-resets it.

### Issue 4 — Flooding 409 errors on `game_state` upsert (related to "stuck" feeling)

Every save is POSTing without specifying `onConflict`, so PostgREST treats it as an insert and trips the unique constraint. The `prefer: resolution=merge-duplicates` header isn't enough on its own — supabase-js needs `.upsert(row, { onConflict: 'user_id' })`. These failed saves don't break gameplay but flood the network panel and may slow re-renders enough to compound the stuck-button feel.

**Fix:** in `useGameState.ts`, change both upsert calls to `.upsert(stateToDb(...), { onConflict: 'user_id' })`.

### Files to edit
- `src/components/IsometricBoard.tsx` — fix `getTheme` to cycle levelId; wrap foliage components with `forwardRef`.
- `src/components/GameBoard.tsx` — try/finally + interval ref + watchdog in `performRoll`.
- `src/hooks/useGameState.ts` — add `{ onConflict: 'user_id' }` to both `.upsert` calls.

### End-to-end test
1. Open game, tap PRESS rapidly 10 times in a row — confirm button never gets stuck on the dice spinner; if it ever does, the watchdog auto-clears within 2 seconds.
2. Use "🧪 +10,000 XP" to push past level 8 — confirm theme cycles correctly (Level 9 = Goblin Forest II with the **same green wood look as Level 1**, Level 10 = Crystal Caves II in cyan, etc.) and the path shape changes per level.
3. Open browser network panel — confirm `game_state` POSTs return 201/200 instead of 409.
4. Confirm console no longer shows the `forwardRef` warnings for `DeadTree`, `CloudPuff`, `LevelFoliage`.

