# Already implemented — nothing to build

Every item in this request was delivered in the previous turn and is live in the code today. Quick map of where each piece lives:

## 1. Visible rolling ball
`src/components/LuckyRouletteModal.tsx` lines ~286–304: a separate non-rotating SVG layer holds a `<circle>` ball positioned at the top of the wheel. During `phase === "spin"` it rotates `ballAngle` (counter-clockwise, opposite to the wheel) over 3.6s with the same easing curve as the wheel, so the ball visually settles onto the winning wedge under the pointer.

## 2. Always-visible odds legend
Lines ~327–348: a 2-column grid lists every wedge with its color swatch, emoji, reward label, and `oddsPerSlot%` (uniform 12.5% for 8 slots, sourced from `uniformSlotOdds` in `src/data/rewardPool.ts`). Renders before, during, and after spin. The currently picked wedge gets a gold ring.

## 3. Collapsible history panel
Lines ~350–399 plus `src/hooks/useRouletteHistory.ts`: "Recent spins" toggle with `aria-expanded`/`aria-controls`. Shows last 10 entries with ✓/✗ icon, picked emoji → landed emoji, paid-spin coin badge, relative timestamp, and a "Clear history" button. Persisted to `localStorage` under `luckyRoulette.history.v1`.

## 4. Per-wedge reward labels
Lines ~258–278: each wedge renders the emoji and a stroked text label below it (`"JP"` for jackpot, otherwise `reward.amount`). Full label is also exposed via `aria-label` on the wedge `<path>` for screen readers and via the legend.

## 5. Tutorial step highlighting wheel + pointer
- `data-tutorial="roulette-wheel"` on the wheel container (LuckyRouletteModal line ~202) and `data-tutorial="roulette-pointer"` on the pointer triangle (line ~207).
- `src/pages/Index.tsx` `tutorialSteps` (lines ~338 and ~344) include two steps targeting those selectors.
- `TutorialCoachmark`'s `onStepChange` callback in `Index.tsx` opens the lucky roulette modal automatically whenever the active step's selector starts with `roulette-`, so the wedges exist in the DOM before the highlight tries to find them.

## What to do
Open the Lucky Roulette from the side rail (or replay the tutorial) to see all five behaviors in the running app. If something specific isn't behaving the way you want — ball trajectory, legend layout, history formatting, label text, or the tutorial trigger — tell me which one and how it should change, and I'll do a targeted edit instead of rebuilding what's already there.
