

## Plan: Level-Synced Building Mini-Game + Unique Jack Items + Persistent Rolls

### 1. New "Build the Island" mini-game (replaces the current match-3 `MiniGame.tsx`)
A construction game where each level unlocks a different themed structure to build, matching the LEVELS table in `src/data/levels.ts`.

**Concept**: Player taps incoming resource tiles (wood, stone, gem) falling/floating across the panel for `cfg.seconds`. Collected resources auto-fill a 3-section blueprint (foundation → walls → roof). Completing all 3 sections = win = season symbols awarded. Bombs (💣) reduce progress. Difficulty selector (Easy/Normal/Hard) kept from current code — controls time, bomb rate, resources-per-section.

**Level sync**: 8 building themes, one per level in `LEVELS`:
| Level | Theme | Building |
|---|---|---|
| 1 Goblin Forest | 🌲 | Wooden Hut |
| 2 Crystal Caves | 💎 | Crystal Shrine |
| 3 Lava Peaks | 🌋 | Forge Tower |
| 4 Haunted Marsh | 👻 | Ghost Shack |
| 5 Sky Citadel | 🏰 | Sky Bridge |
| 6 Dragon's Lair | 🐉 | Dragon Roost |
| 7 Void Realm | 🌌 | Void Obelisk |
| 8 Celestial Plane | ✨ | Star Temple |

Each theme defines 3 resource emojis + a final building emoji. Completing the building shows a celebratory reveal of the level's structure. Reward = symbols proportional to sections finished (full = `cfg.symbolsToWin`, partial = pro-rated).

**File changes**:
- Add `src/data/buildings.ts` — `BUILDINGS[]` indexed by level id, each with `{ name, finalEmoji, resources: [emoji, emoji, emoji], sections: [name, name, name] }`.
- Rewrite `src/components/MiniGame.tsx` body (keep the same exported interface so `SeasonHub.tsx` doesn't change). Replaces match-3 grid logic with a tap-spawning resource-collection loop. Keeps difficulty selector, bomb spawner, revive flow, RewardedAdButton — they all already work.

### 2. Unique random items in Jack-in-the-Box (`MiniGameJack.tsx`)
Replace the single distractor card with a pool of **rare bonus items** that give one-off rewards on match (independent of season symbols):

| Item | Effect on match |
|---|---|
| 💰 Coin Cache | +50 coins |
| 🎲 Lucky Die | +1 roll |
| ⭐ Star Shard | +1 island star |
| 🃏 Mystery Card | +1 pending card flip |
| 💎 Gem | +25 coins × player level |

Board grows from 9 to 12 cards: 4 pairs of season symbol + 2 random unique-item pairs (drawn from pool, never duplicated). Matching a unique pair shows a small floating reward toast inside the modal and calls a new prop `onAwardItem(itemType, amount)`.

**File changes**:
- `src/components/MiniGameJack.tsx`: add `UNIQUE_ITEMS` pool, expand grid to 4×3, track item-match rewards, render reward badges in the result screen.
- Add new optional props: `onAddCoins`, `onAddRolls`, `onAwardStars`, `onAddCardFlip`, `playerLevel`.
- `src/components/SeasonHub.tsx`: pass these handlers through (already has access to `game.addCoins`, `game.addRolls`, `game.addStars`, plus a new `addCardFlip` helper from `useGameState`).
- `src/hooks/useGameState.ts`: add `addCardFlip(n)` callback.

### 3. Persistent rolls across levels (clarification + fix)
Investigation confirmed `state.rolls` is stored in `useGameState` and **never** reset on level-up — they already carry over globally. The user's perception likely stems from **the mini-game's internal flip/move counter resetting per play session**. Two improvements:

a. **Visible roll persistence proof** — add an info chip at the top of the LevelUp celebration: `"🎲 You still have {rolls} rolls"` so the user sees rolls survive level transitions. (Edit `LevelUpCelebration.tsx` + thread `rolls` prop from `Index.tsx`.)

b. **Mini-game flip carry-over** — in `MiniGameJack.tsx`, track unused flips in `localStorage` keyed by season+level so if the player closes mid-game they resume with the same remaining flips next open (within the same level only). New small helper `lov_jack_flips_left`.

### Files
- Create: `src/data/buildings.ts`
- Edit: `src/components/MiniGame.tsx` (rewrite body, keep interface)
- Edit: `src/components/MiniGameJack.tsx` (unique items, grid, persistent flips)
- Edit: `src/components/SeasonHub.tsx` (wire new handlers)
- Edit: `src/hooks/useGameState.ts` (add `addCardFlip`)
- Edit: `src/components/LevelUpCelebration.tsx` (rolls chip)
- Edit: `src/pages/Index.tsx` (thread `rolls` prop into celebration + new MiniGame handlers)

### End-to-End Test
After build → open Mini-Game from Season Hub: confirm intro shows the **current level's building blueprint**, pick difficulty, play → tap resources to fill 3 sections → win shows the completed building emoji + symbols awarded. Open Jack-in-the-Box: see 4×3 grid, find a 💰/🎲/⭐ pair → reward toast appears inside modal, on CLAIM verify coins/rolls/stars actually increase in HUD. Buy a Mega Pack to gain XP → trigger level up → celebration shows "You still have X rolls" chip; confirm rolls count is identical before and after. Close Jack mid-game with flips remaining → reopen → flips resume.

