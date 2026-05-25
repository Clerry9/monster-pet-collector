import { useCallback, useEffect, useState } from "react";
import type { BonusReward } from "@/lib/bonusRewards";

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

interface Inventory {
  shards: number;
  minigameTokens: number;
  buildDiscount: BuildDiscount | null;
  monsterBuff: MonsterBuff | null;
}

const DEFAULTS: Inventory = {
  shards: 0,
  minigameTokens: 0,
  buildDiscount: null,
  monsterBuff: null,
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

  return { ...inv, grant, consumeBuffRoll, consumeMinigameToken, spendShards };
}