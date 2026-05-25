import { useCallback, useEffect, useState } from "react";
import type { BonusReward } from "@/lib/bonusRewards";
import { MERGE_COPIES_REQUIRED, MAX_MERGE_LEVEL, SUMMON_COST, pickRandomMonster, type SummonRarity } from "@/lib/summon";
import type { Monster } from "@/data/monsters";

/**
 * Client-side inventory for Phase 1 bonus rewards. Stored in localStorage so it
 * survives reloads. Phase 2 will migrate shards to `game_state.shards` on the
 * server; this hook will keep the same shape so call sites don't change.
 */

const KEY = "mpc-bonus-inv-v1";

export interface BuildDiscount {
  /** Percent off, e.g. 25 */
  percent: number;
  /** Epoch ms when it expires */
  expiresAt: number;
}

export interface MonsterBuff {
  /** Coin bonus % (e.g. 10) */
  coinPercent: number;
  /** Rolls remaining */
  rollsLeft: number;
}

/** Per-monster collection entry — current merge level + spare copies. */
export interface CollectionEntry {
  level: number;
  copies: number;
}

interface Inventory {
  shards: number;
  minigameTokens: number;
  buildDiscount: BuildDiscount | null;
  monsterBuff: MonsterBuff | null;
  collection: Record<string, CollectionEntry>;
}

const DEFAULTS: Inventory = {
  shards: 0,
  minigameTokens: 0,
  buildDiscount: null,
  monsterBuff: null,
  collection: {},
};

function load(): Inventory {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function save(inv: Inventory) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(inv));
  } catch {
    /* ignore */
  }
}

// Tiny pub/sub so multiple consumers stay in sync within the tab.
const subscribers = new Set<(inv: Inventory) => void>();
let CURRENT: Inventory | null = null;

function ensure(): Inventory {
  if (CURRENT === null) CURRENT = load();
  return CURRENT;
}

function update(patch: (prev: Inventory) => Inventory) {
  const next = patch(ensure());
  CURRENT = next;
  save(next);
  subscribers.forEach((cb) => cb(next));
}

export function useBonusInventory() {
  const [inv, setInv] = useState<Inventory>(() => ensure());

  useEffect(() => {
    const cb = (v: Inventory) => setInv(v);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  // Tick to expire discounts in real time.
  useEffect(() => {
    if (!inv.buildDiscount) return;
    const ms = inv.buildDiscount.expiresAt - Date.now();
    if (ms <= 0) {
      update((p) => ({ ...p, buildDiscount: null }));
      return;
    }
    const t = setTimeout(() => update((p) => ({ ...p, buildDiscount: null })), ms + 50);
    return () => clearTimeout(t);
  }, [inv.buildDiscount?.expiresAt]);

  const grant = useCallback((reward: BonusReward) => {
    switch (reward.kind) {
      case "shards":
      case "shards_mega":
        update((p) => ({ ...p, shards: p.shards + reward.amount }));
        break;
      case "minigame_token":
        update((p) => ({ ...p, minigameTokens: p.minigameTokens + reward.amount }));
        break;
      case "build_discount": {
        const minutes = reward.durationMinutes ?? 5;
        update((p) => ({
          ...p,
          buildDiscount: {
            percent: reward.amount,
            expiresAt: Date.now() + minutes * 60 * 1000,
          },
        }));
        break;
      }
      case "monster_buff":
        update((p) => ({
          ...p,
          monsterBuff: { coinPercent: 10, rollsLeft: reward.amount },
        }));
        break;
      // "energy" is granted directly via game.addEnergy at the call site.
      default:
        break;
    }
  }, []);

  const consumeBuffRoll = useCallback(() => {
    update((p) => {
      if (!p.monsterBuff) return p;
      const left = p.monsterBuff.rollsLeft - 1;
      return {
        ...p,
        monsterBuff: left <= 0 ? null : { ...p.monsterBuff, rollsLeft: left },
      };
    });
  }, []);

  /** Dismiss the active build-cost discount (e.g. user tapped the X). */
  const clearBuildDiscount = useCallback(() => {
    update((p) => ({ ...p, buildDiscount: null }));
  }, []);

  const consumeMinigameToken = useCallback((): boolean => {
    const cur = ensure();
    if (cur.minigameTokens <= 0) return false;
    update((p) => ({ ...p, minigameTokens: p.minigameTokens - 1 }));
    return true;
  }, []);

  const spendShards = useCallback((amount: number): boolean => {
    const cur = ensure();
    if (cur.shards < amount) return false;
    update((p) => ({ ...p, shards: p.shards - amount }));
    return true;
  }, []);

  /**
   * Spend shards to summon a random monster of the given rarity.
   * If the player already owns it, adds 1 copy (used for merging).
   * Otherwise adds it as a new Level 0 entry with 1 copy.
   * Returns the summoned monster, or null if insufficient shards.
   */
  const summon = useCallback((rarity: SummonRarity): Monster | null => {
    const cost = SUMMON_COST[rarity];
    const cur = ensure();
    if (cur.shards < cost) return null;
    const monster = pickRandomMonster(rarity);
    if (!monster) return null;
    update((p) => {
      const existing = p.collection[monster.id];
      const next: CollectionEntry = existing
        ? { ...existing, copies: existing.copies + 1 }
        : { level: 0, copies: 1 };
      return {
        ...p,
        shards: p.shards - cost,
        collection: { ...p.collection, [monster.id]: next },
      };
    });
    return monster;
  }, []);

  /**
   * Merge 3 spare copies of a monster into +1 level. Caps at MAX_MERGE_LEVEL.
   * Returns the new level on success, null otherwise.
   */
  const merge = useCallback((monsterId: string): number | null => {
    const cur = ensure();
    const entry = cur.collection[monsterId];
    if (!entry) return null;
    if (entry.copies < MERGE_COPIES_REQUIRED) return null;
    if (entry.level >= MAX_MERGE_LEVEL) return null;
    const nextLevel = entry.level + 1;
    update((p) => ({
      ...p,
      collection: {
        ...p.collection,
        [monsterId]: {
          level: nextLevel,
          copies: entry.copies - MERGE_COPIES_REQUIRED,
        },
      },
    }));
    return nextLevel;
  }, []);

  /** Ensure a previously-unlocked monster appears in the new collection at level 0. */
  const ensureCollectionEntry = useCallback((monsterId: string) => {
    const cur = ensure();
    if (cur.collection[monsterId]) return;
    update((p) => ({
      ...p,
      collection: { ...p.collection, [monsterId]: { level: 0, copies: 1 } },
    }));
  }, []);

  return {
    ...inv,
    grant,
    consumeBuffRoll,
    consumeMinigameToken,
    spendShards,
    summon,
    merge,
    ensureCollectionEntry,
    clearBuildDiscount,
  };
}