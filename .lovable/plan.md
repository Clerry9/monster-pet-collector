

## Plan: Leaderboard, Streak Saver, Camera Fly-by, Bigger Board, Side Rails & New Mini-Game

### 1. Season Leaderboard with Podium (Top Symbol Earners)
- **DB migration**: add `season_leaderboard` view (or materialized query) — pull top 20 from `season_progress` where `season_id = current`, ordered by `symbols DESC`. Plus add a `display_name` column to `profiles` if missing (fallback to "Player ####").
- **RLS**: leaderboard read = `true` for authenticated users (only exposes username + symbol count, no sensitive data).
- **Component** `src/components/SeasonLeaderboard.tsx`: shows golden podium for top 3 (animated rise-in, crown on #1) and a scrollable list (4–20). Highlights current user's row.
- Tab into `SeasonHub` as a new section ("LEADERBOARD") below the battle pass track, plus a small button at top-right of hero banner.

### 2. Streak Saver Power-Up (Mini-Game)
- New shop item in `MiniGame.tsx`: 💎 "Streak Saver" — costs 500 coins, extends combo window from 2s → 4s for one game.
- Add a small button above the play board during `phase === "playing"`. Pulses gold when combo is active. Consumes from `game.coins` via prop callback.
- Wire `onBuyStreakSaver: () => boolean` from `SeasonHub` → `Index.tsx`.

### 3. Larger Game Window + Side Rails (image-inspired layout)
- `IsometricBoard` height: `h-[400px]` → `h-[520px]` (mobile-friendly, using `min(70vh, 560px)`).
- New `src/components/SideRails.tsx`: two vertical floating columns (left/right of the board on wider viewports, collapsible drawers on narrow). Show stacked icon-tiles for: Mini-Game, Daily Reward, Spin Wheel, Specials, Quests, Leaderboard, with countdown timers under each (mimicking the screenshot). Each opens its respective tab/modal.
- Restructure `Index.tsx` board view: rails-left | board-center | rails-right. On <420px width, render rails as scrollable horizontal strips above/below the board.
- Move bottom controls (BET, PRESS dice button) into a fixed lower zone, matching uploaded image's central blue dice button.

### 4. Camera Fly-by Animation (Island Hop)
- In `IsometricBoardScene`, replace the static `OrbitControls.target` with a `CameraRig` component using `useFrame` that smoothly lerps both `camera.position` and `lookAt` between `pathPoints[prevPos]` → `pathPoints[position]` over ~0.6s when position changes (cinematic swoop). 
- Adds slight orbit arc (Y-axis offset peak) for fly-by feel. `OrbitControls` re-engages once arrival settles (gated by a `flying` ref).

### 5. New Mini-Game Variant: "Jack-in-the-Box" Puzzle Piece Hunt
- A second mini-game type (rotates with seasons or selectable). `src/components/MiniGameJack.tsx`: 3×3 grid of face-down puzzle pieces; tap to flip, find pairs of season symbols hidden behind. Each pair = 2 symbols. 8 flips total. Themed splash screen ("FIND THE 🎵 BEHIND PUZZLE PIECES") matching the uploaded reference.
- `SeasonHub` shows two play buttons: "Match-3" (existing) and "Jack-in-the-Box" (new).

### 6. End-to-End Test
After implementation runs: the user manually verifies on mobile viewport per the test checklist (clear localStorage → coachmarks → rotation modal → Play Now → NEW badge clears → countdown pill → 3 rolls → season burst → mini-game combo → Buy Pass checkout opens).

### Files to create/edit
**Create**: `SeasonLeaderboard.tsx`, `SideRails.tsx`, `MiniGameJack.tsx`, migration for leaderboard read policy + `display_name`.
**Edit**: `IsometricBoard.tsx` (camera rig, taller canvas), `MiniGame.tsx` (streak saver), `SeasonHub.tsx` (leaderboard slot, second mini-game), `Index.tsx` (side rails layout, streak-saver wiring).

### Notes / Trade-offs
- The full Coin Master rail of 12+ live-event icons is decorative-only in the screenshot; we'll use 6 functional ones tied to existing features.
- Camera fly-by disables `autoRotate` during transit to avoid spin conflicts.
- Leaderboard is read-only & anonymous-friendly: guest users see "Sign in to appear on the board" CTA in their own row slot.

