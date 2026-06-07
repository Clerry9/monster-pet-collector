import { describe, it, expect, beforeEach, vi } from "vitest";
import { trackIslandLanding, __resetAnalyticsForTests } from "./analytics";

describe("trackIslandLanding", () => {
  beforeEach(() => {
    __resetAnalyticsForTests();
    (window as unknown as { dataLayer: unknown[] }).dataLayer = [];
  });

  it("fires exactly once per landingId even if called repeatedly", () => {
    const evt = {
      landingId: "land-1",
      rewardKind: "shards",
      amount: 5,
      coinsBefore: 100,
      coinsAfter: 100,
      energyBefore: 10,
      energyAfter: 10,
    };
    expect(trackIslandLanding(evt)).toBe(true);
    expect(trackIslandLanding(evt)).toBe(false);
    expect(trackIslandLanding(evt)).toBe(false);
    const dl = (window as unknown as { dataLayer: unknown[] }).dataLayer;
    expect(dl).toHaveLength(1);
  });

  it("reports correct before/after for skull bust", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    trackIslandLanding({
      landingId: "skull-1",
      rewardKind: "skull",
      amount: 10,
      coinsBefore: 1000,
      coinsAfter: 990,
      energyBefore: 5,
      energyAfter: 5,
    });
    const dl = (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer;
    expect(dl[0]).toMatchObject({
      event: "island_landing",
      rewardKind: "skull",
      coinsBefore: 1000,
      coinsAfter: 990,
    });
    spy.mockRestore();
  });
});