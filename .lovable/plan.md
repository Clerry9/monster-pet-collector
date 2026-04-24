# Plan: Board polish, infinite path, longer levels, auto-roll & guest fixes

## 1. Bottom buttons overlap (BetSelector + roll dial + dock)

In `src/pages/Index.tsx`, the dial (lifted ~150px) sits on top of the BetSelector pill row, and on small screens the BET pill above the dial collides with the BetSelector row. Restructure the bottom stack:

- Wrap BetSelector + dock in a single `flex flex-col` column (already present) but add `gap` and a transparent spacer for the dial, so the dial's vertical space is reserved.
- In `src/components/GameBoard.tsx`, change the dial's fullscreen offset from a fixed `150px` to `calc(env(safe-area-inset-bottom,0px) + 4.25rem + 3rem)` and pin it relative to the bottom dock height. Move the AUTO pill from a left side-row into a slot tucked into the dial bottom-left so it stops shoving the BET pill off-center.
- Hide the standalone `BET ×N` pill above the dial when the BetSelector row is visible (it's redundant) — show it only when BetSelector is collapsed.
- Reduce dial size on portrait <380px to `w-[76px] h-[76px]` to keep clearance.

## 2. Make the island path feel infinite

Today `MonsterPawn` (`src/components/IsometricBoard.tsx`) advances `position` modulo `pathPoints.length`. When the player wraps from tile 29 → 0, the monster currently teleports back to the start of the visible island.

Approach: build a "rolling chunk" of path tiles around the player so the monster walks forward continuously and the world appears endless.

- Replace the fixed `pathPoints = generatePath(BOARD_TILES.length, levelId)` with a chunked generator that returns a window of tiles around the current absolute step (e.g. `[absoluteStep-4 .. absoluteStep+12]`). Keep `BOARD_TILES` semantics for game logic; only the **visual** path becomes infinite.
- Track an `absoluteSteps` counter (already exists as `totalSteps` in game state) and pass it to `IsometricBoard`. The renderer maps each visible tile to `BOARD_TILES[absIndex % BOARD_TILES.length]` for type/value, but uses a continuous Vector3 path generator seeded by `levelId` that produces points for any integer index (no wrap-around).
- Update `MonsterPawn` so `stepStart`/`stepEnd` interpolate between consecutive absolute path indices — it never resets to index 0.
- After each roll, slide the visible chunk forward (drop trailing tiles, append new ones) so the world scrolls under the monster. Camera keeps centering on the monster ref, so the player sees a continuous trail.
- Add a subtle "horizon fade" at the far end (existing fog already covers this).

## 3. Levels 60% longer

In `src/data/levels.ts`, `xpForLevel` uses `XP_BASE = 100` with 1.15 growth. Multiply per-level XP gap by 1.6 by setting `XP_BASE = 160`. This makes every level take 60% more XP without changing growth curve, level themes, or prestige math.

## 4. Award card after monster lands on the last island of the current roll

Currently `useGameState.rollDice` decides on a card synchronously the moment the dice is rolled, and `Index.tsx` immediately calls `setDrawnCard(result.card)`, so the CardReveal can pop before the hopping animation finishes.

- In `src/pages/Index.tsx`, defer the `setDrawnCard(result.card)` call and the toast for `islandStarEarned` until the GameBoard's "landed" event fires.
- In `src/components/GameBoard.tsx`, expose an `onLanded` callback prop that is fired inside the existing `resultTimerRef` block after `landDelay` (where `setShowResult(true)` already runs). Pass `onLanded={() => { if (lastResult?.card) setDrawnCard(lastResult.card); ... }}` from Index.
- Also gate card-flip auto-trigger (`pendingCardFlips` effect) so it waits until `isRolling===false` and the landing tick has fired.

## 5. Auto-roll won't stop

Two issues in `src/components/GameBoard.tsx`:
- The `useEffect` that schedules the next roll re-fires on every `rolls`/`isRolling` change. If the user taps STOP while a roll is mid-flight, `isRolling` flips false, the effect re-schedules another roll because `isAutoRolling` was still true for one render before React commits the stop.
- `handlePressStart` toggles stop only on pointer-down, but the dial's `onPointerUp` then runs `handlePressEnd(true)` which can call `performRoll()` again because `justStoppedRef` was cleared too early.

Fixes:
- In the auto-roll effect, also bail out if `isAutoRollingRef.current === false` inside the setTimeout callback (already there) AND clear any pending timer in the effect cleanup synchronously.
- In `stopAutoRoll`, also set a `lastStopAt = Date.now()` timestamp; in `performRoll`, refuse to start if `Date.now() - lastStopAt < 250` AND `isAutoRollingRef.current === false`. This kills the race between pointer-up and the queued timeout.
- In `handlePressEnd`, only trigger a single roll if `!isAutoRollingRef.current && !justStoppedRef.current && wasHolding && triggered` — keep `justStoppedRef` set true for ~300ms after a stop, then clear it.
- The AUTO pill button click handler also needs the same guard so the dedicated STOP button reliably stops.

## 6. Guest username + persisted last position

Today guest users get an anonymous Supabase user with no `display_name`, and `game_state` does load by `user_id`, so position already persists for guests as long as the same anon session is kept. Reinforce this:

- In `src/hooks/useAuth.tsx`, after a successful anonymous sign-in, if `profiles.display_name` is null, generate a random fun handle (`Goblin#1234`, `Slime#7782`) and `upsert` it into `profiles` for that user_id.
- Add a tiny effect on app start: if `user.is_anonymous && !user.user_metadata.guest_name`, call `supabase.auth.updateUser({ data: { guest_name: <generated> } })` so the name follows the session.
- Surface the guest name in the `TopHud` (small chip near the level badge) so the user can see it.
- Confirm `useGameState` already reloads from DB on user change (it does, line 211–249) — no extra work, but ensure the local-storage flush on sign-in upserts the latest guest position before reading the row back. Already implemented.

## 7. Energy bonus → lightning bolt

The `bonus` tile already uses `LightningBolt` in 3D, but its 2D emoji and side panels still use `⚡`. The user wants a clearly stylised lightning bolt. Replace:
- `TILE_EMOJIS.bonus` in `src/components/GameBoard.tsx` from `"⚡"` to a `<Zap />` lucide icon (render conditionally — change the result-banner code to render a Zap component when `tile.type === "bonus"`).
- In `IsometricBoard.tsx` `LightningBolt`, replace the cone with a proper extruded zigzag bolt `THREE.Shape` (filled yellow, gold emissive). When the monster lands on a bonus tile, fire a `pointLight` flash + a yellow particle burst (hook into existing `spawnParticles` via a new `onLanded` event for the `bonus` type). Already-existing `triggerSkullEffect` pattern can be mirrored as `triggerBonusEffect`.

## Technical notes

- Files to edit: `src/components/GameBoard.tsx`, `src/components/IsometricBoard.tsx`, `src/pages/Index.tsx`, `src/data/levels.ts`, `src/hooks/useAuth.tsx`, `src/hooks/useGameState.ts` (add `absoluteSteps` accessor; `totalSteps` already exists), `src/components/TopHud.tsx` (guest name chip).
- No DB migrations required — `total_steps`, `position`, and `profiles.display_name` already exist.
- No new dependencies.

## Out of scope

- Reshuffling tile distribution or rebalancing rewards.
- Rewriting the season/battle pass system.