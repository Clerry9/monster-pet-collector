# Island Rewards, New 3D Monsters & Scaling Build Cost

Three changes:

1. A spinning "reward picker" pops up when the monster lands on an island (like the Coin-Master-style randomizer in the uploaded video).
2. Three new monsters added to the collection, rendered with the existing 3D pipeline.
3. The coin cost to build the island's structure scales up by **13% per level**.

---

## 1. Random Reward Roulette on Landing

**New file:** `src/components/IslandRewardRoulette.tsx`

A modal overlay that briefly cycles through a wheel of icons (coins, rolls, food, card flip, star, mystery monster shard) and lands on a randomly weighted prize, awarding it to the player. Visuals match the Coin-Master vibe shown in the recording: glossy gold panel, ticking sound (`sfxDiceTick`), final flash + `sfxCoinGain`/`sfxLevelUp`.

Reward pool (weighted):
- Small coins (50–150) — common
- Medium coins (200–500) — uncommon
- Free rolls (3–10) — uncommon
- Monster food (boost XP for active monster) — uncommon
- Free card flip — rare
- Island star — rare
- Big jackpot (1000–3000 coins) — very rare

Trigger logic in `src/pages/Index.tsx → handleLanded()`:
- Currently `result.islandStarEarned` only awards a star. Replace/augment with a single roulette trigger when the monster lands on an "island feature" tile (`star`, `chest`, or when `crossedIsland` is true). The roulette takes priority over the silent star toast.
- Roulette is queued (not stacked) and respects existing `pendingLevelUp` / `pendingPrestige` flushing order.
- Includes Skip/Claim button so the game never advances without user action (consistent with prior memory rule).

State plumbing: add `rouletteOpen` + `rouletteSeed` in `Index.tsx`. On claim, dispatch the prize via existing `game.addCoins`, `game.addEnergy` (rolls), `game.grantCard`, `game.addIslandStars` etc.

## 2. New 3D Monsters

**Edit:** `src/data/monsters.ts` — add three new entries reusing the procedural `Monster3D` renderer (no PNG import needed; `Monster3D` already accepts a key/seed and produces 3D geometry):

- **Mossfang** (forest, rare, 350 coins) — 4 evolutions, +6/+18/+34/+58% bonus.
- **Tidecaller** (abyss, epic, 1100 coins) — 4 evolutions, +9/+22/+42/+68%.
- **Aurorix** (sky, legendary, 2500 coins) — 4 evolutions, +18/+38/+70/+110%.

Add corresponding biome icons if any are missing (none — all biomes already exist). Confirm `MonsterCollection.tsx` and album page render the new entries automatically (they iterate `MONSTERS`). The 3D display in `Monster3D.tsx` is procedural, so no asset uploads are required for them to appear in 3D.

## 3. Build Cost Scaling (+13% per level)

**Edit:** `src/data/buildings.ts` and `src/components/MiniGame.tsx`

- Export `getBuildCoinCost(level: number)` from `buildings.ts`:
  ```ts
  export const BUILD_BASE_COST = 100;
  export const BUILD_COST_GROWTH = 1.13;
  export function getBuildCoinCost(level: number) {
    return Math.round(BUILD_BASE_COST * Math.pow(BUILD_COST_GROWTH, Math.max(0, level - 1)));
  }
  ```
- `MiniGame.tsx`:
  - Compute `coinCost = getBuildCoinCost(playerLevel)`.
  - In the intro panel show: `Cost: {coinCost} 🪙` under the blueprint.
  - Disable "START BUILDING" if `coins < coinCost` (and show an "insufficient coins" hint).
  - On `startGame`, call `onSpendCoins(coinCost)`; if it returns false, abort.
- `SeasonHub.tsx`: pass through `coins` and `onSpendCoins` (already wired) and surface the cost on the entry button (`{coinCost} 🪙 + 1 roll`).

## Out of scope

- No backend / DB changes. Roulette outcome is purely client-side RNG (existing pattern).
- No changes to camera, fog, tutorial, or audio systems.
- Existing `crossedIsland` 30% chance for free island star stays as-is (the roulette layers on top for landings that already trigger an island event; it does not fire on every plain tile).

## Files

- New: `src/components/IslandRewardRoulette.tsx`
- Edit: `src/pages/Index.tsx`, `src/data/monsters.ts`, `src/data/buildings.ts`, `src/components/MiniGame.tsx`, `src/components/SeasonHub.tsx`
