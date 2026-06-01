import { useCallback, useEffect, useState } from "react";
import { Monster, getMonsterEvolution } from "@/data/monsters";

export type StatKey = "hp" | "atk" | "def" | "spd";

export interface StatUpgrade {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface MonsterStats extends StatUpgrade {}

export interface UpgradeHistoryEntry {
  id: string;
  monsterId: string;
  stat: StatKey;
  /** Level reached after this purchase (1-indexed). */
  level: number;
  cost: number;
  /** Epoch ms. */
  at: number;
  /** True when the entry was synthesized during a backup migration. */
  legacy?: boolean;
}

const STORAGE_KEY = "monsterStatUpgrades_v1";
const HISTORY_KEY = "monsterStatUpgradesHistory_v1";
export const EXPORT_VERSION = 2;

const RARITY_BASE: Record<Monster["rarity"], MonsterStats> = {
  common:    { hp: 100, atk: 15, def: 10, spd: 10 },
  rare:      { hp: 120, atk: 18, def: 12, spd: 12 },
  epic:      { hp: 140, atk: 22, def: 15, spd: 14 },
  legendary: { hp: 160, atk: 26, def: 18, spd: 16 },
};

export const STAT_META: Record<StatKey, { label: string; emoji: string; perLevel: number; baseCost: number }> = {
  hp:  { label: "HP",  emoji: "❤️", perLevel: 5, baseCost: 40 },
  atk: { label: "ATK", emoji: "⚔️", perLevel: 1, baseCost: 60 },
  def: { label: "DEF", emoji: "🛡️", perLevel: 1, baseCost: 60 },
  spd: { label: "SPD", emoji: "💨", perLevel: 1, baseCost: 70 },
};

const EMPTY: StatUpgrade = { hp: 0, atk: 0, def: 0, spd: 0 };

export function upgradeCost(stat: StatKey, currentLevel: number): number {
  const meta = STAT_META[stat];
  return Math.round(meta.baseCost * Math.pow(1.35, currentLevel));
}

/** Computed final stats: rarity base + 10% per evolution level + upgrade bonuses. */
export function getMonsterStats(
  monster: Monster,
  monsterXp: number,
  upgrades: StatUpgrade = EMPTY,
): MonsterStats {
  const base = RARITY_BASE[monster.rarity];
  const evo = getMonsterEvolution(monster, monsterXp);
  const mult = 1 + (evo.level - 1) * 0.1;
  return {
    hp:  Math.round(base.hp  * mult) + upgrades.hp  * STAT_META.hp.perLevel,
    atk: Math.round(base.atk * mult) + upgrades.atk * STAT_META.atk.perLevel,
    def: Math.round(base.def * mult) + upgrades.def * STAT_META.def.perLevel,
    spd: Math.round(base.spd * mult) + upgrades.spd * STAT_META.spd.perLevel,
  };
}

function readStore(): Record<string, StatUpgrade> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StatUpgrade>;
  } catch { return {}; }
}

function writeStore(data: Record<string, StatUpgrade>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function readHistory(): UpgradeHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UpgradeHistoryEntry[]) : [];
  } catch { return []; }
}

function writeHistory(data: UpgradeHistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Backup versioning + migrations
// ---------------------------------------------------------------------------

const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spd"];

export interface BackupV2 {
  version: 2;
  exportedAt: string;
  upgrades: Record<string, StatUpgrade>;
  history: UpgradeHistoryEntry[];
}

export type AnyBackup = { version?: number; [k: string]: unknown };

function sanitizeUpgrade(raw: unknown): StatUpgrade {
  const out: StatUpgrade = { ...EMPTY };
  if (raw && typeof raw === "object") {
    for (const k of STAT_KEYS) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        out[k] = Math.floor(v);
      }
    }
  }
  return out;
}

function sanitizeUpgrades(raw: unknown): Record<string, StatUpgrade> {
  const out: Record<string, StatUpgrade> = {};
  if (raw && typeof raw === "object") {
    for (const [id, val] of Object.entries(raw as Record<string, unknown>)) {
      out[id] = sanitizeUpgrade(val);
    }
  }
  return out;
}

/** Sequential migrations keyed by source version. */
const migrations: Record<number, (b: AnyBackup) => AnyBackup> = {
  1: (b) => {
    const upgrades = sanitizeUpgrades(b.upgrades);
    const rawHistory = Array.isArray(b.history) ? (b.history as UpgradeHistoryEntry[]) : [];
    const history: UpgradeHistoryEntry[] = rawHistory.length
      ? rawHistory
      : Object.entries(upgrades).flatMap(([monsterId, upg]) =>
          STAT_KEYS.flatMap((stat) =>
            Array.from({ length: upg[stat] }, (_, i) => ({
              id: `legacy-${monsterId}-${stat}-${i + 1}`,
              monsterId, stat, level: i + 1, cost: 0, at: 0, legacy: true,
            })),
          ),
        );
    return {
      version: 2,
      exportedAt: typeof b.exportedAt === "string" ? b.exportedAt : new Date().toISOString(),
      upgrades,
      history,
    };
  },
};

export function migrateBackup(parsed: AnyBackup): { data: BackupV2; fromVersion: number } {
  const fromVersion = typeof parsed.version === "number" ? parsed.version : 1;
  if (fromVersion > EXPORT_VERSION) {
    throw new Error(`Backup created by a newer app version (v${fromVersion}).`);
  }
  let cur: AnyBackup = { ...parsed, version: fromVersion };
  let v = fromVersion;
  while (v < EXPORT_VERSION) {
    const step = migrations[v];
    if (!step) throw new Error(`Missing migration from v${v}`);
    cur = step(cur);
    v = typeof cur.version === "number" ? cur.version : v + 1;
  }
  if (cur.version !== EXPORT_VERSION || !cur.upgrades || !Array.isArray(cur.history)) {
    throw new Error("Migration produced an invalid backup");
  }
  return { data: cur as unknown as BackupV2, fromVersion };
}

export function useMonsterUpgrades() {
  const [store, setStore] = useState<Record<string, StatUpgrade>>(() => readStore());
  const [history, setHistory] = useState<UpgradeHistoryEntry[]>(() => readHistory());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setStore(readStore());
      if (e.key === HISTORY_KEY) setHistory(readHistory());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const get = useCallback((monsterId: string): StatUpgrade => {
    return store[monsterId] ?? { ...EMPTY };
  }, [store]);

  const apply = useCallback((monsterId: string, stat: StatKey, cost: number) => {
    let newLevel = 0;
    setStore((prev) => {
      const cur = prev[monsterId] ?? { ...EMPTY };
      newLevel = cur[stat] + 1;
      const next = { ...prev, [monsterId]: { ...cur, [stat]: newLevel } };
      writeStore(next);
      return next;
    });
    setHistory((prev) => {
      const entry: UpgradeHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        monsterId, stat, level: newLevel, cost, at: Date.now(),
      };
      const next = [...prev, entry];
      writeHistory(next);
      return next;
    });
  }, []);

  /**
   * Revert the most recent upgrade across all monsters. Returns the entry
   * that was undone (so the caller can refund coins) or null if none exists.
   */
  const undoLast = useCallback((): UpgradeHistoryEntry | null => {
    const current = readHistory();
    if (current.length === 0) return null;
    const last = current[current.length - 1];
    const remaining = current.slice(0, -1);
    writeHistory(remaining);
    setHistory(remaining);
    setStore((prev) => {
      const cur = prev[last.monsterId] ?? { ...EMPTY };
      const nextVal = Math.max(0, cur[last.stat] - 1);
      const next = { ...prev, [last.monsterId]: { ...cur, [last.stat]: nextVal } };
      writeStore(next);
      return next;
    });
    return last;
  }, []);

  const historyFor = useCallback(
    (monsterId: string) => history.filter((h) => h.monsterId === monsterId).slice().reverse(),
    [history],
  );

  const exportData = useCallback((): string => {
    return JSON.stringify({
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      upgrades: readStore(),
      history: readHistory(),
    }, null, 2);
  }, []);

  const importData = useCallback((raw: string): { ok: true } | { ok: false; error: string } => {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.upgrades) {
        return { ok: false, error: "Invalid backup file" };
      }
      const upgrades = parsed.upgrades as Record<string, StatUpgrade>;
      const hist: UpgradeHistoryEntry[] = Array.isArray(parsed.history) ? parsed.history : [];
      writeStore(upgrades);
      writeHistory(hist);
      setStore(upgrades);
      setHistory(hist);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Parse error" };
    }
  }, []);

  return { get, apply, history, historyFor, undoLast, exportData, importData };
}

export { EMPTY as EMPTY_UPGRADE };