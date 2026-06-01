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

const STORAGE_KEY = "monsterStatUpgrades_v1";

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

export function useMonsterUpgrades() {
  const [store, setStore] = useState<Record<string, StatUpgrade>>(() => readStore());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setStore(readStore());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const get = useCallback((monsterId: string): StatUpgrade => {
    return store[monsterId] ?? { ...EMPTY };
  }, [store]);

  const apply = useCallback((monsterId: string, stat: StatKey) => {
    setStore((prev) => {
      const cur = prev[monsterId] ?? { ...EMPTY };
      const next = { ...prev, [monsterId]: { ...cur, [stat]: cur[stat] + 1 } };
      writeStore(next);
      return next;
    });
  }, []);

  return { get, apply };
}

export { EMPTY as EMPTY_UPGRADE };