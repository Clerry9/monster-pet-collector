## Plan

### 1. Collection progress + "collected" checklist
**`src/components/MonsterCollection.tsx`** — extend the existing album:
- Add an overall progress bar (already shows %, add the bar visual + count per rarity tier: e.g. `Common 3/4 · Rare 2/3 · Epic 1/2 · Legendary 0/1`).
- Add a "Checklist" toggle below the biome grid showing every monster as a row with a check icon, name, rarity badge, and ✅ / ⬜ status.
- Empty-state explanations: if a biome has 0 unlocked, render a muted hint ("Reach X coins to unlock your first monster here").
- Tile shows "X / Y coins toward unlock" mini-bar for locked-but-affordable-soon monsters.

### 2. Coin / reward gallery
**New `src/components/CoinRewardGallery.tsx`** — reads `SHARED_POOL` from `src/data/rewardPool.ts`, groups by inferred rarity (weight → tier: weight ≥ 25 common, 14–24 rare, 7–13 epic, ≤6 legendary), shows emoji + label + odds + per-rarity progress (using `useRouletteHistory` / `useLotteryHistory` "first seen" tracking already in the project). Empty-state copy: "Spin the Lucky Roulette to discover this reward."

**`src/components/MonsterCollection.tsx`** — add a small `Tabs` header at the top: **Monsters** | **Rewards**, rendering the new gallery in the second tab so it lives in the existing "Collection" page slot.

### 3. Move PREVIEW BET card so it stops overlapping
**`src/components/BetSelector.tsx`** — instead of `self-start`, render the preview card as an `absolute` positioned chip anchored to the right of the bet row at `md:` breakpoint, and stacked above on mobile. Use a wrapping flex container with `min-w-0` on neighbors and `pr-[<width>]` reservation so the spin/roll button never collides. Also clamp `max-w-[180px]` and add `truncate` + `flex-wrap` to inner text. Add a small `ResizeObserver`-based offset (object-detection-lite) that, on mount and on window resize, measures the parent action bar and shifts the preview chip horizontally to whichever side has more free space.

### 4. Service-worker background push
- **New `public/sw.js`** — minimal service worker handling `message` events for scheduled notifications. Stores `{ key, atMs, title, body }` in IndexedDB so reminders fire even when the tab is closed; uses `self.registration.showNotification` from a `setTimeout` that's re-armed on every `activate`.
- **New `src/lib/swRegister.ts`** — registers `/sw.js` from `main.tsx`.
- **`src/lib/notifications.ts`** — when a SW controller is available, `postMessage({ type: "schedule", ... })` to the SW instead of `setTimeout` in-page. Falls back to current in-tab timer when SW is unsupported. Same `scheduleAt` / `cancelScheduled` API — no caller changes needed.
- **`src/main.tsx`** — call `registerServiceWorker()` after mount.
- Daily-reward and energy-cooldown reminder call sites in `Index.tsx` keep working unchanged.

### 5. Release notes
Write **`docs/RELEASE-NOTES.md`** covering every shipped change across this session: roulette loop fixes, live preview panel, BET preview chip, daily-reward / streak once-per-day gating, accessibility settings panel (reduce motion + contrast), in-tab notifications, v1.0 footer stamp, screen-reader wedge announcer, energy countdown, NOT-ENOUGH-ENERGY modal a11y. Include version **v1.0.0** header + date.

### Out of scope
- Database / RLS / edge functions.
- Native push (FCM/APNs) — only Web Push via SW.
- Paddle, season, auth, or reward-odds changes.

### Files touched
- edit: `src/components/MonsterCollection.tsx`, `src/components/BetSelector.tsx`, `src/lib/notifications.ts`, `src/main.tsx`
- new: `src/components/CoinRewardGallery.tsx`, `src/lib/swRegister.ts`, `public/sw.js`, `docs/RELEASE-NOTES.md`
