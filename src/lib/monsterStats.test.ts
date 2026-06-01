import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  EXPORT_VERSION,
  migrateBackup,
  upgradeCost,
  useMonsterUpgrades,
} from "./monsterStats";

beforeEach(() => {
  localStorage.clear();
});

describe("upgradeCost", () => {
  it("scales with level", () => {
    const c0 = upgradeCost("hp", 0);
    const c1 = upgradeCost("hp", 1);
    const c5 = upgradeCost("hp", 5);
    expect(c0).toBeGreaterThan(0);
    expect(c1).toBeGreaterThan(c0);
    expect(c5).toBeGreaterThan(c1);
  });
});

describe("useMonsterUpgrades persistence + undo", () => {
  it("applies, persists across remount, and undoes with refund metadata", () => {
    const a = renderHook(() => useMonsterUpgrades());
    act(() => {
      a.result.current.apply("gobby", "atk", 60);
    });
    expect(a.result.current.get("gobby").atk).toBe(1);
    expect(a.result.current.history).toHaveLength(1);
    expect(a.result.current.history[0].cost).toBe(60);
    expect(a.result.current.history[0].level).toBe(1);

    // Remount: state must rehydrate from localStorage
    const b = renderHook(() => useMonsterUpgrades());
    expect(b.result.current.get("gobby").atk).toBe(1);
    expect(b.result.current.history).toHaveLength(1);

    let undone: ReturnType<typeof b.result.current.undoLast> = null;
    act(() => {
      undone = b.result.current.undoLast();
    });
    expect(undone?.cost).toBe(60);
    expect(b.result.current.get("gobby").atk).toBe(0);
    expect(b.result.current.history).toHaveLength(0);

    act(() => {
      undone = b.result.current.undoLast();
    });
    expect(undone).toBeNull();
  });
});

describe("backup migration", () => {
  it("round-trips current version", () => {
    const h = renderHook(() => useMonsterUpgrades());
    act(() => {
      h.result.current.apply("gobby", "hp", 40);
    });
    const raw = h.result.current.exportData();
    localStorage.clear();
    const h2 = renderHook(() => useMonsterUpgrades());
    let res!: { ok: true; migratedFrom?: number } | { ok: false; error: string };
    act(() => {
      res = h2.result.current.importData(raw);
    });
    expect(res).toEqual({ ok: true });
    expect(h2.result.current.get("gobby").hp).toBe(1);
    expect(h2.result.current.history).toHaveLength(1);
  });

  it("migrates a legacy v1 payload without history", () => {
    const legacy = JSON.stringify({
      upgrades: { gobby: { hp: 2, atk: 1, def: 0, spd: 0 } },
    });
    const h = renderHook(() => useMonsterUpgrades());
    let res!: { ok: true; migratedFrom?: number } | { ok: false; error: string };
    act(() => {
      res = h.result.current.importData(legacy);
    });
    expect(res).toMatchObject({ ok: true, migratedFrom: 1 });
    expect(h.result.current.get("gobby")).toMatchObject({ hp: 2, atk: 1, def: 0, spd: 0 });
    // history was synthesized so undo still works
    expect(h.result.current.history.length).toBe(3);
    expect(h.result.current.history.every((e) => e.legacy)).toBe(true);
  });

  it("rejects backups from a newer app version", () => {
    const h = renderHook(() => useMonsterUpgrades());
    const future = JSON.stringify({ version: 99, upgrades: {} });
    let res!: { ok: true } | { ok: false; error: string };
    act(() => {
      res = h.result.current.importData(future);
    });
    expect(res.ok).toBe(false);
    if (res.ok === false) expect(res.error).toMatch(/newer app version/i);
  });

  it("rejects malformed payloads", () => {
    const h = renderHook(() => useMonsterUpgrades());
    let bad!: { ok: true } | { ok: false; error: string };
    let noUp!: { ok: true } | { ok: false; error: string };
    act(() => {
      bad = h.result.current.importData("{not json");
      noUp = h.result.current.importData(JSON.stringify({ version: 2 }));
    });
    expect(bad.ok).toBe(false);
    expect(noUp.ok).toBe(false);
  });

  it("migrateBackup is pure and returns latest version", () => {
    const { data, fromVersion } = migrateBackup({
      upgrades: { gobby: { hp: 1, atk: 0, def: 0, spd: 0 } },
    });
    expect(fromVersion).toBe(1);
    expect(data.version).toBe(EXPORT_VERSION);
    expect(data.upgrades.gobby.hp).toBe(1);
  });
});