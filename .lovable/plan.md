## Implementation plan

### 1. Fix the tutorial/roulette modal collision
- Track when the tutorial opens Lucky Roulette for the wedge/pointer steps.
- Automatically close that modal when the tutorial advances past roulette-specific steps, skips, or finishes.
- Keep the coachmark above the modal and ensure the modal cannot remain stuck open after the tutorial continues.
- Add regression coverage so roulette tutorial steps open the modal and non-roulette steps close it.

### 2. Make the roulette modal keyboard-accessible
- Add a reusable focus-trap hook for modal dialogs:
  - initial focus moves into the modal
  - Tab/Shift+Tab loops inside the modal
  - Escape triggers the accessible close path
  - focus returns to the side-rail/opening button after close
- Add arrow-key navigation for wedges in the SVG radiogroup, plus Enter/Space to select a wedge.
- Make the post-spin receipt a clearly labelled dialog region/live result with keyboard focus moving to CLAIM/CONFIRM.
- Ensure close is safe during/after spins: closing will not lose a pending result because the spin is stored server-side.

### 3. Server-synced roulette state and idempotent claiming
- Add Lovable Cloud tables/functions for:
  - `roulette_state`: per-user free-spin cooldown (`last_free_spin_at`)
  - `roulette_spins`: per-spin history, picked slot, landed slot, reward snapshot, paid/free, won/missed, `claimed_at`, and an idempotency key
  - `reward_pool_overrides`: admin-editable shared reward weights/amount ranges/enabled state
  - `user_roles`: separate role table for admin access, with a security-definer `has_role()` function
- Replace client-only spin resolution with a server-authoritative flow:
  - Start spin calls a backend function with picked slot + paid/free choice.
  - Backend validates free cooldown or paid coin cost, chooses the landed slot, snapshots the reward, records history, and returns the result for animation.
  - CLAIM calls a backend function that grants rewards only if `claimed_at` is still null.
  - Repeated CLAIM clicks, reloads, or another device calling CLAIM for the same spin returns the existing result without granting again.
- Keep local storage only as a fallback/cache; authenticated sessions use the server data across devices.

### 4. Wire rewards into existing game state safely
- Move roulette reward granting into the idempotent claim backend function for coins, rolls/energy, card flips, island stars, and equivalent tracked resources.
- Refresh the local game state after claim so the HUD updates immediately.
- Keep `monster_food` behavior consistent with the current payout rule by converting it to the same coin bonus currently used in the app.
- Keep season XP/symbol updates consistent with the existing season progress model.

### 5. Post-spin receipt UI
- Replace the simple inline result with a receipt card after every resolved spin.
- Show: picked slot, landed slot, win/miss, reward name/amount, paid/free spin, timestamp, and claim status.
- Use CLAIM for wins and CONFIRM for misses; disable the button while a claim is in progress and after confirmation.
- If a pending unclaimed spin exists on load, reopen/show that receipt instead of allowing duplicate reward grants.

### 6. Better win/loss feedback and optional roulette sounds
- Add a small sound toggle inside the roulette modal that respects the existing master mute.
- Add roulette-specific SFX helpers for spin start/tick, win, jackpot, and miss.
- Add satisfying animations:
  - win: prize burst, winning wedge glow, receipt pop, confetti-like sparkles
  - jackpot: stronger screen shake and gold pulse
  - miss: picked wedge red flash, subtle shake, softer result reveal
- Respect `prefers-reduced-motion` and the existing reduced-motion setting.

### 7. Admin reward-pool editor
- Add a protected `/admin/rewards` page.
- Gate the page with server-side admin role checks; roles stay in `user_roles`, not profile/user records.
- Provide an editor for each shared reward template:
  - enabled/disabled
  - weight
  - min/max amount
  - emoji/label display
  - calculated odds preview
- Save changes to the shared reward override table.
- Refactor Lucky Roulette and Island Reward Roulette to read from the same merged reward pool so admin changes affect both.

### 8. Tests and validation
- Expand roulette tests for focus trap, Escape behavior, keyboard wedge selection, receipt focus, and duplicate claim prevention UI state.
- Expand tutorial tests for auto-opening and auto-closing Lucky Roulette around roulette coachmark steps.
- Add reward-pool merge tests so default rewards plus admin overrides calculate odds consistently.