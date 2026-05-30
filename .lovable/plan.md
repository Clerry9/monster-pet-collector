## Goal

Polish the left/right rails post top-right button removal, ship working PvP boosts, and confirm tutorial + deep-links are still correct.

## 1. Rail layout vs top HUD

- Measure the top HUD stack (resources strip + XP bar + tabs) at `375x812`, `390x844`, `414x896`, `509x517` (current preview), `768x1024`, `1280x720`. Confirm the current `+170px` offset in `src/components/SideRails.tsx` clears the HUD on every size.
- If overlap remains on the smallest widths, switch the rail's `top` to a token derived from the actual HUD height (CSS var `--hud-bottom` set by `TopHud`) instead of a hard-coded constant — fall back to `170px`.

## 2. Mobile rail behavior

In `src/components/SideRails.tsx`:
- On viewports `<420px`, shrink tiles to `w-9 h-9`, drop label `text-[7px]` to a single-letter or icon-only mode, and reduce the inter-tile gap so all 5 items fit between top HUD and bottom tab bar without scrolling.
- Add `pointer-events-none` zones above/below so labels never block the board edges; tiles themselves remain tappable.
- Auto-collapse: rails render a single floating "tab" handle on the side that expands the column on tap (mobile only). Desktop unchanged.

## 3. PvP boost effects (real gameplay)

Currently `pvp_first_strike`, `pvp_lucky_crit`, `pvp_aegis` are buyable but flagged `preview`. Wire them end-to-end:

**Frontend (`src/pages/PvP.tsx`)**
- Mount `<PreBattleBoostBar kind="pvp" max={2} onChange={setBoosts} />` above the "Queue for Battle" button.
- Pass `power_ups: boosts` into the `match` invoke body.

**Edge function (`supabase/functions/pvp-match/index.ts`)**
- On `op: "match"`, accept `power_ups: string[]` (validate against allowed PvP ids, dedupe, max 2).
- Before consuming, call a new RPC `consume_power_ups(p_ids text[])` that decrements `user_power_ups.quantity` atomically and errors if any are missing — reuse pattern from arena.
- Apply effects when building combatants/log:
  - `pvp_first_strike`: skip opponent's first action — log "First Strike! You move first." and set a flag so the first `resolveRound` only resolves the attacker side (extract a `resolveSingleSide` helper or pre-tick opponent's CD).
  - `pvp_lucky_crit`: pass a `critBonus = 0.30` into `aiPick`/`resolveRound` for the attacker only (extend `_shared/combat.ts` to accept an optional `critBonusPct` per side; default 0).
  - `pvp_aegis`: track `absorbNextHit` on the attacker combatant; in `resolveRound`, if defender deals damage and flag is set, zero the damage, clear the flag, append a log event "Aegis Shield absorbs the hit!".
- Flip `preview: false` for those three in `src/data/powerUps.ts` and remove "Coming Soon" badges in `PowerUpShop.tsx`.

**Migration**
- New migration adding `consume_power_ups(text[])` security-definer RPC (uses `auth.uid()`), with grants to `authenticated`.

## 4. Tutorial / coachmark audit

- `src/hooks/useTutorial.ts` already references only `[data-rail='…']` selectors — no `[data-tutorial='arena']` or `'pvp'` step exists, so nothing to remove. Verify by grep at implementation time.
- Optionally add two new steps highlighting `[data-rail='arena']` and `[data-rail='pvp']` so new players discover them after the top-right buttons were removed. Insert after the `season` step, gated behind level ≥ requirement to start arena/pvp (mirror existing pattern).

## 5. Routes / deep-links

- `/arena`, `/arena/replay`, `/pvp` are all wired in `src/App.tsx` — no change needed.
- `src/pages/Index.tsx` already calls `navigate("/arena")` / `navigate("/pvp")` from rail callbacks. Confirm there are no other components still rendering removed `RouterLink to="/arena"` or `to="/pvp"` buttons (grep, remove if any).

## Verification

- Visually check rails at the listed viewports (no HUD overlap, no bottom-tab overlap).
- Buy `pvp_first_strike` → queue a PvP match → log shows "First Strike!" and inventory decrements by 1.
- Same for Lucky Crit (observe higher crit rate over a few runs) and Aegis (first incoming hit absorbed).
- Tutorial walkthrough completes without targeting a missing element.

## Files touched

- `src/components/SideRails.tsx`
- `src/components/TopHud.tsx` (optional `--hud-bottom` CSS var)
- `src/pages/PvP.tsx`
- `src/data/powerUps.ts`, `src/components/PowerUpShop.tsx`
- `supabase/functions/pvp-match/index.ts`, `supabase/functions/_shared/combat.ts`
- new migration for `consume_power_ups`
- `src/hooks/useTutorial.ts` (optional new steps)
