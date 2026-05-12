## Scope

Six related changes across game polish, missions UX, monster behavior, ads ops docs, and a card-reveal bug fix.

---

### 1. Replace 2D dice animation with `Dice3D` in `GameBoard.tsx`

- Import `Dice3D` and gate it with a `prefers-reduced-motion` media query (and a 3D-disabled fallback for low-power mode via existing `lib/lowPower.ts`).
- During `performRoll`'s tick interval, keep updating `diceValue` (so 3D cube re-tumbles each tick by key change) — but render `<Dice3D value={diceValue ?? 1} tier={activeDiceTier}/>` in the corner badge instead of the plain number.
- Pass `active_dice_tier` from `useGameState` down through `GameBoard` props as `diceTier`.
- Tune `Dice3D` settle from 900 ms → match the existing finish window: roll completes after 12 ticks × 80 ms = ~960 ms, plus the post-roll hop delay. Change `Dice3D` settle constant to ~800 ms so the cube lands a hair before the monster starts hopping. Verify by watching `lastResult` arrive after the cube settles.
- Reduced-motion / low-power: render the existing 2D number badge instead of `<Canvas>`.

### 2. Daily Missions claim flow

`DailyMissionsModal` already calls `claim(code)` via `useDailyMissions`, which calls the `claim_mission` RPC and shows a `toast.success("Mission claimed!", { description: "+N kind" })` then refreshes. Verify it actually fires:

- Confirm `claim_mission` RPC returns the granted reward and updates `game_state` server-side (read the existing migration; if it doesn't grant, add a follow-up migration that updates `game_state` inside the RPC and returns `{kind, amount}`).
- After a successful claim, also call `game.refresh()` (or whatever the existing pattern is in `useGameState`) so coins/rolls/energy update in the HUD immediately.
- Make the Claim button show a brief loading state and disable while the RPC is in flight.
- Confirmation toast already exists via `sonner`; keep it but include the new server-issued amount in the description.

### 3. Monster searches for a friend monster

Light ambient behavior on the board, idle only (does not affect gameplay):

- In `IsometricBoard` / `MonsterDisplay` (whichever renders the active monster on the board), add an idle "searching" loop:
  - Every 8–14 s while not rolling, the monster turns its head left/right (rotateY tween), emits a small `🔍` thought bubble, and a tiny silhouette of a random unlocked-or-locked friend monster fades in nearby for ~1.5 s, then fades out.
  - Pull candidate friends from `src/data/monsters.ts` excluding the active monster.
  - Pause this loop while `isRolling` or while a `CardReveal` modal is open.
- New tiny component `FriendSearch.tsx` rendered inside the board container.
- Settings toggle `friend_search_enabled` (default on) in `SettingsDialog.tsx`, persisted to localStorage, mirroring the existing `celebrations_enabled` pattern.

### 4. CrazyGames Setup help panel

- New component `src/components/CrazyGamesSetupDialog.tsx` — a Dialog with a step-by-step checklist:
  1. Build the production bundle (`npm run build`) → produces `dist/`.
  2. Zip the `dist/` folder (instructions for mac/Win).
  3. Log in at developers.crazygames.com → Games → New Game → upload zip.
  4. Fill metadata (orientation, controls, age rating, thumbnail 1280×720, logo).
  5. Monetization tab → enable Rewarded Ads.
  6. Submit for review (24–72 h).
  7. Validation: open the published portal URL with `?crazygames=1` (already supported in `lib/ads.ts`), open devtools, confirm `[ads] CrazyGames SDK initialized` log, click a "Watch ad" button, confirm a real ad plays (not the 3 s demo).
  8. Note: real revenue only flows from games hosted on crazygames.com, not monsterpetcol.com.
- Each step has a checkbox; state persists to localStorage so the user can resume.
- Add an entry-point: button in `SettingsDialog.tsx` ("CrazyGames setup") and in `AdminPackAnalytics.tsx` admin page.

### 5. Lottery wheel above monster's head + pause until card collected

The current bug: when a tile awards a card, `CardReveal` opens but the result banner / `pendingCardFlips` triggers a loop (re-fires the reveal effect every tick).

- New component `LotteryRoulette.tsx`: a small horizontal strip that mounts above the monster's head from the moment the dice is rolled. It shows reward icons (coins, energy, card, star, bonus) sliding/rotating, and after the monster lands it snaps to the actual reward type from `lastResult.tile.type`. Driven by Framer Motion.
- Sequence: dice roll → wheel appears above monster, spins → monster does N hops → monster lands → wheel snaps to result icon → 300 ms pulse → wheel disappears → result banner shows briefly → if `pendingCardFlips > 0` the monster freezes (no idle bob, no friend-search) and `CardReveal` opens → on `onComplete`, monster resumes idle.
- Add a `frozen` prop / boolean to `IsometricBoard`/`MonsterDisplay` that disables idle animations while a card reveal is active.

### 6. Banner-loop fix (card never appears with a monster type)

In `src/pages/Index.tsx` lines ~531–549 the effect that opens `CardReveal` depends on `[game.pendingCardFlips, drawnCard, tab]`. The result banner re-render appears to trip the gate. Fix:

- Move banner rendering out of the same vertical stack as the card reveal so they don't compete for the same z-layer (banner sits at `z-30`, `CardReveal` should sit at `z-50` and be a true overlay over the board).
- Only open `CardReveal` after `showResult` from `GameBoard` has fired AND `pendingCardFlips > 0` AND no reveal is already open. Add a `revealOpenRef` guard so the effect cannot re-enter while a reveal is queued.
- When a monster-type tile (food/star) lands and also yields a card, draw the card AFTER the monster's hop completes (already gated by `onLanded`); ensure `drawnCard` only sets once per `pendingCardFlips` decrement.
- Hide the result banner while `CardReveal` is mounted to remove the visual overlap (`{!drawnCard && <Banner/>}`).

---

## Technical details

- Files added: `src/components/LotteryRoulette.tsx`, `src/components/FriendSearch.tsx`, `src/components/CrazyGamesSetupDialog.tsx`.
- Files edited: `src/components/GameBoard.tsx`, `src/components/Dice3D.tsx`, `src/components/IsometricBoard.tsx` (or `MonsterDisplay.tsx`), `src/components/DailyMissions.tsx`, `src/hooks/useDailyMissions.ts`, `src/components/SettingsDialog.tsx`, `src/pages/Index.tsx`, `src/pages/AdminPackAnalytics.tsx`.
- Possible new migration: ensure `claim_mission` RPC actually credits `game_state` and returns the granted amount.
- No new dependencies (three / framer-motion already installed).
- Out of scope: redesigning the dice tier shop, replacing IsometricBoard, native AdMob production IDs, leaderboard changes.
