## Scope

Two small UI/a11y refinements plus answers to your GitHub/version questions.

## 1. Announce focused roulette wedge to screen readers

In `src/components/LuckyRouletteModal.tsx`:
- Add a visually-hidden `<div role="status" aria-live="polite" aria-atomic="true">` near the wheel.
- Track `focusedSlot` state (set on each wedge's `onFocus`).
- When `focusedSlot` changes, write a sentence like: `"Focused slot 3: 50 coins. 12.5% odds. Press Enter or Space to select."` into the live region.
- Keep existing `aria-checked` / `aria-label` on each wedge unchanged.

This way, before pressing Enter/Space, screen-reader users hear which wedge currently has focus and what it pays.

## 2. DailyReward countdown only when not claimable, gray at 0

In `src/components/DailyReward.tsx`:
- Render the countdown block only when `alreadyClaimed && nextClaimMs > 0`.
- When `nextClaimMs === 0`, replace it with a grayed-out `"Ready to claim — reopen tomorrow"` line (using `text-muted-foreground opacity-60`) instead of hiding entirely.
- The existing claim CTA path (when `!alreadyClaimed`) is unchanged.
- Tighten the `setInterval` effect to also stop when `nextClaimMs <= 0` so it doesn't keep ticking at zero.

## 3. GitHub sync + version number

- **GitHub sync** is automatic when the repo is connected — every change you make in Lovable is pushed in real time. There is no manual "update" step. If your repo looks behind, open the Plus (+) menu → GitHub and confirm the project is still connected; once connected, this current state will already be the latest commit on your default branch.
- **Version number:** `package.json` currently reports `"version": "0.0.0"` — the project has never had a release version set. If you want a real version (e.g. `1.0.0`) stamped into `package.json` so the GitHub commit reflects it, say the word and I'll bump it as part of the implementation step.

## Files to edit

- `src/components/LuckyRouletteModal.tsx` — focus-announce live region
- `src/components/DailyReward.tsx` — conditional countdown + grayed zero state
- (optional, on request) `package.json` — bump `version`

## Out of scope

Spin math, reward odds, daily-streak DB logic, Paddle, any backend change.
