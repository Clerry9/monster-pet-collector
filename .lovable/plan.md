## Goal

Add a documented QA checklist plus a small set of code tightenings so the three flows are demonstrably correct: daily mission claim, FriendSearch idle loop, and Dice3D landing alignment.

## 1. Daily Missions claim — end-to-end QA

Add `docs/QA-daily-missions.md` with this checklist, plus the small code fixes below.

Checklist:
- Happy path: complete a mission (e.g. roll 5×), open modal, claim button enables, spinner shows, toast fires `+N kind`, HUD updates (coins/rolls/energy), button switches to "Claimed", row dims, badge counter on launcher decrements.
- Idempotency: clicking Claim twice quickly only credits once (button disabled while `claimingCode` set).
- Refresh: after claim, `refresh()` reloads list; reopening modal still shows "Claimed".
- Multiple ready: claim each in turn; only one spinner at a time.
- Slow network: throttle to "Slow 3G" in DevTools; spinner stays visible until RPC resolves; UI not duplicated; no double-credit if user clicks again.
- Failure: temporarily point RPC to a bad name (or simulate via a dev flag) — toast.error fires, button returns to "Claim", no reward credited.
- Auth: signed out → modal shows empty state, no RPC fired.
- Day rollover: change `mission_date` row to yesterday in DB → `get_or_roll_daily_missions` rolls fresh set; previous claims do not bleed in.
- A11y: focus trap on modal, Esc closes, claim button reachable by keyboard, aria labels read counts.

Code tightenings in `useDailyMissions.ts` / `DailyMissions.tsx`:
- Wrap `claim` in try/finally so `setClaimingCode(null)` always runs even on thrown error.
- After successful claim, also call `game.refresh?.()` (export a hook callback or trigger via window event already used) so HUD updates without waiting for next poll.
- Add a `data-testid="claim-<code>"` for future automated tests.

## 2. FriendSearch loop — pause/resume + persistence QA

Add `docs/QA-friend-search.md` with:
- Idle: with no rolling/reveal, a 🔍 + friend silhouette appears every 8–14 s, lasts ~1.6 s, then hides.
- Pause on roll: while dice ticking (`isRolling=true`), no new bubble appears; any visible bubble clears.
- Pause on hop: while monster hopping (between roll end and `showResult=true`) the bubble stays cleared (covered by `paused = !!lastResult && !showResult`).
- Pause on CardReveal: when a card opens, GameBoard receives `frozen=true` → bubble cleared and no new schedule.
- Resume: after reveal closes, schedule restarts within ≤14 s.
- Toggle off: SettingsDialog → "Friend search" → off; reload page; bubble never appears.
- Toggle on: re-enable; reload; bubble returns.
- Monster swap: switch active monster; new silhouettes exclude the new active one.

Code tightening in `FriendSearch.tsx`:
- Re-read `getFriendSearchEnabled()` inside the schedule tick rather than only at effect mount, so toggling without remount takes effect immediately. Also expose a `friend-search:changed` window event dispatched by `setFriendSearchEnabled` and listen for it to force a reschedule.
- When `paused` flips true, ensure any pending `setTimeout` (the 1600ms hide) is cleared (currently only the outer `timer` is cleared).

## 3. Dice3D timing — match server roll result

Current chain (in `GameBoard.tsx` `performRoll`):
- Tick interval = 80 ms, count > 12 → finish (~12 × 80 = 960 ms ticking).
- After `finish()` fires `onRollDice()`, parent updates `lastResult`; an effect waits `min(steps,12) × 110 + 250` ms before showing banner / calling `onLanded`.
- Dice3D is given the new `value` (last random tick value) — but the *true* server result is in `lastResult.steps`, not the random tick.

Fix:
- Pass `lastResult?.steps` to `<Dice3D value=…/>` once the roll finishes, instead of the random `diceValue`. While `isRolling` is true keep showing the random `diceValue` for tumble flavor; when ticking ends and `lastResult` is set, swap to `lastResult.steps` so the face that lands is always the authoritative server number.
- Set `Dice3D` `settleMs` to match the visible interval: use `settleMs={reducedMotion ? 0 : 700}` so the cube finishes settling before the hop begins (hop start delay ≈ 250 ms after `lastResult` arrives via the landing timer; the cube needs to land in the same window to feel synced).
- Reduced-motion mode already returns the flat number tile — make sure it renders `lastResult?.steps ?? diceValue ?? 1` so the displayed number equals the server roll without any tween.

QA checklist (`docs/QA-dice3d.md`):
- Roll 20×; for each, after tumble the visible top face equals the steps moved (compare to result banner number).
- Reduced motion ON (Settings or OS): flat tile shows server number immediately on roll end; no canvas mounted (verify no `THREE.WebGLRenderer: Context Lost` in console).
- Background tab: switch tabs mid-roll; on return the watchdog finishes the roll and the dice still shows the server number, not a random tick.
- Tier visuals: switch dice tier basic→silver→gold; colors update; settle timing unchanged.
- Performance: no >50 ms long task on roll end on a mid-tier laptop.

## Files touched

- New: `docs/QA-daily-missions.md`, `docs/QA-friend-search.md`, `docs/QA-dice3d.md`
- Edit: `src/hooks/useDailyMissions.ts` (try/finally, refresh hook), `src/components/DailyMissions.tsx` (test ids)
- Edit: `src/components/FriendSearch.tsx` (live toggle, clear hide timer on pause)
- Edit: `src/components/GameBoard.tsx` (feed `Dice3D` the server `lastResult.steps` after tumble, tune `settleMs`)

## Out of scope

- New automated Vitest/Playwright suites (docs only for now).
- Changes to the `claim_mission` SQL RPC.
- Visual redesign of the mission modal or dice.
