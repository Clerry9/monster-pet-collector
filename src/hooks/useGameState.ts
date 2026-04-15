import { useState, useCallback } from "react";
import { MONSTERS } from "@/data/monsters";

export interface DiceTier {
  id: string;
  label: string;
  maxRoll: number;
  costCoins: number;
  costReal: number; // USD cents
}

export const DICE_TIERS: DiceTier[] = [
  { id: "basic", label: "Basic Dice", maxRoll: 50, costCoins: 0, costReal: 0 },
  { id: "silver", label: "Silver Dice", maxRoll: 100, costCoins: 500, costReal: 199 },
  { id: "gold", label: "Gold Dice", maxRoll: 200, costCoins: 2000, costReal: 499 },
];

export interface DicePack {
  id: string;
  label: string;
  rolls: number;
  costCoins: number;
  costReal: number; // USD cents
  emoji: string;
}

export const DICE_PACKS: DicePack[] = [
  { id: "starter", label: "Starter Pack", rolls: 5, costCoins: 50, costReal: 0, emoji: "🎲" },
  { id: "value", label: "Value Pack", rolls: 15, costCoins: 120, costReal: 99, emoji: "🎯" },
  { id: "mega", label: "Mega Pack", rolls: 50, costCoins: 350, costReal: 299, emoji: "💎" },
  { id: "ultra", label: "Ultra Pack", rolls: 150, costCoins: 900, costReal: 699, emoji: "🔥" },
];

// Board tile types
export type TileType = "coins" | "bonus" | "monster" | "chest" | "skull" | "star";

export interface BoardTile {
  id: number;
  type: TileType;
  value: number; // coins reward or multiplier
  x: number; // percentage position
  y: number;
}

// Generate a winding path of tiles
function generateBoard(length: number): BoardTile[] {
  const tiles: BoardTile[] = [];
  const tileTypes: { type: TileType; weight: number; minVal: number; maxVal: number }[] = [
    { type: "coins", weight: 40, minVal: 5, maxVal: 30 },
    { type: "bonus", weight: 15, minVal: 2, maxVal: 5 },
    { type: "chest", weight: 10, minVal: 20, maxVal: 100 },
    { type: "monster", weight: 15, minVal: 10, maxVal: 50 },
    { type: "skull", weight: 10, minVal: -10, maxVal: -5 },
    { type: "star", weight: 10, minVal: 50, maxVal: 200 },
  ];

  const totalWeight = tileTypes.reduce((s, t) => s + t.weight, 0);

  for (let i = 0; i < length; i++) {
    // Create a winding path using sine waves
    const progress = i / length;
    const x = 10 + 80 * (0.5 + 0.4 * Math.sin(progress * Math.PI * 3));
    const y = 5 + 90 * progress;

    // Pick random tile type
    let r = Math.random() * totalWeight;
    let tileType = tileTypes[0];
    for (const t of tileTypes) {
      r -= t.weight;
      if (r <= 0) { tileType = t; break; }
    }

    const value = Math.floor(tileType.minVal + Math.random() * (tileType.maxVal - tileType.minVal));

    tiles.push({ id: i, type: tileType.type, value, x, y });
  }

  return tiles;
}

export const BOARD_TILES = generateBoard(30);

export interface GameState {
  coins: number;
  rolls: number;
  position: number;
  unlockedMonsters: string[];
  activeMonster: string;
  unlockedDiceTiers: string[];
  activeDiceTier: string;
  totalSteps: number;
  cardsCollected: number;
}

const STORAGE_KEY = "monster-mash-state";

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: add new fields
      return {
        coins: parsed.coins ?? 50,
        rolls: parsed.rolls ?? 10,
        position: parsed.position ?? 0,
        unlockedMonsters: parsed.unlockedMonsters ?? ["gobby"],
        activeMonster: parsed.activeMonster ?? "gobby",
        unlockedDiceTiers: parsed.unlockedDiceTiers ?? ["basic"],
        activeDiceTier: parsed.activeDiceTier ?? "basic",
        totalSteps: parsed.totalSteps ?? 0,
        cardsCollected: parsed.cardsCollected ?? 0,
      };
    }
  } catch {}
  return {
    coins: 50,
    rolls: 10,
    position: 0,
    unlockedMonsters: ["gobby"],
    activeMonster: "gobby",
    unlockedDiceTiers: ["basic"],
    activeDiceTier: "basic",
    totalSteps: 0,
    cardsCollected: 0,
  };
}

function saveState(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useGameState() {
  const [state, setState] = useState<GameState>(loadState);

  const update = useCallback((updater: (prev: GameState) => GameState) => {
    setState((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  const addCoins = useCallback(
    (amount: number) => {
      update((s) => ({ ...s, coins: Math.max(0, s.coins + amount) }));
    },
    [update]
  );

  const rollDice = useCallback((): { steps: number; tile: BoardTile } | null => {
    if (state.rolls <= 0) return null;
    const tier = DICE_TIERS.find((t) => t.id === state.activeDiceTier) ?? DICE_TIERS[0];
    const steps = Math.floor(Math.random() * tier.maxRoll) + 1;
    const newPosition = (state.position + steps) % BOARD_TILES.length;
    const tile = BOARD_TILES[newPosition];

    update((s) => ({
      ...s,
      rolls: s.rolls - 1,
      position: newPosition,
      totalSteps: s.totalSteps + steps,
      coins: Math.max(0, s.coins + tile.value),
      cardsCollected: tile.type === "chest" || tile.type === "star" ? s.cardsCollected + 1 : s.cardsCollected,
    }));

    return { steps, tile };
  }, [state.rolls, state.position, state.activeDiceTier, update]);

  const buyDicePack = useCallback(
    (packId: string) => {
      const pack = DICE_PACKS.find((p) => p.id === packId);
      if (!pack || state.coins < pack.costCoins) return false;
      update((s) => ({
        ...s,
        coins: s.coins - pack.costCoins,
        rolls: s.rolls + pack.rolls,
      }));
      return true;
    },
    [state.coins, update]
  );

  const unlockDiceTier = useCallback(
    (tierId: string) => {
      const tier = DICE_TIERS.find((t) => t.id === tierId);
      if (!tier || state.unlockedDiceTiers.includes(tierId) || state.coins < tier.costCoins) return false;
      update((s) => ({
        ...s,
        coins: s.coins - tier.costCoins,
        unlockedDiceTiers: [...s.unlockedDiceTiers, tierId],
        activeDiceTier: tierId,
      }));
      return true;
    },
    [state.unlockedDiceTiers, state.coins, update]
  );

  const setActiveDiceTier = useCallback(
    (tierId: string) => {
      if (!state.unlockedDiceTiers.includes(tierId)) return;
      update((s) => ({ ...s, activeDiceTier: tierId }));
    },
    [state.unlockedDiceTiers, update]
  );

  const unlockMonster = useCallback(
    (id: string) => {
      const monster = MONSTERS.find((m) => m.id === id);
      if (!monster || state.unlockedMonsters.includes(id) || state.coins < monster.cost) return false;
      update((s) => ({
        ...s,
        coins: s.coins - monster.cost,
        unlockedMonsters: [...s.unlockedMonsters, id],
        activeMonster: id,
      }));
      return true;
    },
    [state, update]
  );

  const setActiveMonster = useCallback(
    (id: string) => {
      if (!state.unlockedMonsters.includes(id)) return;
      update((s) => ({ ...s, activeMonster: id }));
    },
    [state.unlockedMonsters, update]
  );

  return {
    ...state,
    addCoins,
    rollDice,
    buyDicePack,
    unlockDiceTier,
    setActiveDiceTier,
    unlockMonster,
    setActiveMonster,
    activeMonsterData: MONSTERS.find((m) => m.id === state.activeMonster)!,
    activeDiceTierData: DICE_TIERS.find((t) => t.id === state.activeDiceTier) ?? DICE_TIERS[0],
  };
}
