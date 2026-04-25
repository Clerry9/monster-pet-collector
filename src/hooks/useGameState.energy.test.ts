import { describe, it, expect } from "vitest";
import {
  applyRegen,
  sanitizeEnergyDelta,
  energyCapForLevel,
  ENERGY_REGEN_MS,
  ENERGY_BASE_CAP,
  type GameState,
} from "./useGameState";

const baseState = (overrides: Partial<GameState> = {}): GameState => ({
  coins: 0,
  rolls: 0,
  position: 0,
  unlockedMonsters: ["gobby"],
  activeMonster: "gobby",
  unlockedDiceTiers: ["basic"],
  activeDiceTier: "basic",
  totalSteps: 0,
  cardsCollected: 0,
  collectedCards: [],
  monsterTaps: {},
  level: 1,
  xp: 0,
  betMultiplier: 1,
  islandStars: 0,
  pendingCardFlips: 0,
  lastSpinAt: null,
  energy: ENERGY_BASE_CAP,
  energyUpdatedAt: new Date(0).toISOString(),
  ...overrides,
});

describe("energyCapForLevel", () => {
  it("computes base cap at level 1", () => {
    expect(energyCapForLevel(1)).toBe(150);
  });
  it("scales by 10% per level", () => {
    expect(energyCapForLevel(2)).toBe(165);
    expect(energyCapForLevel(10)).toBe(285);
  });
});

describe("applyRegen", () => {
  const T0 = 1_700_000_000_000;

  it("does not regen when at cap and pins anchor to now", () => {
    const s = baseState({ energy: 150, energyUpdatedAt: new Date(T0).toISOString() });
    const out = applyRegen(s, T0 + 60 * 60 * 1000);
    expect(out.energy).toBe(150);
    expect(Date.parse(out.energyUpdatedAt)).toBe(T0 + 60 * 60 * 1000);
  });

  it("does not regen overflow energy and pins anchor to now", () => {
    const s = baseState({ energy: 200, energyUpdatedAt: new Date(T0).toISOString() });
    const out = applyRegen(s, T0 + 10 * ENERGY_REGEN_MS);
    expect(out.energy).toBe(200);
    expect(Date.parse(out.energyUpdatedAt)).toBe(T0 + 10 * ENERGY_REGEN_MS);
  });

  it("grants 1 energy per ENERGY_REGEN_MS elapsed", () => {
    const s = baseState({ energy: 100, energyUpdatedAt: new Date(T0).toISOString() });
    const out = applyRegen(s, T0 + 3 * ENERGY_REGEN_MS + 30_000);
    expect(out.energy).toBe(103);
    // Anchor advances by exactly 3 ticks (preserves the 30s leftover for next tick)
    expect(Date.parse(out.energyUpdatedAt)).toBe(T0 + 3 * ENERGY_REGEN_MS);
  });

  it("caps regen at level cap", () => {
    const s = baseState({ energy: 148, level: 1, energyUpdatedAt: new Date(T0).toISOString() });
    const out = applyRegen(s, T0 + 100 * ENERGY_REGEN_MS);
    expect(out.energy).toBe(150);
  });

  it("resumes regen immediately after dropping below cap (anchor pinned at cap)", () => {
    // Step 1: at cap — anchor pinned to T0
    const atCap = baseState({ energy: 150, energyUpdatedAt: new Date(T0).toISOString() });
    const pinned = applyRegen(atCap, T0);
    expect(pinned.energy).toBe(150);

    // Step 2: spend 1 energy at T0 + 1s
    const afterSpend: GameState = { ...pinned, energy: 149 };

    // Step 3: at T0 + ENERGY_REGEN_MS we should regen 1 (full interval available)
    const out = applyRegen(afterSpend, T0 + ENERGY_REGEN_MS);
    expect(out.energy).toBe(150);
  });

  it("is a no-op when no full tick has elapsed", () => {
    const s = baseState({ energy: 100, energyUpdatedAt: new Date(T0).toISOString() });
    const out = applyRegen(s, T0 + ENERGY_REGEN_MS - 1);
    expect(out).toBe(s);
  });

  it("treats invalid timestamps as 'now' instead of NaN", () => {
    // Invalid anchor → treated as `now`; first call is a no-op (elapsed=0),
    // and a subsequent call after a full interval still grants regen correctly.
    const s = baseState({ energy: 100, energyUpdatedAt: "not-a-date" });
    const noop = applyRegen(s, T0);
    expect(noop.energy).toBe(100);
    // After ENERGY_REGEN_MS more, anchor (now T0) is still in the past and we
    // should regen exactly 1 energy — proving NaN didn't poison the math.
    const after: GameState = { ...noop, energyUpdatedAt: new Date(T0).toISOString() };
    const out = applyRegen(after, T0 + ENERGY_REGEN_MS);
    expect(out.energy).toBe(101);
    expect(Number.isFinite(Date.parse(out.energyUpdatedAt))).toBe(true);
  });
});

describe("sanitizeEnergyDelta", () => {
  it("rejects NaN", () => {
    expect(sanitizeEnergyDelta(NaN)).toBe(0);
  });
  it("rejects Infinity", () => {
    expect(sanitizeEnergyDelta(Infinity)).toBe(0);
    expect(sanitizeEnergyDelta(-Infinity)).toBe(0);
  });
  it("rejects non-numeric strings", () => {
    expect(sanitizeEnergyDelta("abc")).toBe(0);
    expect(sanitizeEnergyDelta(null)).toBe(0);
    expect(sanitizeEnergyDelta(undefined)).toBe(0);
  });
  it("truncates fractional values", () => {
    expect(sanitizeEnergyDelta(5.9)).toBe(5);
    expect(sanitizeEnergyDelta(-2.7)).toBe(-2);
  });
  it("passes through valid integers (positive and negative)", () => {
    expect(sanitizeEnergyDelta(10)).toBe(10);
    expect(sanitizeEnergyDelta(-5)).toBe(-5);
    expect(sanitizeEnergyDelta(0)).toBe(0);
  });
});