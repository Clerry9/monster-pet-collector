# Landing Reward Popup (2s)

When the monster finishes hopping, briefly pop a centered card showing what was just won on that tile, then auto-dismiss after 2 seconds.

## What it shows

Based on the tile landed on (`lastResult.tile.type` + values):
- **Coins** — "+N 🪙"
- **Chest** — "+N 🪙 + Card!" (with card emoji)
- **Bonus** — "+N ⚡ Energy"
- **Star** — "⭐ Island Star! (x/5)"
- **Skull** — "−N 🪙"
- **Empty / nothing** — "Safe tile" (or skip popup)

If `islandStarEarned`, append a small "⭐ Star earned" line.

## Behavior

- Appears centered (similar style to `BonusRewardToast`) with framer-motion pop-in.
- Auto-dismisses after 2000ms.
- Does NOT replace existing flows (roulette, card reveal, level-up toast, bonus reward toast) — it just adds a quick visual summary of the tile reward immediately on landing.
- Fires before the roulette opens; roulette/card-reveal still appear after.

## Technical changes

**New file**: `src/components/LandingRewardPopup.tsx`
- Props: `{ reward: { icon: string; title: string; subtitle?: string } | null; onDone: () => void }`
- AnimatePresence + spring pop, auto-clears via 2s timeout (pattern mirrors `BonusRewardToast.tsx`).

**Edit**: `src/pages/Index.tsx`
- Add `const [landingPopup, setLandingPopup] = useState<...>(null)`.
- In `handleLanded()`, compute a popup payload from `result.tile` and call `setLandingPopup(...)` near the top (after the idempotency guard).
- Render `<LandingRewardPopup reward={landingPopup} onDone={() => setLandingPopup(null)} />` next to the existing `BonusRewardToast`.

No backend / data model changes.
