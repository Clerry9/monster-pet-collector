
## Plan: Monster Animation, CrazyGames Web Ads & AdMob Mobile Ads

### 1. Idle Breathing + Walk-Cycle Animation (`IsometricBoard.tsx`)
Inside the 3D monster mesh group, add a `useFrame` hook that animates child refs based on whether the monster is moving:

- **Idle breathing** (when `isMoving === false`):
  - Body sphere `scale.y = 1 + Math.sin(t * 2.5) * 0.04` (gentle inflate/deflate)
  - Body `position.y = baseY + Math.sin(t * 2.5) * 0.02`
  - Horns/eyes ride along on the body group
- **Walk cycle** (when `isMoving === true`):
  - Two foot meshes alternate: `leftFoot.position.y = Math.max(0, Math.sin(t * 14)) * 0.12`, right uses `Math.sin(t * 14 + π)`
  - Body bobs faster: `Math.sin(t * 14) * 0.05`
  - Subtle forward lean via `body.rotation.x = -0.08`
- Refs: `bodyRef`, `leftFootRef`, `rightFootRef` attached to existing meshes; no new geometry needed.

### 2. CrazyGames SDK v3 (Web Rewarded Ads)
- Add to `index.html` `<head>`:
  ```html
  <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
  ```
- `src/lib/ads.ts` already has the CrazyGames branch (`hasCrazyGames()` → `sdk.ad.requestAd("rewarded")`); once the script loads, `initAds()` will auto-select `"crazygames"` on web instead of `"demo"`. No code changes needed in ads.ts.
- Note for the user: real ad fill only works once the game is hosted on CrazyGames' platform (or on a domain they've whitelisted). On the Lovable preview it falls back gracefully.

### 3. AdMob for Mobile (`@capacitor-community/admob`)
- Install dep: `@capacitor-community/admob` (latest v6 compatible with Capacitor 6).
- `src/lib/ads.ts` already has the AdMob branch wired via dynamic import — once installed, `initAds()` auto-selects `"admob"` on native builds.
- Update the placeholder ad unit IDs in `src/lib/ads.ts`:
  - Keep Google's official **test IDs** as the default (safe for development).
  - Add a clear `// TODO: replace with your real AdMob unit IDs before production` comment block with instructions.
  - Real IDs require the user to create an AdMob account → app → rewarded ad unit, then paste their `ca-app-pub-XXX/YYY` strings.
- Add `AdMob` plugin config block to `capacitor.config.ts`:
  ```ts
  plugins: {
    AdMob: {
      appId: { android: "ca-app-pub-3940256099942544~3347511713", ios: "ca-app-pub-3940256099942544~1458002511" },
    }
  }
  ```
  (Test app IDs; user swaps later.)
- Tell the user to run `npx cap sync` after the install so the native projects pick up the plugin, and to add their real AdMob App ID to `AndroidManifest.xml` / `Info.plist` per the plugin README when they go live.

### Files to edit
- `index.html` — add CrazyGames SDK script tag
- `src/components/IsometricBoard.tsx` — breathing + walk cycle on monster
- `src/lib/ads.ts` — add TODO comments + clearer instructions (no logic change)
- `capacitor.config.ts` — add AdMob plugin block
- `package.json` — add `@capacitor-community/admob` dependency

### End-to-End Test
After build: open Game tab → confirm monster gently breathes while idle, and legs alternate during a hop → open browser DevTools console, verify CrazyGames SDK loads (`window.CrazyGames` defined) → tap Watch Ad: on Lovable preview falls back to demo (3s) since domain isn't whitelisted; on a real CrazyGames host it would show a real rewarded video → on a mobile build (after `npx cap sync`), tap Watch Ad to see Google's test rewarded video play full-screen.
