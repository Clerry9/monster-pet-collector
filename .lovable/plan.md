## Goal

1. Replace the misleading "energy" label on the bet pill with a real **Energy resource** that auto-refills every 3 minutes up to a level-scaling cap of 150, and lets earned energy stack above the cap.
2. Fix the board so the **islands and monster never disappear during a hop** (they currently fade because the dimming opacity is keyed off `isNearby` of the player's pre-hop tile).
3. Do a **beta-readiness audit** across the 8 base level themes and report findings (renders, level-up flow, prestige, energy, purchases fallback).

---

## 1. Energy system

### Rules (from your spec)

- Resource name: **Energy** (the "⚡" pill currently in `BetSelector`).
- **Cost**: each dice roll costs 1 energy (replaces the existing `rolls` consumption — `rolls` becomes legacy "Free Roll" packs that top up energy instead).
- **Regen**: +1 energy every **180 seconds** of real time, while `current ≤ cap`.
- **Soft cap** = `floor(150 × (1 + 0.10 × (level − 1)))`. So L1 = 150, L2 = 165, L3 = 180, L10 = 285, etc.
- **Overflow**: regen stops at the cap, but energy *granted* by tiles, packs, ads, daily reward, and shop purchases is added on top and persists above the cap (it just stops auto-regenerating until you spend back down).
- Display: `current / cap` with a "+N over" badge when `current > cap`.

### Storage

Add to `GameState` in `src/hooks/useGameState.ts`:

```ts
energy: number;          // current value (can exceed cap)
energyUpdatedAt: string; // ISO timestamp of last regen tick
```

Mirror columns on `game_state` table:

```sql
alter table public.game_state
  add column if not exists energy integer not null default 150,
  add column if not exists energy_updated_at timestamptz not null default now();
```

(Migration tool will be used in build mode; no other schema touched.)

### Hook changes (`useGameState.ts`)

- New helper `energyCapForLevel(level)` → `Math.floor(150 * (1 + 0.10 * (level - 1)))`.
- New helper `applyRegen(state, now)` — computes `ticks = floor((now - energyUpdatedAt) / 180_000)`, refills up to cap, advances `energyUpdatedAt` by `ticks * 180_000`. Pure; called on load and on every `update()`.
- New `useEffect` with `setInterval(60_000)` to re-tick the state once a minute so the UI stays current (and to flush regen to DB via the existing debounced `saveToDb`).
- `rollDice()` now requires `state.energy >= 1` instead of `state.rolls >= 1`, and decrements `energy` by 1.
- New `addEnergy(amount)`, `setEnergy(value)` actions. Daily reward, ads, packs, mini-game costs, etc. switch from `addRolls` → `addEnergy`. `addRolls` stays as a no-op alias for one release for safety, marked `@deprecated`.

### UI changes

- `BetSelector.tsx`: rename the pill class to `pill-energy` (already named that) and bind the meter to `current / cap` instead of `currentBet / maxBet`. Show the numeric `current/cap` and the overflow badge.
- `TopHud.tsx`: add an energy chip next to coins showing `⚡ current/cap` and a small "next +1 in m:ss" tooltip.
- `Index.tsx`: replace the `🎲 {game.rolls}` stat readout with `⚡ {game.energy}/{cap}`.
- `DiceShop.tsx` / `SpecialPacks.tsx` / `LimitedTimeBundle.tsx`: copy update — packs now read "Adds N ⚡ to your energy".

---

## 2. Board / island visibility during hops

**Symptom**: islands and the monster vanish mid-hop on the current build.

**Root cause** (confirmed in `src/components/IsometricBoard.tsx`):

- `Tile` (lines ~620–680) uses `isNearby = Math.abs(absIdx - playerPosition) <= NEARBY_WINDOW`. `playerPosition` updates instantly when `position` changes (before the hop animation finishes), so trailing tiles drop to `opacity 0.3` instantly.
- `MonsterPawn` is keyed by `absoluteIndex`, so a multi-step roll re-mounts and briefly renders nothing on the first frame after the state change.
- During hops the `windowPoints` recompute on every `absoluteStep` change, dropping the previous origin tile from the list before the monster has visually arrived there.

**Fix**:

- Track the monster's interpolated `currentAbsRef` (already maintained in `MonsterPawn`); pass it down to `Tile` via a context/prop so `isNearby` is keyed off the *visual* position, not the *logical* one.
- Widen `WINDOW_BEFORE` to `max(10, lastSteps + 4)` while `isMoving`, so the previous tiles stay rendered for the entire hop.
- Stop unmounting `MonsterPawn` on `absoluteIndex` change — let it animate from old → new without a remount (use a ref instead of the index as the key).
- Keep tile `opacity` ≥ 0.85 for the entire window during `isMoving`; only fade trailing tiles after the hop settles.

---

## 3. Beta-readiness audit

After the changes above, in build mode I will:

- Programmatically simulate XP from level 1 → 1200 to verify `getLevelForXp` / `xpForLevel` / prestige tier crossings have no NaN, integer overflow, or off-by-ones.
- Hit each of the 8 base themes (levels 1, 2, 3, 4, 5, 6, 7, 8) by setting `xp` via the `+10000 XP (DEV)` button and confirm:
  - 3D scene renders (board, ocean, foliage, monster).
  - Energy regen survives a level-up (cap recomputes, `current` is preserved including overflow).
  - Tile modifiers fire (e.g. Crystal Caves chest +25%, Lava Peaks star +50%, Celestial Plane double).
  - Level-up + prestige celebrations don't block input.
- Verify `/auth`, `/pricing` (live + fallback), `/terms`, `/privacy`, `/refund`, and the in-game shop checkout all reachable.
- Capture findings in a short "Beta readiness" report at the end of the build turn.

---

## Files to change

- `src/hooks/useGameState.ts` — energy state + regen + actions
- `src/components/BetSelector.tsx` — energy bar wiring
- `src/components/TopHud.tsx` — energy chip + countdown
- `src/components/IsometricBoard.tsx` — visual-position based dimming, wider window during hops, stable monster mount
- `src/components/GameBoard.tsx` — pass `isMoving` through to dim logic
- `src/pages/Index.tsx` — replace `🎲 rolls` with energy in the header strip
- `src/components/DiceShop.tsx`, `SpecialPacks.tsx`, `LimitedTimeBundle.tsx`, `RewardedAdButton.tsx`, `DailyReward.tsx`, `SpinWheel.tsx`, `MiniGame.tsx`, `MiniGameJack.tsx` — switch reward grants from `addRolls` to `addEnergy`
- One DB migration adding `energy` + `energy_updated_at` columns

No changes to legal pages, Paddle wiring, or auth flows.
