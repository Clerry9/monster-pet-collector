# Plan: Fix tutorial overflow + Pick-the-Slot Roulette

## 1. Tutorial coachmark — keep tooltip on-screen

In `src/components/TutorialCoachmark.tsx`, the tooltip is anchored at the highlighted element's horizontal center with `transform: translate(-50%, …)`. The current clamp (`Math.min(vw - 20, …)`) only constrains the anchor point — not the tooltip's right edge — so when a side-rail button on the right is highlighted, the card visibly clips off the right side.

Fix:
- Estimate tooltip width as `min(340, vw - 24)` (matches `maxWidth`).
- Clamp the anchor `left` so the card's left/right edges stay ≥12px inside the viewport: `left ∈ [halfWidth + 12, vw - halfWidth - 12]`.
- Keep the existing vertical clamp logic.

This is a 1-block edit — no API changes.

## 2. Lucky Roulette → Pick-the-Slot wheel

Replace the current "press spin → random reward" flow in `src/components/LuckyRouletteModal.tsx` with a real roulette where the player **bets on a slot** before each spin. The ball lands on a random slot; the player only wins if their pick matches.

### Wheel layout
- Fixed 8-slot wheel (visual circle) with a known reward per slot:

  ```text
  Slot  Reward                        Approx. odds
  0     🪙  +150 coins                1/8
  1     ⚡  +5 rolls                  1/8
  2     🪙  +250 coins                1/8
  3     🌟  +10 season XP             1/8
  4     🪙  +400 coins                1/8
  5     🃏  Free card flip            1/8
  6     ⭐  +1 island star            1/8
  7     💎  JACKPOT (+2000 coins)     1/8
  ```
- Slots rendered as colored wedges around an SVG circle with emoji + short label, plus a fixed pointer at the top.

### Flow
1. Modal opens → wheel idle, all 8 slots highlighted as pickable.
2. Player taps a slot to **place their pick** (selected slot gets a gold ring). Pick can be changed until they spin.
3. Press **FREE SPIN** (1×/24h) or **EXTRA SPIN — 100 coins**. Spin disabled until a pick exists.
4. Wheel rotates with easing, ticking sound, lands on a random slot (uniform). Pointer aligns to the winning wedge.
5. Resolution:
   - **Match** → show "YOU WIN!" + the slot's reward, `CLAIM` button calls `onClaim(reward, paid)` exactly as today.
   - **Miss** → show "So close!" with what the ball landed on and what they picked. No reward granted. `SPIN AGAIN` resets to step 2 (free-spin cooldown only consumed if it was the free spin; paid spin is consumed either way — same cost rules as now).
6. After claim/dismiss, return to idle for another spin attempt (subject to cooldown / coins).

### Reward shape
- Reuse the existing `LuckyRouletteReward` type and `onClaim` / `onSpendCoins` / cooldown plumbing in `Index.tsx` — no parent changes needed.
- Drop the random `pickReward()` weighted pool in favor of the fixed per-slot table above (kept inside the modal file).

### Visuals
- SVG wheel built from 8 `path` wedges, each filled with a token color (`--gold`, `--candy-red`, `--wood-dark`, etc., via existing semantic tokens — no raw colors).
- Animate rotation with framer-motion (`animate={{ rotate: finalAngle }}`, ~3s ease-out, 4-6 full turns + offset to chosen slot).
- Pointer is a small triangle pinned at 12 o'clock.
- Selected pick: gold stroke + subtle pulse on its wedge.
- Maintain a11y: `role="radiogroup"` for slot picks, each wedge is a `button` with `aria-pressed` and `aria-label="Slot N: 150 coins"`; live region announces win/miss outcome.

### Out of scope
- No backend / pricing / entitlement changes.
- Tutorial copy referencing the roulette stays valid ("pick a slot, spin, win if it matches").

## Files touched
- `src/components/TutorialCoachmark.tsx` — horizontal clamp fix.
- `src/components/LuckyRouletteModal.tsx` — full UI/logic rewrite (props unchanged).
