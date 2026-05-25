/**
 * Phase 2 — Shard-based monster summoning.
 *
 * Pricing & rarity costs live here. Pure functions only so they're easy to test.
 */
import { MONSTERS, type Monster } from "@/data/monsters";

export type SummonRarity = Monster["rarity"];

export const SUMMON_COST: Record<SummonRarity, number> = {
  common: 50,
  rare: 100,
  epic: 125,
  legendary: 150,
};

/** How many copies must be merged to push a monster to the next level. */
export const MERGE_COPIES_REQUIRED = 3;

/** Max level a monster can be merged to (matches evolutions length, 4 tiers → cap 4). */
export const MAX_MERGE_LEVEL = 4;

export function pickRandomMonster(rarity: SummonRarity): Monster | null {
  const pool = MONSTERS.filter((m) => m.rarity === rarity);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}