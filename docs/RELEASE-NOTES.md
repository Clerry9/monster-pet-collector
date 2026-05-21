# Release Notes

## v1.0.0 — 2026-05-21

### Roulette
- Fixed loop where the modal could not be reopened or spun again after a
  claim. `phase`, `pick`, `winningSlot`, `claimed`, and `lastReceipt` are
  now hard-reset on claim and on every new spin.
- Added a live odds/reward preview panel above the wheel that updates as
  you focus or pick a wedge, with exact win and miss text and `aria-live`
  announcements.
- Reward receipt now disappears the moment you claim — only the next spin
  brings a fresh summary.
- The roulette no longer reopens itself after manual dismissal in a roll.

### Betting
- Preview chip rewritten so it never overlaps the spin/roll button:
  right-aligned on wider layouts, stacked above on narrow viewports via a
  `ResizeObserver`-driven object-detection pass. Text wraps inside a fixed
  200px max width.
- Live energy countdown next to the ⚡ pill whenever energy is below cap.

### Collection
- Monster album: per-rarity progress, overall progress bar, biome empty
  states, "Show checklist" toggle listing every monster with a clear ✓ /
  ☐ status, and a coin-progress mini-bar on each locked tile.
- New Reward Album tab showing every coin / roll / energy / jackpot prize
  with rarity tier, odds %, and a "collected" badge once you've landed
  on it in the Lucky Roulette.

### Daily reward & streak
- Daily Streak modal locked to one open per local day via
  `lov_daily_streak_shown_YYYY-MM-DD`, even across reloads.
- Daily Reward modal countdown only shown when not claimable, and grays
  out when the timer hits zero.
- Real 24-hour countdown for the streak/day highlight; only refreshes
  when the timer expires.

### Accessibility
- Settings panel toggles for **Reduced Motion** and **Increase Contrast**.
- Full keyboard support on the roulette wheel, bet selector, and
  NOT-ENOUGH-ENERGY modal with focus outlines, tab order, Enter / Space
  activation, and Escape-to-close.
- Screen-reader `role="status"` announcer for the currently focused
  roulette wedge.

### Notifications
- Background push via a real `/sw.js` service worker. Reminders for the
  daily reward and energy-full timers fire even when the tab is closed.
- Scheduled timers persist to IndexedDB and are re-armed on every
  service-worker activation.
- In-tab `setTimeout` fallback when the SW isn't supported.

### Misc
- Version bumped to **v1.0** in the footer.
- Paddle.js already integrated via `src/lib/paddle.ts` and
  `usePaddleCheckout` — no install needed.