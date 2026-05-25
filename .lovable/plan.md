## Goals

Ship a focused round of polish on the spin/reveal flow, then start the battle system in a follow-up step.

## 1. Card reveal: portal + reduced-motion + always on top

- `src/components/CardReveal.tsx`
  - Wrap the modal in `createPortal(..., document.body)` so it escapes any parent `transform`/`overflow` stacking contexts.
  - Read `prefers-reduced-motion` via `window.matchMedia("(prefers-reduced-motion: reduce)")` and the existing `a11yPrefs.reducedMotion` toggle. When true: drop the `y` slide, use `duration: 0` for fade, and skip the spring on the inner card.
  - Keep `z-[100]` / close button `z-[110]`, ensure `position: fixed` and no parent transforms once portaled.

## 2. Dev-only z-index debug overlay

- `src/components/ZIndexDebugOverlay.tsx`
  - Early-return `null` unless `import.meta.env.DEV` is true (still respects `?zdebug=1` / `localStorage` to toggle within dev). Production builds will tree-shake the body.

## 3. E2E stacking check

- Add a Vitest + Testing Library check at `src/components/CardReveal.stacking.test.tsx` that:
  - Renders `<BetSelector>` + `<CardReveal>` inside a wrapper, at three viewport widths (375 / 768 / 1280) via `window.innerWidth` + `matchMedia` stubs.
  - Asserts the portaled reveal container has a computed `z-index` strictly greater than any element matching the betting/spin controls.
  - This is a lightweight DOM-level check (not Playwright) so it runs in the existing test suite.

## 4. Autospin button vertical alignment

- `src/components/GameBoard.tsx` (spin controls row)
  - Wrap the autospin button and the energy pill in a single flex row with `items-center`, equal vertical padding, and matching height so the autospin button sits on the same baseline as the energy number.
  - Verify at mobile (375), tablet (768), and desktop widths.

## 5. Always show a reward after the tutorial

- `src/pages/Index.tsx`
  - On both tutorial `onFinish` AND `onClose` (skip), trigger the post-tutorial chain.
  - If the daily reward is already claimed today, instead of skipping, open a fallback reward — a one-time "tutorial bonus" (small coin/dice grant via `game.addCoins`) shown through `RewardCelebration` so the player always sees something.

## 6. Multiplier picker button

- `src/components/BetSelector.tsx`
  - Add a dedicated "Multiplier" button that opens a small popover (or inline expander) listing the available multipliers as large tap targets, instead of relying only on the inline pills. Keep the existing pills for keyboard users; the button is the primary touch affordance on mobile.

## 7. Responsive screen-size + rotate-screen hint

- New `src/components/OrientationHint.tsx`
  - Detects `window.matchMedia("(orientation: portrait) and (max-width: 768px)")`.
  - If portrait on a small phone where the board would clip, show a non-blocking toast / banner: "Rotate your device for the best experience 🔄". Dismissible; remembers dismissal in `localStorage`.
- `src/pages/Index.tsx`: mount once near the top of the layout.
- Pass over `GameBoard`, `BetSelector`, and spin controls to confirm they fit at 320, 375, 414, 768, 1024, and 1366 widths. Tighten any overflow with `flex-wrap` / `min-w-0` as needed.

## 8. Battle system (kickoff)

After 1–7 are merged and approved, start the battle system as a separate plan. Initial scope to confirm with you before building:

- Turn-based 1v1 battles using owned monsters
- Stats derived from monster level + equipped cards
- PvE first (wild monster encounters from board tiles), PvP later
- New `battles` table, `battle_logs` table with RLS, edge function for damage resolution to prevent client cheating

I'll draft a full battle-system plan once this round ships.

## Technical notes

- Portal target: `document.body`; guard with `typeof document !== "undefined"` for SSR safety even though we're CSR.
- Reduced motion source of truth: combine OS pref (`matchMedia`) OR app pref (`getA11yPrefs().reducedMotion`).
- Dev gate: `import.meta.env.DEV` is Vite's standard flag and is stripped from production bundles.
- Stacking test uses `getComputedStyle` on portal root vs. control nodes; no Playwright dependency added.
