## 1. 3D dice + landing celebrations + particles (Phase 2 of graphics)

- Add deps: `three`, `@react-three/fiber`, `@react-three/drei`.
- New `src/components/Dice3D.tsx`: tumbling cube, deterministic settle on `value` prop, tier-based materials (basic/silver/gold). Falls back to current 2D dice if `prefers-reduced-motion` or `lowPower` is on.
- Wire into `GameBoard.tsx` / `Index.tsx` where the dice currently render.
- New `src/components/RewardCelebration.tsx`: per-reward Framer Motion variants (energy = lightning + monster wiggle, coins = coin shower, card = flip glow, crit = burst). Triggered from `useGameState.rollDice` after tile resolves.
- Wire `ParticleBurst` (already exists) into level-up, crit, and pack-open moments.
- `SettingsDialog.tsx`: add `celebrations_enabled` toggle (localStorage, default on); gate celebrations + particles behind it.

## 2. Daily missions (rotate per day, same shape as achievements)

Database (single migration):
- `missions_def(code pk, title, description, target int, reward_kind text, reward_amount int, weight int default 1, enabled bool default true)` — static catalog seeded with ~10 missions (roll N times, earn N coins, land N crits, open 1 pack, level up once, win at roulette, etc.).
- `daily_missions(id, user_id, mission_date date, code, target, progress, completed_at, claimed_at, created_at, updated_at)` with `unique(user_id, mission_date, code)`.
- RLS: user reads/updates own rows on `daily_missions`; `missions_def` is public-read.
- RPC `get_or_roll_daily_missions()` SECURITY DEFINER: if user has no rows for today (UTC), deterministically pick 3 from `missions_def` using a hash of `(user_id, mission_date)` so it's stable per day per user, insert them, return today's rows.
- RPC `claim_mission(p_code text)` SECURITY DEFINER: same shape as `claim_achievement` — verifies progress >= target and not yet claimed, grants reward via `game_state` update, marks `claimed_at`.

Client:
- `src/hooks/useDailyMissions.ts` — fetches today's missions on mount, exposes `progress(code, delta)` to bump local state, and a `claim(code)` wrapper. Mirrors `useAchievements.ts` exactly.
- `src/components/DailyMissions.tsx` — panel in `Index.tsx` (next to the achievements/streak entry points) showing 3 cards with progress bars + Claim buttons.
- Hook event bumps into `useGameState` (rolls, crits, coins earned, packs opened, level-ups) — extend the same callsites already used by `useAchievements`.

## 3. CrazyGames SDK — production wiring

Code side (what I will do):
- Keep current SDK script in `index.html` (already added).
- Update `src/lib/ads.ts`: log SDK init result, surface `isAdBlocked()` check, and call `sdk.game.gameplayStart()` / `gameplayStop()` around active play sessions so CrazyGames analytics + ad pacing work correctly. Also call `sdk.game.happytime()` after wins (their recommended hook for natural ad break moments).
- Add a small `CrazyGamesProvider` init in `App.tsx` that runs once on mount.
- Add `?crazygames=1` URL flag override so we can force the SDK path during QA on the lovable preview.

What you must do in the CrazyGames developer portal (cannot be automated):
1. Finish the developer registration (you said you've signed up).
2. Create a new game entry, upload a build (zip of `dist/` after `vite build`), set orientation = landscape/portrait as appropriate, and submit for review.
3. Under your game's **Monetization** tab, enable rewarded ads.
4. Under **Payments / Payout settings**: add PayPal or bank info, tax form (W-8BEN if outside the US, W-9 if US), and confirm payout threshold.
5. Once approved, CrazyGames hosts the build on their CDN — real ads only fill when players play on crazygames.com (or in approved embeds), not on your own domain.

Revenue mechanics (informational):
- CrazyGames pays a revenue share of net ad revenue, monthly, once you hit the $100 minimum payout. Reporting is in their developer dashboard.
- Embedding the SDK on monsterpetcol.com will not earn revenue — only submitted builds hosted by CrazyGames monetize.

## Out of scope (ask before adding)
- Replacing the demo fallback entirely (kept so local dev / your own domain still works).
- Native AdMob production IDs (still on Google test IDs).
- Cross-promo / branded-content units from CrazyGames Playhub.

## Files

New: `src/components/Dice3D.tsx`, `src/components/RewardCelebration.tsx`, `src/components/DailyMissions.tsx`, `src/hooks/useDailyMissions.ts`, plus one migration.

Edited: `src/components/GameBoard.tsx`, `src/pages/Index.tsx`, `src/hooks/useGameState.ts`, `src/components/SettingsDialog.tsx`, `src/lib/ads.ts`, `src/App.tsx`, `package.json` (three deps).
