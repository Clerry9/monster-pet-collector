
## Plan: Difficulty, Gestures, Revive, Auto-Stop Fix & Rewarded Ads

### 1. Mini-Game Difficulty Selector (Easy / Normal / Hard)
Add a 3-button difficulty picker on the intro screen of `MiniGame.tsx`. Persist last choice in localStorage.

| Difficulty | Win threshold | Time | Bomb tiles | Symbol drop |
|---|---|---|---|---|
| Easy | 150 score / 4 symbols | 60s | 0 | 22% |
| Normal | 200 / 5 | 45s | 1 (random spawn every 8s) | 18% |
| Hard | 300 / 6 | 35s | 2-3 (spawn every 5s) | 14% |

**Bomb tiles**: 💣 emoji that occupies a cell. Tapping a bomb ends the round immediately (or costs 50 score). Adds real risk.

### 2. Second-Chance Revive (Mini-Game)
On `GAME OVER`, show a "REVIVE" button:
- Pay 200 coins → +15s, clear bombs, keep current score/symbols
- OR watch rewarded ad → free revive (see §5)
- One revive per round.

### 3. Fix Auto-Spin Stop Bug (`GameBoard.tsx`)
**Root cause**: when autospin is active and user taps STOP, `onPointerDown` calls `stopAutoRoll()`, but `onPointerUp` fires `handlePressEnd(true)` which sees `isAutoRollingRef.current === false` and triggers a fresh `performRoll()`. The button also turns grey because of the `disabled={(isRolling && !isAutoRolling)}` race.

**Fix**: 
- Track `justStoppedRef` set true in `stopAutoRoll`, cleared on next pointer-down. `handlePressEnd` skips firing a roll when this flag is set.
- Also clear any pending `autoRollTimerRef` immediately and call `setIsRolling(false)` if a roll cycle was queued.
- Remove the disabled state during autospin entirely so the STOP label always stays clickable.

### 4. Pinch-to-Zoom & Double-Tap Recenter (`IsometricBoard.tsx`)
- Configure `OrbitControls` with `enableZoom`, `enablePan={false}`, `touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}` and reasonable `minDistance` / `maxDistance`.
- Add a `dblclick` listener on the Canvas wrapper that resets `transitionT` and snaps the `CameraRig` back to the chase-cam target (sets a `recenterRef` flag the rig reads in `useFrame`).
- Small floating "recenter" 🎯 button bottom-right of the canvas as a fallback for non-touch users.

### 5. Rewarded Ads → Bonus Coins (Revenue)
**Provider**: Google AdSense for the web build is not eligible for rewarded ads — those require a mobile SDK. Recommended path:
- **Web**: integrate **AdSense display ads** in non-intrusive slots (e.g., a 320×100 banner at the bottom of the Shop tab and between mini-game rounds). Plus a custom "Watch Ad for Coins" button using **CrazyGames Rewarded Ads SDK** or **Adinplay** — both free for web games and offer rewarded video. We'll wire to a generic `showRewardedAd(): Promise<boolean>` adapter so providers are swappable.
- **Mobile (Capacitor)**: use `@capacitor-community/admob` plugin for true rewarded video. Already viable since the project has `capacitor.config.ts`.

**Reward formula** (per user spec): every 5 player levels increases base reward by 50 coins.
```
reward = 50 + Math.floor((playerLevel - 1) / 5) * 50
// Lvl 1-4: 50 🪙, Lvl 5-9: 100 🪙, Lvl 10-14: 150 🪙, …
```

**UI hooks**:
- New `RewardedAdButton` component — purple gradient with 📺 icon, cooldown 60s between views, 5 ads/day cap.
- Placed in: Shop tab header, Mini-Game game-over screen (revive option), Daily Reward modal.
- New `useRewardedAd` hook tracks daily count (localStorage) + cooldown; calls the adapter; on success calls `addCoins(reward)`.

**Action required from user**: pick an ad provider before we wire real ads. Until then, the button works in **demo mode** (3-second simulated ad, awards coins) so you can test the entire UX. We'll surface a question after this plan if you want us to proceed with a specific provider.

### 6. Files to edit / create
**Edit**: `src/components/MiniGame.tsx` (difficulty, bombs, revive), `src/components/GameBoard.tsx` (stop fix), `src/components/IsometricBoard.tsx` (gestures, recenter), `src/pages/Index.tsx` (mount RewardedAdButton, pass coins/level).
**Create**: `src/components/RewardedAdButton.tsx`, `src/hooks/useRewardedAd.ts`, `src/lib/ads.ts` (provider adapter, demo mode default).

### End-to-End Test
After build: clear localStorage → mini-game intro shows 3 difficulty pills → pick Hard → bombs spawn, lose round → tap REVIVE (200 coins or Watch Ad) → finish round → on board, hold to autospin → tap PRESS once: STOP fires immediately, button stays red (not grey), no extra roll queued → pinch on board canvas to zoom, double-tap to recenter → open Shop, tap "Watch Ad for +50/100/… coins", confirm coins added and 60s cooldown.
