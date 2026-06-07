/**
 * Tiny analytics shim. Pushes to `window.dataLayer` if present (GTM-style)
 * and always logs in dev so the team can confirm events fire exactly once.
 */

export interface IslandLandingEvent {
  landingId: string;
  rewardKind: string;
  amount: number;
  coinsBefore: number;
  coinsAfter: number;
  energyBefore: number;
  energyAfter: number;
}

type DataLayerWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
};

const seen = new Set<string>();

/** Test-only: clear the dedupe set between specs. */
export function __resetAnalyticsForTests() {
  seen.clear();
}

export function trackIslandLanding(evt: IslandLandingEvent): boolean {
  // Guard: never emit the same landingId twice, no matter how many times
  // a parent re-render or refresh calls us.
  if (seen.has(evt.landingId)) return false;
  seen.add(evt.landingId);

  const payload = { event: "island_landing", ...evt };
  if (typeof window !== "undefined") {
    const w = window as DataLayerWindow;
    if (Array.isArray(w.dataLayer)) w.dataLayer.push(payload);
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.info("[analytics] island_landing", payload);
  }
  return true;
}