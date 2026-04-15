import { useState, useCallback } from "react";
import { MONSTERS } from "@/data/monsters";

interface GameState {
  coins: number;
  unlockedMonsters: string[];
  activeMonster: string;
}

const STORAGE_KEY = "monster-mash-state";

function loadState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    coins: 50,
    unlockedMonsters: ["gobby"],
    activeMonster: "gobby",
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

  const tap = useCallback(() => {
    const monster = MONSTERS.find((m) => m.id === state.activeMonster);
    if (!monster) return;
    update((s) => ({ ...s, coins: s.coins + monster.coinsPerTap }));
  }, [state.activeMonster, update]);

  const addCoins = useCallback(
    (amount: number) => {
      update((s) => ({ ...s, coins: s.coins + amount }));
    },
    [update]
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
    tap,
    addCoins,
    unlockMonster,
    setActiveMonster,
    activeMonsterData: MONSTERS.find((m) => m.id === state.activeMonster)!,
  };
}
