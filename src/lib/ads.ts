// Rewarded-ad provider adapter.
// Default: demo mode (3-second simulated ad). Swap for AdSense, CrazyGames,
// Adinplay, or AdMob (Capacitor) by replacing showRewardedAd.

export type AdProvider = "demo" | "crazygames" | "adinplay" | "admob";

const PROVIDER: AdProvider = "demo";

/** Returns true if the ad completed and the user earned the reward. */
export async function showRewardedAd(): Promise<boolean> {
  switch (PROVIDER) {
    case "demo":
    default:
      // Simulated 3-second ad
      await new Promise((r) => setTimeout(r, 3000));
      return true;
  }
}

/** Coin reward formula: +50 base, +50 per 5 levels. */
export function getAdReward(playerLevel: number): number {
  return 50 + Math.floor(Math.max(0, playerLevel - 1) / 5) * 50;
}

export const AD_DAILY_CAP = 5;
export const AD_COOLDOWN_MS = 60_000;
