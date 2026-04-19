

## Plan: Fix Auto-Roll Stoppage + Per-Level Island Direction

### Issue 1 — Auto-roll prematurely stops

**Root cause** in `src/components/GameBoard.tsx` `performRoll()`:
- After the dice tick interval ends, `onRollDice()` is called (which decrements `rolls` upstream via React state).
- The 900ms `setTimeout` then re-checks `rollsRef.current > 0` to schedule the next roll.
- `rollsRef.current` is updated via a `useEffect` watching the `rolls` prop. Between `onRollDice()` and the timer firing, if the parent's state update batches with another re-render or the prop is stale at check time, the timer sees `rollsRef.current <= 0` (stale 1) → enters the `else if` branch → calls `setIsAutoRolling(false)` and stops. Worst case: `rollDice()` returns `null` (e.g. loading state) so rolls aren't decremented — the next scheduled roll runs, but other races stop it.
- A second compounding bug: when `rolls` goes from 1→0 after the *intended* last auto-roll, code stops correctly, but if the user has plenty of rolls and the timer just *hasn't seen the ref update yet*, it stops incorrectly.

**Fix**: Decouple "is there budget to keep auto-rolling" from the stale `rollsRef`. Use the actual return value from `game.rollDice()`:
- Add a callback ref `onRollDiceRef` returning the roll result OR add a return value from `onRollDice` (`() => boolean`). Simpler: change `onRollDice` prop to `() => { ok: boolean; remaining: number }` so GameBoard knows authoritatively whether to continue.
- Also wrap the post-roll scheduling in a `useEffect` watching `rolls` prop directly: when `isAutoRolling && !isRolling && rolls > 0`, schedule a roll after 900ms; when `rolls <= 0`, set auto-rolling false. This eliminates the ref staleness entirely.

I will refactor to the **effect-based approach** since it's more robust:
```ts
// Replace internal scheduling with effect that reacts to fresh rolls prop
useEffect(() => {
  if (!isAutoRolling || isRolling) return;
  if (rolls <= 0) { setIsAutoRolling(false); return; }
  const t = setTimeout(() => performRoll(), 900);
  return () => clearTimeout(t);
}, [isAutoRolling, isRolling, rolls]);
```
And remove the inline `setTimeout` block from `performRoll`.

### Issue 2 — Monster running in circles after completing the loop

**Root cause**: `generatePath()` in `IsometricBoard.tsx` builds one fixed spiral of 30 tiles. After 30 steps, position wraps to 0 — the monster appears to teleport/dash back across the spiral, visually "running in circles".

**Fix**: Make the path layout shape change based on the player's **level** so each level feels like a different island:
- Add `levelId` (already passed to IsometricBoard) as a dependency of `generatePath`, and parameterize the path with one of several shapes per level:
  - L1 — outward spiral (current)
  - L2 — figure-8
  - L3 — zigzag river going north
  - L4 — inward spiral (reverse direction)
  - L5 — diamond/rhombus loop
  - L6 — S-curve climbing
  - L7 — two concentric arcs
  - L8 — straight ascending bridge to a peak
- Each path still has 30 nodes and is a closed loop returning near start, but the **direction & shape differ per level** so completing a loop and starting again on a higher level *looks* like a new island.
- Update `generatePath(tileCount, levelId)` and memoize on `levelId`.
- Bonus: when `position` wraps from 29 → 0 mid-game on the same level, smooth-teleport the monster (skip animation for that one wrap step) so it doesn't dash backwards. Detect with `prevPosition > newPosition + 5`.

### Files
- Edit: `src/components/GameBoard.tsx` — replace inline auto-roll scheduling with an effect; remove `autoRollTimerRef` chain.
- Edit: `src/components/IsometricBoard.tsx` — parameterize `generatePath(tileCount, levelId)`, add 8 shape variants, memoize on `levelId`; suppress monster dash on loop wrap in `MonsterPawn`.

### End-to-End Test
After build → on Game tab, hold PRESS for 2s to start auto-roll → observe rolls keep firing until they actually hit 0 (no premature stop). → Buy a Mega Pack to grant 50 rolls and trigger auto-roll: it should complete all rolls without stopping. → Trigger level-up by buying packs: confirm the 3D island path visibly changes shape (spiral → figure-8 → zigzag, etc.) per level. → Roll past tile 29: confirm the monster does NOT dash backwards across the whole spiral, but instead transitions cleanly to tile 0.

