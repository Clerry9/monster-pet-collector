## Scope

Four focused changes — all frontend except a small data file for energy refill packs (no schema changes).

### 1. FriendSearch debug panel (QA)

New component `src/components/FriendSearchDebug.tsx`, mounted only when `?debug=friend` is in the URL or `localStorage.lov_debug_friend === "1"`.

Shows a small fixed-bottom-left card with:
- **Enabled:** ON / OFF (live, listens to `friend-search:changed`)
- **Paused reason:** `idle | rolling | hopping | reveal` (driven by props from `Index.tsx`)
- **Next bubble in:** countdown in seconds (extract the schedule from `FriendSearch` into a small `useFriendSearchSchedule` hook so the panel and the bubble share one source of truth)
- Buttons: "Force bubble now", "Toggle enabled"

Refactor `FriendSearch.tsx` to expose the next-fire timestamp via a module-level event bus (`friend-search:next`) so the panel can read it without prop drilling.

### 2. Dice3D landing test harness

New file `src/components/Dice3D.test.tsx` using the existing Vitest + jsdom setup.

- Mock `@react-three/fiber` `Canvas` to a div that renders children, and stub `useFrame` to call its callback once with elapsed >= settleMs (so the cube reaches its final rotation synchronously).
- Loop 1..6 and assert `Dice3D` in **reduced-motion** mode renders the exact face number as text.
- Loop 1..6 in **normal** mode and assert the `<Cube>` final rotation matches `FACE_ROT[face]` (extract `FACE_ROT` to a named export so the test can import it).
- Add a small integration test that simulates `GameBoard`'s pattern: mount `<Dice3D value={random}/>`, then re-render with `value={serverSteps}` and assert the resolved face equals `serverSteps`.

No new dependencies.

### 3. Lower monster below the energy pill

In `src/pages/Index.tsx` board view (~lines 941–1005):
- Add `z-10` (or `z-0`) to the monster/board container and bump the floating energy pill row to `z-20` so the energy pill sits above the board chrome but the **monster sprite + LotteryRoulette + FriendSearch bubbles** that float above the monster's head are no longer clipped/overlapped by the pill.
- Add `mt-12` (or translate-y) to the monster wrapper inside `GameBoard` so the headroom above the monster is visible under the energy pill.
- Verify in the 828×724 viewport that the lottery reel + friend bubble are fully visible above the monster.

Pure CSS / layout — no logic changes.

### 4. Out-of-energy refill packs

When `game.energy < cost` and the user taps Roll (already toasts "Not enough energy"), open a new `EnergyRefillModal`:

- New component `src/components/EnergyRefillModal.tsx`.
- New data file `src/data/energyPacks.ts` with three tiers (Small +20⚡, Medium +60⚡, Mega +200⚡ + small bonus coins). Prices reuse existing Paddle price IDs pattern (placeholders ok; user fills real IDs in admin/pricing).
- Two CTAs per pack: **Buy** (uses existing `usePaddleCheckout`) and **Watch ad for +5⚡** (uses existing `RewardedAdButton` + `useRewardedAd` to grant via the existing reward RPC).
- Trigger points:
  1. Roll attempt fails for energy in `Index.tsx` (replace plain toast with toast + "Refill" action that opens the modal).
  2. Auto-open once per session when `game.energy === 0` and the user lands on the board tab.

No DB migration: ad-grant uses the existing `grant_reward` flow; paid packs piggyback on the existing webhook-credited entitlements (we just add new SKUs to the local `energyPacks.ts` mapping; real fulfillment can be wired in a later pass — flagged in code with a TODO comment).

## Files

**New**
- `src/components/FriendSearchDebug.tsx`
- `src/components/Dice3D.test.tsx`
- `src/components/EnergyRefillModal.tsx`
- `src/data/energyPacks.ts`

**Edited**
- `src/components/FriendSearch.tsx` — export `FACE_ROT` not needed here; emit `friend-search:next` event with next-fire ts; add `forceBubble()` helper.
- `src/components/Dice3D.tsx` — `export const FACE_ROT`; add `data-testid="dice3d-face"` on the reduced-motion fallback.
- `src/pages/Index.tsx` — z-index fix, mount `FriendSearchDebug`, mount `EnergyRefillModal`, replace energy toast with action toast, auto-open on zero-energy.
- `src/components/GameBoard.tsx` — small top padding above monster; pass current `pausedReason` ("rolling" | "hopping" | "reveal" | "idle") up via a callback or shared store so the debug panel reflects it.

## Out of scope

- New Paddle product creation / real fulfillment wiring (placeholder SKUs only).
- Any DB migration.
- Changes to dice tick interval (already tuned in previous step).
- Changes to mission/claim flow.