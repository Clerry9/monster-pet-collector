# Plan

## 1. Republish + Google Search Console verification
- User clicks Publish (frontend changes need manual republish).
- After republish, re-run the META verification call against `https://monsterpetcol.com/` via the `google_search_console` connector.
- On 200, PUT the site to add it to their property list, then submit `sitemap.xml`.
- If verify returns `failedToFindMetaTag`, confirm the tag is in the served HTML and retry.

## 2. Re-run Lighthouse + fix remaining issues
- After republish, call `seo_chat--list_findings` to pull the latest scan.
- Address any still-failing **performance** items (likely candidates: hero image not preloaded, render-blocking CSS, oversized images) and **contrast** items (sweep for any remaining `/70` `/80` `/90` opacity utilities on text — `BetSelector` still has `text-wood-dark/70`, plus check `CosmeticStore`, `TopHud`, `GameTabs`).
- Mark fixed findings via `seo_chat--update_findings`.

## 3. Lottery roulette: stop on 1 item, stay hidden until next energy spend
Edit `src/components/LotteryRoulette.tsx`:
- Remove the auto-hide timeout. Instead, hide the reel only when a **new spin starts** (rising edge of `spinning`).
- Land cleanly on exactly one icon (the server `result`, or ⚡ when lucky bonus fires) — no further animation cycling.
- Keep the reel visible after landing until the next roll consumes energy; clear `luckyEnergy` on the next rising edge.

## 4. Energy cost = bet multiplier × base
Edit `src/hooks/useGameState.ts` → `energyCostForBet`:
- Current: likely flat or low. Change to `cost = bet * BASE` where `BASE = 10` so:
  - 1× bet → 10⚡
  - 3× bet → 30⚡
  - 30× bet → 300⚡
- Verify the existing `useGameState.energy.test.ts` still represents desired behavior; update test expectations.
- `BetSelector` already displays `−{cost}⚡/roll` so it auto-reflects the new value. Confirm `getAvailableBets` gating still makes sense (locks high bets when energy < cost).

## 5. All monsters in 3D
- Audit usages of the 2D monster `<img>` and `MonsterDisplay` across: `MonsterCollection`, `IsometricBoard`, `CosmeticStore`, `CosmeticPreviewModal`, `GameBoard`, `TopHud`, `Index`.
- Replace remaining 2D renders with `<Monster3D>` (already supports `compact` for thumbnails and auto 2D fallback on low-power devices, so perf is safe).
- Keep the existing low-power session fallback — do not force WebGL on phones that already opted out.

## 6. More 3D-like animation polish
- Add subtle 3D tilt/parallax on hover for primary cards (cosmetic store cards, season hub tiles) using `framer-motion` `rotateX/rotateY` driven by pointer position — pure CSS transforms, no perf cost.
- Add a gentle floating "breath" loop to the hero monster row on `Index`.
- Add depth shadows (`shadow-chunky` already exists) + perspective container on the board wrapper so isometric tiles read more dimensional.
- Keep all motion gated by the existing `reducedMotion` setting.

## Technical notes
- No DB migrations; energy cost is client-derived.
- Files touched: `LotteryRoulette.tsx`, `useGameState.ts`, `useGameState.energy.test.ts`, `MonsterCollection.tsx`, `IsometricBoard.tsx`, `CosmeticStore.tsx`, `CosmeticPreviewModal.tsx`, `GameBoard.tsx`, `TopHud.tsx`, `Index.tsx`, `BetSelector.tsx` (contrast), plus 1–2 components for tilt polish.
- After user republishes, run GSC verify + sitemap submit and re-pull SEO findings in one batch.

## What I need from you
1. Click **Publish → Update** so the verification meta tag goes live.
2. Reply "republished" — then I'll run verification, submit the sitemap, re-pull Lighthouse findings, and ship the lottery/energy/3D changes.
