
## Plan: Island Stars, Camera Tracking, Fullscreen Board & Spin Cooldown

### 1. Island Star Prize System
- Add `island_stars` (integer) and `pending_card_flips` (integer) to `game_state` table via migration.
- In `useGameState.ts`, when player lands on a tile that crosses into a new "island" (group of ~5 tiles forming an island in `IsometricBoard.tsx`), award **1 star** with 30% random chance, plus always award when landing on the existing `star` tile type.
- Stars accumulate; spending 5 stars → unlock a card flip (consumed by mini-game reward).

### 2. Mini-Game Earns Stars → Card Flips
- Update `MiniGame.tsx` and `MiniGameJack.tsx`: collected symbols still count for season progress, but **completing a round now also converts every 10 symbols → 1 star**, and reaching 5 stars triggers a "FLIP A CARD" reward (animated card flip from `CardReveal.tsx`).
- Show a small ⭐ star counter pill at the top of the mini-game.

### 3. Spin Wheel 12-Hour Cooldown
- Add `last_spin_at` (timestamptz) column to `game_state`.
- In `SpinWheel.tsx`: on spin, write timestamp; on mount, compute remaining = 12h − (now − last_spin_at). If > 0, show countdown ("NEXT SPIN IN 11:23:45") and disable button.

### 4. Fix Auto-Spin Stuck Bug (GameBoard.tsx)
- Bug: `performRoll` schedules `setTimeout(() => performRoll(), 600)` but `setIsRolling(false)` is async — next tick may see stale state. Fix by:
  - Using `isRollingRef.current = false` immediately before the setTimeout.
  - Guarding the auto-roll chain with both `rollsRef.current > 0` AND `!isRollingRef.current`.
  - Ensuring `onRollDice()` completes before scheduling next roll (await position settle via 800ms delay matching monster hop animation).

### 5. Camera Tracks Beside the Monster (IsometricBoard.tsx)
- Replace static-target `CameraRig` with one that lerps `targetPos` to `pathPoints[currentMonsterPos]` on every frame (not just on transition).
- Camera offset: `(monster.x + 5, monster.y + 4, monster.z + 5)` — sits to the side and slightly above, like an over-the-shoulder chase cam.
- Disable `OrbitControls` panning during movement; re-enable for free look when idle (>2s after last move).

### 6. Fullscreen Game Board with Layered Buttons
- In `Index.tsx`: when on the Game tab, render `IsometricBoard` as `fixed inset-0 z-0` filling the entire viewport.
- Layer header, side rails, BET selector, and PRESS button as `fixed` overlays with `z-10`+ and `pointer-events-auto` on controls only (board canvas keeps gestures).
- Bottom controls dock: `fixed bottom-0 left-0 right-0` with safe-area padding and a translucent gradient backdrop.
- Other tabs (Event, Shop, Cards, Monsters) remain in normal scroll layout.

### 7. Fix Console Warnings
- Wrap `SeasonBurst`, `CrystalCluster`, `GlowingChest`, `TileIcon` in `React.forwardRef` since framer-motion / r3f pass refs through.

### Files to create/edit
**Edit**: `src/components/GameBoard.tsx`, `src/components/IsometricBoard.tsx`, `src/components/MiniGame.tsx`, `src/components/MiniGameJack.tsx`, `src/components/SpinWheel.tsx`, `src/hooks/useGameState.ts`, `src/pages/Index.tsx`.
**Migration**: add `island_stars`, `pending_card_flips`, `last_spin_at` to `game_state`.

### End-to-End Test
After implementation: clear localStorage → verify auto-spin chains 10 rolls without stalling → camera follows monster around the loop → land on multiple islands to collect stars → play mini-game, hit 5 stars, flip a card → spin wheel, refresh, see 12h cooldown → confirm board fills the screen with controls floating on top.
