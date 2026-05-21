# Plan — Roulette polish, collection, a11y settings, push reminders

Scope is deliberately frontend + a small amount of service-worker/notification glue. No schema changes.

## 1. Lucky Roulette — fix the broken loops

In `src/components/LuckyRouletteModal.tsx`:

- **Stuck after spin (no CLAIM on miss path / no Spin Again after claim).** Rework phase reset:
  - On `handleClaim`, after granting reward, fully reset `phase → idle`, `pick → null`, `winningSlot → null`, `claimed → false`, `claiming → false`, `activeSpinId → null`, and clear `lastReceipt` so the reward summary disappears once claimed (per user request).
  - On `handleSpinAgain` (miss), same hard reset.
  - Guard `startSpin` so it can ALWAYS re-enter from `idle` (today it bails when `phase === "spin"` only, but a stale `winningSlot` from a previous spin was blocking the wheel — also clear it at the top of `startSpin`).
- **Modal re-opening after close.** In `src/pages/Index.tsx`, the tutorial effect at line 1339 unconditionally drives `setLuckyOpen(!!isRouletteStep)` on every render of that step, which re-opens after the user closes. Gate it with a ref so it fires once per tutorial-step entry, and never re-opens if the user already dismissed during that step.
- **One-roll-only auto-open.** Add a session ref `autoOpenedThisRollRef` so any external trigger (lucky tile, tutorial) opens the modal at most once per board roll.
- **Persisted receipt cleanup.** Remove the "kept after claim" behavior — once `claimed === true`, set `lastReceipt = null` and skip rendering the receipt block.

## 2. Live odds/reward preview panel (roulette)

Still in `LuckyRouletteModal.tsx`, add a compact **Preview** card above the wheel that updates live as `pick` / `focusedSlot` changes:

- Shows: picked emoji + label, odds (`oddsPerSlot%`), exact win text (`+{amount} {label} if ball lands here`), exact miss text (`Otherwise: 0 — try again or spend ${PAID_SPIN_COST}🪙`).
- Bound to `pick ?? focusedSlot` so keyboard nav also updates it.
- `aria-live="polite"` so screen readers hear updates.

## 3. Bet preview — move + word wrap

In `src/components/BetSelector.tsx` and `src/pages/Index.tsx`:

- Move the "PREVIEW BET" status row out of the BetSelector flex row into a **left-aligned column** above/left of the action bar so it no longer overlaps the spin / roll button.
- Allow wrapping: change the inner flex to `flex-wrap` with `whitespace-normal break-words`, drop the fixed-height truncation, and set `max-w-[200px]`.
- Confirm button stays inline; preview text wraps under it on narrow viewports.

## 4. Monster / Coin collection gallery

`src/components/MonsterCollection.tsx` already groups by biome with rarity tiers and overall %. Extend, don't replace:

- Add a second tab inside the existing collection view ("Monsters" / "Coin Rewards") so the user can see every coin/roll/energy reward from `src/data/rewardPool.ts` they can earn from the lottery + lucky roulette, grouped by rarity (common = small coins, rare = med, epic = rolls/cards, legendary = jackpot).
- Track "first seen" via existing `useRouletteHistory` + `useLotteryHistory` hooks; mark unseen entries as silhouettes with a lock + odds hint.
- Show progress bar `seen / total` per rarity row + overall.

## 5. Accessibility settings panel

New `src/components/AccessibilityPanel.tsx`, mounted inside the existing `SettingsDialog`:

- Toggle **Reduce motion** → writes `prefers-reduced-motion` override to `localStorage` and sets `document.documentElement.dataset.reducedMotion = "1"`. Add a CSS rule in `src/index.css`: `html[data-reduced-motion="1"] * { animation-duration: .001ms !important; transition-duration: .001ms !important; }`. Framer Motion already respects `useReducedMotion()` — no per-component changes needed.
- Toggle **Increase contrast** → sets `html[data-contrast="high"]` and adds high-contrast token overrides in `index.css` (deeper `--foreground`, `--border`, `--ring`, stronger `--primary` against background).
- Settings persist to `localStorage` under `lov_a11y_prefs`.

## 6. Push notifications (web Push + service worker)

- Register `public/sw.js` (new) via `src/main.tsx` if `"serviceWorker" in navigator`.
- Add `src/lib/notifications.ts`:
  - `requestNotificationPermission()` — invoked from Accessibility panel via a "Enable reminders" button.
  - `scheduleDailyRewardReminder(nextClaimMs)` and `scheduleEnergyReadyReminder(msUntilFull)` using `setTimeout` + `self.registration.showNotification` via `postMessage` to the SW for background delivery while the tab is open. Falls back to `new Notification(...)` if SW unavailable.
- Wire from `useDailyReward` (when `nextClaimMs` transitions > 0, schedule) and from energy regen in `useGameState` (when energy < cap, schedule for the next +1 cap-fill time).
- Notification copy: `"Daily reward ready 🎁"` / `"Energy refilled ⚡ — time to roll!"`.

Native push (FCM/APNs) is **out of scope** — this is the web-standard Notifications API which works on installed PWAs and desktop browsers.

## 7. Daily streak — once per day, hard guarantee

In `src/hooks/useDailyStreak.ts`: the existing `autoOpenedOnceRef` guards a single session; add a `localStorage` key `lov_daily_streak_shown_${YYYY-MM-DD}` so even reload-refreshing the page on the same day will not pop it again until the next local-midnight rollover. Same treatment for `useDailyReward.ts`.

## 8. Version stamp

Bump `package.json` `"version": "1.0.0"`. Add a tiny `<span>v1.0</span>` in the footer of `src/components/Footer.tsx`.

## Files touched

- `src/components/LuckyRouletteModal.tsx`
- `src/components/BetSelector.tsx`
- `src/pages/Index.tsx`
- `src/components/MonsterCollection.tsx` (extended) + new `src/components/CoinRewardGallery.tsx`
- `src/components/AccessibilityPanel.tsx` (new), `src/components/SettingsDialog.tsx`, `src/index.css`
- `src/lib/notifications.ts` (new), `public/sw.js` (new), `src/main.tsx`
- `src/hooks/useDailyStreak.ts`, `src/hooks/useDailyReward.ts`
- `src/components/Footer.tsx`, `package.json`

## Out of scope

- Database schema, RLS, or RPC changes
- Native (Capacitor) push channels
- Reward odds / payout math
- Paddle, season, or auth flows
