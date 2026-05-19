## Plan

Three focused UI changes — no business logic touched.

### 1. "NOT ENOUGH ENERGY" popup when bet > current energy
**File:** `src/pages/Index.tsx` (+ small hook into `BetSelector` callback)

- Today, picking a bet whose roll cost exceeds current energy just dims a pill and shows a tiny `−N⚡/roll` warning. Nothing tells the player to act.
- Wire `onSetBet` on the BetSelector instance in `Index.tsx`: still call the existing setter, but if `energyCostForBet(mult) > energy`, also open the existing `EnergyRefillModal` (`setRefillOpen(true)`) and fire the existing `NOT ENOUGH ENERGY` sonner toast with the "Watch ad" action that's already implemented for the roll path.
- Reuses the already-redesigned `EnergyRefillModal` ("NOT ENOUGH ENERGY" headline + Watch ad → +5⚡ CTA). No new modal component.

### 2. Bigger emoji icons on the lottery wheel
**File:** `src/components/LuckyRouletteModal.tsx`

- Enlarge the wheel itself: `SIZE` 240 → **300**, `R` recomputed, `BALL_R` adjusted so the ball still rides just inside the rim.
- Bump the per-wedge emoji from `fontSize="20"` to **`"34"`** and the amount label from `"9"` to **`"13"`** (with thicker 2.5 stroke for readability against the brighter felt).
- Move the amount label slightly further from the emoji so the larger glyphs don't collide (`ly - 10` / `ly + 16`).
- Slightly enlarge the center hub circle (r 18 → 22) to stay proportional.

### 3. Make it look like a real roulette table
**File:** `src/components/LuckyRouletteModal.tsx` (styling only, same DOM)

- Wrap the wheel in a **green felt table** surround: a new oval div behind the SVG with `background: radial-gradient(ellipse at center, hsl(140 45% 22%), hsl(140 55% 12%))`, an inner gold rim ring, and an outer dark wood frame using existing `--wood-dark` token. Adds a subtle inset shadow for felt depth.
- Add a **brass outer track** ring (CSS `border` + `box-shadow` layers) around the SVG so the spinning wheel sits in a stationary bowl, like a real roulette.
- Add small **diamond deflectors** (8 absolutely-positioned `◆` glyphs evenly spaced on the brass ring) — pure decoration, `aria-hidden`.
- Swap the panel background gradient from gold/wood to a darker casino palette (deep green felt → wood edge) so the modal reads as a table, not a generic panel. Keep all existing semantic tokens — no raw hex.
- The pointer (red triangle), wedges, ball, center hub, history button, and all interaction logic stay exactly as they are.

### Out of scope
- No changes to `LotteryRoulette.tsx` (the tiny in-game floating reel — that one is intentionally compact above the monster's head).
- No changes to spin math, rewards, RLS, history, or sounds.

### Verification
- Manual: open Lucky Roulette → confirm felt/brass styling and visibly larger emojis; pick a bet higher than current energy → confirm "NOT ENOUGH ENERGY" modal opens with Watch-ad CTA.
- Existing `LuckyRouletteModal.test.tsx` should still pass (DOM structure of wedges/labels unchanged, only sizes).
