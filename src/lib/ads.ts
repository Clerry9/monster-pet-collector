// Rewarded-ad provider adapter with runtime switch:
// - Native (Capacitor): @capacitor-community/admob rewarded video
// - Web: CrazyGames SDK (window.CrazyGames.SDK.ad.requestAd("rewarded"))
// - Fallback: 3-second simulated demo ad
//
// To go live on web:
//   1. Register your game on CrazyGames developer portal.
//   2. Add <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
//      to index.html (or load conditionally).
// To go live on mobile:
//   1. npm i @capacitor-community/admob
//   2. npx cap sync
//   3. Configure your AdMob app + rewarded ad unit IDs below.

export type AdProvider = "demo" | "crazygames" | "admob";

// AdMob ad unit IDs.
// TODO: replace with your real AdMob unit IDs before production.
//   1. Create an AdMob account → app → Rewarded ad unit.
//   2. Paste the `ca-app-pub-XXXXXXXXXXXX/YYYYYYYYYY` strings below.
//   3. Also update the AdMob `appId` in `capacitor.config.ts`.
//   4. Add your real AdMob App ID to `android/app/src/main/AndroidManifest.xml`
//      and `ios/App/App/Info.plist` (GADApplicationIdentifier) per the
//      @capacitor-community/admob README.
//   5. Run `npx cap sync` after installing/updating the plugin.
// Defaults below are Google's official TEST IDs — safe for development.
const ADMOB_REWARDED_ANDROID = "ca-app-pub-3940256099942544/5224354917";
const ADMOB_REWARDED_IOS = "ca-app-pub-3940256099942544/1712485313";

let initialized = false;
let activeProvider: AdProvider = "demo";
let crazyReady = false;

function isNative(): boolean {
  // Capacitor sets window.Capacitor at runtime on native builds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (typeof window !== "undefined" ? (window as any).Capacitor : null);
  return !!cap?.isNativePlatform?.();
}

function hasCrazyGames(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = typeof window !== "undefined" ? (window as any) : null;
  return !!w?.CrazyGames?.SDK;
}

function getCrazySdk(): any | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = typeof window !== "undefined" ? (window as any) : null;
  return w?.CrazyGames?.SDK ?? null;
}

/** Manual override: append `?crazygames=1` to force the SDK path during QA. */
function forceCrazyOverride(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("crazygames") === "1";
}

/** Initializes the chosen provider. Safe to call multiple times. */
export async function initAds(): Promise<AdProvider> {
  if (initialized) return activeProvider;
  initialized = true;

  if (isNative()) {
    try {
      // Lazy import via runtime string so the web bundle / typechecker
      // doesn't require the native module to be installed.
      const modName = "@capacitor-community/admob";
      const mod = await import(/* @vite-ignore */ modName).catch(() => null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AdMob = (mod as any)?.AdMob;
      if (AdMob) {
        await AdMob.initialize({
          requestTrackingAuthorization: true,
          initializeForTesting: true,
        });
        activeProvider = "admob";
        return activeProvider;
      }
    } catch {
      // fall through
    }
  }

  if (hasCrazyGames()) {
    activeProvider = "crazygames";
    try {
      const sdk = getCrazySdk();
      // Init is sync in v3 but call defensively
      await sdk.init?.();
      crazyReady = true;
      console.info("[ads] CrazyGames SDK initialized");
    } catch (e) {
      console.warn("[ads] CrazyGames init failed", e);
    }
    return activeProvider;
  }

  if (forceCrazyOverride()) {
    console.warn("[ads] crazygames=1 override set but SDK not loaded yet");
  }
  activeProvider = "demo";
  return activeProvider;
}

/** Returns true if the ad completed and the user earned the reward. */
export async function showRewardedAd(): Promise<boolean> {
  const provider = await initAds();

  if (provider === "admob") {
    try {
      const modName = "@capacitor-community/admob";
      const mod = await import(/* @vite-ignore */ modName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AdMob = (mod as any).AdMob;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const platform = (window as any)?.Capacitor?.getPlatform?.() ?? "android";
      const adId = platform === "ios" ? ADMOB_REWARDED_IOS : ADMOB_REWARDED_ANDROID;
      await AdMob.prepareRewardVideoAd({ adId });
      const result = await AdMob.showRewardVideoAd();
      // result has { type, amount } when rewarded
      return !!result;
    } catch (e) {
      console.warn("[ads] AdMob failed, falling back to demo", e);
    }
  }

  if (provider === "crazygames") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdk = (window as any).CrazyGames.SDK;
      // SDK v3 returns a Promise that resolves on completion / rejects on skip
      await sdk.ad.requestAd("rewarded");
      return true;
    } catch (e) {
      console.warn("[ads] CrazyGames ad skipped/failed", e);
      return false;
    }
  }

  // Demo fallback — 3-second simulated ad
  await new Promise((r) => setTimeout(r, 3000));
  return true;
}

/** Coin reward formula: +50 base, +50 per 5 levels. */
export function getAdReward(playerLevel: number): number {
  return 50 + Math.floor(Math.max(0, playerLevel - 1) / 5) * 50;
}

export const AD_DAILY_CAP = 5;
export const AD_COOLDOWN_MS = 60_000;

/**
 * Notify the CrazyGames SDK that active gameplay has started.
 * This is required by their portal — ad pacing + analytics depend on it.
 * Safe to call before init; no-op on other providers.
 */
export function gameplayStart() {
  if (!crazyReady) return;
  try { getCrazySdk()?.game?.gameplayStart?.(); } catch { /* ignore */ }
}

/** Pair to gameplayStart — call when the player pauses or leaves active play. */
export function gameplayStop() {
  if (!crazyReady) return;
  try { getCrazySdk()?.game?.gameplayStop?.(); } catch { /* ignore */ }
}

/**
 * Hint to the SDK that this is a natural break / win moment — they may
 * choose to insert an interstitial here. Player still sees rewarded ads
 * only when they click a Watch Ad button.
 */
export function adBreakHappytime() {
  if (!crazyReady) return;
  try { getCrazySdk()?.game?.happytime?.(); } catch { /* ignore */ }
}

/** Returns true if CrazyGames detects an ad blocker. Best-effort. */
export async function isAdBlocked(): Promise<boolean> {
  try {
    const r = await getCrazySdk()?.ad?.hasAdblock?.();
    return !!r;
  } catch {
    return false;
  }
}
