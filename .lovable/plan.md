## Overview

Two parallel tracks: (A) graphics & gameplay polish, (B) optional rewarded-ad system that grants player-chosen rewards. The project already has `src/lib/ads.ts`, `useRewardedAd`, and a `RewardedAdButton` scaffold wired to the CrazyGames SDK and AdMob — we'll extend that scaffolding rather than start from scratch.

---

## A. Graphics & Gameplay

### 1. 3D-style animated dice rolls
- Add `react-three-fiber@^8.18` + `@react-three/drei@^9.122.0` + `three@^0.160`.
- New `src/components/Dice3D.tsx`: a tumbling cube with face textures matching current dice tiers (basic/silver/gold). Use a deterministic settle animation that lands on the rolled value (passed in as prop) so visuals match game logic.
- Replace existing 2D dice render in `GameBoard.tsx`/`Index.tsx` (whichever currently shows the roll) with `<Dice3D value={rolled} tier={activeDiceTier} />`. Fall back to the current 2D version when `prefers-reduced-motion` is set or `lowPower` mode is on.

### 2. Reward landing celebrations (toggleable)
- New `src/components/RewardCelebration.tsx`: short Lottie/Framer-Motion animation triggered when the player lands on a high-value tile (energy refill, big coin tile, card pack, crit). Variants per reward type (energy = lightning + monster dance, coins = coin shower, card = card flip glow).
- Add `celebrations_enabled` boolean to `SettingsDialog.tsx` (persisted in `localStorage`); default on. Wrap celebration trigger in this flag.
- Hook the trigger into `useGameState.rollDice` so when the resolved tile matches a "great reward" category, it fires `celebrationBus.emit(type)`.

### 3. Particle effects on wins/crits
- Lightweight CSS/Framer-Motion confetti + coin-burst component in `src/components/effects/Particles.tsx` (no extra deps). Triggered alongside celebrations and on level-up / pack open.

### 4. Polished theme & typography
- In `index.css` + `tailwind.config.ts`: introduce a refined HSL token palette (deepen background, add `--accent-glow`, `--surface-elevated`, `--gradient-hero`, `--shadow-glow`).
- Add a display font (e.g. "Space Grotesk" or "Bricolage Grotesque") via `<link>` in `index.html`; map to `font-display` Tailwind utility. Keep body font.
- Sweep `TopHud`, `GameTabs`, `SeasonHub`, `DiceShop` headings to use `font-display` and the new gradient/shadow tokens — tokens only, no raw colors.

### 5. Animated backgrounds
- New `src/components/effects/AnimatedBackdrop.tsx`: slow-moving radial gradient blobs (CSS `@keyframes`, GPU-friendly). Mounted in `Index.tsx` behind game content; respects reduced-motion.

### 6. Daily streaks & login bonuses
- Migration: new table `daily_streaks(user_id pk, current_streak int, best_streak int, last_claim_date date, updated_at)`. RLS: user reads/updates own row; service role full.
- New hook `useDailyStreak.ts`: on app open if `last_claim_date < today`, show modal with current streak day; if yesterday → increment, else reset to 1. Reward ladder (day 1: 50 coins, day 3: 100 coins + 1 roll, day 7: rare card pack, day 14: gold, etc.).
- New `src/components/DailyStreakModal.tsx` shown via `Index.tsx`.

### 7. Achievements with rewards
- Migration: `achievements_def` (static seed: code, title, description, target, reward_kind, reward_amount) + `user_achievements(user_id, achievement_code, progress, completed_at, claimed_at)`. Seed ~12 starter achievements (first roll, 100 rolls, 1000 rolls, first crit, 10 crits, collect 5/25/all cards, open 5 packs, level 5/25/50, 7-day streak).
- New `src/hooks/useAchievements.ts` increments progress on game events (rolls, crits, packs, level-ups). Auto-toast when unlocked + grant reward via existing `spend_coins_rolls`-style RPC.
- New `src/pages/Achievements.tsx` listed in `GameTabs`.

### 8. Mini-quests / daily missions
- Migration: `daily_missions(user_id, mission_date, mission_code, target, progress, claimed)`. A small static catalog (`src/data/missions.ts`) with rotating picks (3/day) — server-side helper RPC `roll_daily_missions()` to assign deterministically per user/date.
- New `src/components/DailyMissions.tsx` panel in `Index.tsx` sidebar / tab. Same event hooks as achievements.

---

## B. Optional rewarded ads (player-choice)

The user keeps full control: nothing auto-plays, every reward shows a "Watch Ad to Claim" button next to a "No thanks / Skip" button.

### 1. Provider
- Use existing CrazyGames SDK adapter in `src/lib/ads.ts` (already implemented). Add the script tag conditionally in `index.html`:
  `<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>`
- Keep the existing `demo` fallback (3-second simulated ad) for local dev.
- AdMob path stays for future native build.

### 2. Reward menu
- New `src/components/AdRewardMenu.tsx`: opens a modal with 4 options (each a card with icon + cooldown timer):
  | Reward | Cooldown | Daily cap |
  |---|---|---|
  | +50 energy | 30 min | 6 |
  | +200 coins | 30 min | 6 |
  | Free roulette spin | 24 h | 1 |
  | Free common card pack | 24 h | 1 |
- Each card shows "Watch Ad" (primary) and an "X / Close" (secondary). No reward without finishing the ad. If user closes early, no penalty.

### 3. State & enforcement
- Migration: `ad_reward_claims(user_id, reward_kind, claimed_at)`. RLS: user reads own; insert via SECURITY DEFINER RPC `claim_ad_reward(p_kind text)` that:
  - Verifies cooldown (30 min or 24 h depending on kind) and daily cap.
  - Grants reward (energy/coins/roulette spin via `grant_paid_roulette_spins`-style helper, or queues a card pack flip via `pending_card_flips`).
  - Inserts log row.
- Client calls `showRewardedAd()` first; only on successful completion calls the RPC. RPC is the single source of truth so users can't bypass via DevTools.
- Log to `pack_analytics` with `event = 'ad_reward_claimed'` so they appear in the existing admin dashboard.

### 4. Entry points
- "Free Rewards" button in `TopHud` (gift icon with pulse when any reward is off-cooldown).
- Inline "Out of energy? Watch an ad for +50" prompt on `BetSelector` when `energy < requiredEnergy` and that ad reward is available.
- Optional "Double your roulette reward — Watch Ad?" after a roulette spin (purely opt-in, dismissible).

### 5. Settings
- `SettingsDialog.tsx`: add "Show ad reward prompts" toggle (default on). When off, only the manual `AdRewardMenu` button remains; no contextual prompts appear.

---

## Database changes (single migration)
- `daily_streaks`, `achievements_def`, `user_achievements`, `daily_missions`, `ad_reward_claims` tables with RLS.
- RPCs: `claim_daily_streak()`, `claim_achievement(code)`, `claim_mission(code)`, `claim_ad_reward(kind)`, `roll_daily_missions()`.
- Seed `achievements_def` with starter rows.

## Files (new)
`src/components/Dice3D.tsx`, `src/components/RewardCelebration.tsx`, `src/components/effects/Particles.tsx`, `src/components/effects/AnimatedBackdrop.tsx`, `src/components/DailyStreakModal.tsx`, `src/components/DailyMissions.tsx`, `src/components/AdRewardMenu.tsx`, `src/hooks/useDailyStreak.ts`, `src/hooks/useAchievements.ts`, `src/hooks/useDailyMissions.ts`, `src/data/missions.ts`, `src/pages/Achievements.tsx`, plus migration.

## Files (edited)
`index.html` (CrazyGames SDK + display font), `index.css`, `tailwind.config.ts`, `src/components/SettingsDialog.tsx`, `src/components/TopHud.tsx`, `src/components/BetSelector.tsx`, `src/components/GameBoard.tsx`, `src/components/GameTabs.tsx`, `src/pages/Index.tsx`, `src/hooks/useGameState.ts`, `src/hooks/useRewardedAd.ts`, `src/lib/ads.ts`, `src/App.tsx`.

## Out of scope (ask before adding)
- Real CrazyGames developer registration / publisher account setup (you'll need to register the game and may need to swap the SDK script for your publisher build).
- Native AdMob production IDs (currently using Google test IDs).
- Music/sfx pack expansion.
