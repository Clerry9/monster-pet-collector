
## Goal
Re-skin the game to match the chunky, warm cartoon-casino vibe of the reference image — without copying any specific characters or branded art. Keep all gameplay logic intact.

## Visual direction (inspired, not copied)
- **Palette swap**: dark neon → warm cream/wood. Cream background `#F4DCB0`, wood-brown panels `#8B4A24`, gold accents `#F5B324`, candy-red CTA `#E63946`.
- **Chunky pill UI**: top stats (coins, gems, rolls) become big golden pill badges with thick brown borders, bold drop shadows, and "+" buttons on the right.
- **Wooden stage frame**: wrap the game board in a wood-grain panel with a curved gold "MONSTER MASH" banner on top (replacing the plain text title) and small character cutouts peeking from the sides (use existing monster emojis/sprites — no copyrighted characters).
- **Big red PRESS button**: replace the small dice button with a large circular red 3D button labelled "PRESS" sitting on a grey base. Caption underneath: "HOLD FOR AUTOSPIN" (already wired to the 2-sec hold logic).
- **Side rails**: convert the tab bar into two vertical rails of square golden icon tiles (left + right of board) with little timer/badge counters — reuses existing tab targets (Monster, Cards, Shop, Collection, Spin, Daily).
- **Energy/bet bar**: bet selector restyled as a glowing pink "energy" pill `120/120` with a "BET ×N" gold pill beside it.
- **Typography**: drop horror font `Creepster`, switch display to a chunky rounded font (`Luckiest Guy` from Google Fonts) for that cartoon-casino feel; keep `Nunito` for body.
- **Decorative bits**: subtle confetti specks, soft radial glow behind the board, gold sparkles around the PRESS button.

## What changes (file-by-file)
1. **`src/index.css`** — swap the `:root` palette to the warm cream/wood/gold tokens, import `Luckiest Guy`, add new utility classes: `.panel-wood`, `.pill-gold`, `.btn-press` (red 3D), `.icon-tile-gold`, `.banner-gold`.
2. **`tailwind.config.ts`** — extend with `boxShadow.chunky` (hard offset shadow for the cartoon pop), wood/gold/cream named colors so we can use them directly.
3. **`src/pages/Index.tsx`** — restructure layout: top stat-pill row (coins / gems-or-rolls / level), curved gold banner with title, board wrapped in wood panel, side icon rails replacing horizontal `GameTabs` on board view (keep horizontal tabs as fallback for narrow widths).
4. **`src/components/CoinCounter.tsx`** — restyle as the gold pill with "+" button.
5. **`src/components/GameTabs.tsx`** — add a `variant="rail"` mode rendering vertical golden square icon tiles with badges.
6. **`src/components/GameBoard.tsx`** — replace the dice square with the round red `btn-press` (keep all hold/auto-roll logic untouched), restyle the result toast as a wood-framed pill.
7. **`src/components/BetSelector.tsx`** — restyle as the pink energy pill + gold "BET ×N" pill.
8. **`src/components/LevelProgressBar.tsx`** — restyle as a thick gold-bordered XP bar with the level badge on the left (matches the "5/5" badge in the reference).
9. **`src/components/IsometricBoard.tsx`** — recolor the 3D scene tiles/lighting to the warm palette so it sits inside the wood frame naturally (no geometry changes).

## Out of scope (to keep this focused)
- No new characters/sprites — we keep the existing monsters (`MonsterDisplay`, `MONSTERS` data) since copying the reference's specific characters would be IP infringement.
- No gameplay/logic changes.
- No app-store/Capacitor changes.

## ASCII layout sketch
```text
┌──────────────────────────────────────────┐
│  [LV 5] ━━ XP ━━━━     🪙 12,340  +     │
│                                          │
│  ╭── ⭐ MONSTER MASH ⭐ ───╮              │
│  │                          │   [icon]   │
│ [icon]   3D BOARD INSIDE    │   [icon]   │
│ [icon]    WOOD FRAME        │   [icon]   │
│  │                          │   [icon]   │
│  ╰──────────────────────────╯            │
│                                          │
│      ⚡ 120/120     BET ×10              │
│                                          │
│            ╭───────╮                     │
│            │ PRESS │  ← big red button   │
│            ╰───────╯                     │
│         hold for autospin                │
└──────────────────────────────────────────┘
```
