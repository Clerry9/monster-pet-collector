# Plan: Island Reward Persistence, Guard, Summary & Analytics + Guest Auth Test

## 1. Guest Auth Button Test (`src/pages/Auth.test.tsx`)
New Vitest + React Testing Library test that mounts `<Auth/>` with mocked `supabase.auth.signInAnonymously` and `useNavigate`:
- Asserts button shows "Starting guest session…" while pending.
- Asserts button is `disabled` and `aria-busy="true"` during the call.
- On resolve → asserts `navigate("/", { replace: true })` (current `successRedirect`) fires.
- On reject → asserts `toast.error` is invoked with a clear message and button re-enables.

## 2. Island Reward Persistence
Currently `useBonusInventory` already persists shards / minigame tokens / build discount / monster buff to `localStorage`. Energy goes through `game.addEnergy` (already persisted via `useGameState`). Skull coin loss currently mutates `game.coins` but the **pending grant** isn't checkpointed — if the user refreshes mid-popup the bonus is lost.

Add a `pendingBonus` slot to `useBonusInventory`:
- `setPendingBonus(reward, landingId)` called the moment a bonus is rolled in `Index.tsx`, before any UI shows.
- `commitPendingBonus(landingId)` called once the user dismisses/claims, applying the effect (already-implemented switch in `Index.tsx`) and clearing.
- On mount, if `pendingBonus` exists, replay it through `commit` automatically so a mid-animation refresh still credits the reward exactly once.

## 3. Single-Grant Guard per Landing
- Generate a `landingId` (uuid) each time the monster lands on a tile in `Index.tsx`.
- Track `grantedLandingIds: Set<string>` (also persisted in localStorage, last 50 entries).
- `commitPendingBonus` short-circuits if the id is already in the granted set.
- Card-reveal re-renders or refreshes cannot double-credit.

## 4. Reward Summary Panel
New `src/components/IslandRewardSummary.tsx` shown after the existing `BonusRewardToast` / `LandingRewardPopup` is dismissed (or inline at the bottom of the popup as a final step):
- Header: reward type icon + label (Energy / Shards / Mini-Game Item / Skull Bust / Buff / Discount).
- Body: before → after balance for whichever resource changed (coins for skull, energy for energy, shards for shards, etc.).
- A single "Got it" button.
- Wired into the existing dismiss flow in `Index.tsx`; uses snapshots captured at grant time.

## 5. Analytics Events
Add a tiny helper `src/lib/analytics.ts` (no new deps; uses `window.dataLayer?.push` if present and always `console.info("[analytics]", …)` in dev):
- Emit `island_landing` with `{ landingId, rewardKind, amount, coinsBefore, coinsAfter, energyBefore, energyAfter }`.
- Fired inside `commitPendingBonus` so it's guaranteed to run **exactly once** (guard above).
- New test `src/lib/analytics.test.ts` asserts: granting the same `landingId` twice only fires one event; skull deduction reports correct before/after.

## Technical notes
- No DB schema changes — persistence stays in `localStorage` to match existing `mpc-bonus-inv-v1` pattern.
- No changes to `bonusRewards.ts` reward pool.
- Only frontend/presentation + a thin analytics helper.

## Files
- add `src/pages/Auth.test.tsx`
- add `src/components/IslandRewardSummary.tsx`
- add `src/lib/analytics.ts` + `src/lib/analytics.test.ts`
- edit `src/hooks/useBonusInventory.ts` (pending + granted-ids)
- edit `src/pages/Index.tsx` (landingId, commit flow, summary wiring, analytics)
