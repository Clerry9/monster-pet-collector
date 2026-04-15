import { useState, useCallback, useEffect, useRef } from "react";
import { MONSTERS, getMonsterEvolution } from "@/data/monsters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLevelForXp, getLevelProgress, getAvailableBets } from "@/data/levels";

export interface DiceTier {
  id: string;
  label: string;
  maxRoll: number;
  costCoins: number;
  costReal: number;
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
  costReal: number;
  emoji: string;
}

export const DICE_PACKS: DicePack[] = [
  { id: "starter", label: "Starter Pack", rolls: 5, costCoins: 50, costReal: 0, emoji: "🎲" },
  { id: "value", label: "Value Pack", rolls: 15, costCoins: 120, costReal: 99, emoji: "🎯" },
  { id: "mega", label: "Mega Pack", rolls: 50, costCoins: 350, costReal: 299, emoji: "💎" },
  { id: "ultra", label: "Ultra Pack", rolls: 150, costCoins: 900, costReal: 699, emoji: "🔥" },
];

export type TileType = "coins" | "bonus" | "monster" | "chest" | "skull" | "star";

export interface BoardTile {
  id: number;
  type: TileType;
  value: number;
  x: number;
  y: number;
}

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
    const progress = i / length;
    const x = 10 + 80 * (0.5 + 0.4 * Math.sin(progress * Math.PI * 3));
    const y = 5 + 90 * progress;
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
  monsterTaps: Record<string, number>;
  level: number;
  xp: number;
  betMultiplier: number;
}

const DEFAULT_STATE: GameState = {
  coins: 50,
  rolls: 10,
  position: 0,
  unlockedMonsters: ["gobby"],
  activeMonster: "gobby",
  unlockedDiceTiers: ["basic"],
  activeDiceTier: "basic",
  totalSteps: 0,
  cardsCollected: 0,
  monsterTaps: {},
  level: 1,
  xp: 0,
  betMultiplier: 1,
};

const STORAGE_KEY = "monster-mash-state";

function loadLocalState(): GameState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      return {
        coins: p.coins ?? 50,
        rolls: p.rolls ?? 10,
        position: p.position ?? 0,
        unlockedMonsters: p.unlockedMonsters ?? ["gobby"],
        activeMonster: p.activeMonster ?? "gobby",
        unlockedDiceTiers: p.unlockedDiceTiers ?? ["basic"],
        activeDiceTier: p.activeDiceTier ?? "basic",
        totalSteps: p.totalSteps ?? 0,
        cardsCollected: p.cardsCollected ?? 0,
        monsterTaps: p.monsterTaps ?? {},
        level: p.level ?? 1,
        xp: p.xp ?? 0,
        betMultiplier: p.betMultiplier ?? 1,
      };
    }
  } catch {}
  return { ...DEFAULT_STATE };
}

function saveLocalState(state: GameState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Convert DB row to GameState
function dbToState(row: any): GameState {
  return {
    coins: row.coins,
    rolls: row.rolls,
    position: row.position,
    unlockedMonsters: row.unlocked_monsters,
    activeMonster: row.active_monster,
    unlockedDiceTiers: row.unlocked_dice_tiers,
    activeDiceTier: row.active_dice_tier,
    totalSteps: row.total_steps,
    cardsCollected: row.cards_collected,
    monsterTaps: row.monster_taps as Record<string, number>,
    level: row.level ?? 1,
    xp: row.xp ?? 0,
    betMultiplier: row.bet_multiplier ?? 1,
  };
}

function stateToDb(state: GameState, userId: string) {
  return {
    user_id: userId,
    coins: state.coins,
    rolls: state.rolls,
    position: state.position,
    unlocked_monsters: state.unlockedMonsters,
    active_monster: state.activeMonster,
    unlocked_dice_tiers: state.unlockedDiceTiers,
    active_dice_tier: state.activeDiceTier,
    total_steps: state.totalSteps,
    cards_collected: state.cardsCollected,
    monster_taps: state.monsterTaps,
    level: state.level,
    xp: state.xp,
    bet_multiplier: state.betMultiplier,
  };
}

export function useGameState() {
  const { user } = useAuth();
  const [state, setState] = useState<GameState>(loadLocalState);
  const [dbLoaded, setDbLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  // Load from DB when user logs in (only when user ID actually changes)
  useEffect(() => {
    const userId = user?.id ?? null;
    if (userId === lastUserIdRef.current) return;
    lastUserIdRef.current = userId;

    if (!userId) {
      setDbLoaded(false);
      return;
    }

    const loadFromDb = async () => {
      // Flush any pending save first
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        const currentState = loadLocalState();
        await supabase.from("game_state").upsert(stateToDb(currentState, userId));
      }

      const { data } = await supabase
        .from("game_state")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data) {
        const dbState = dbToState(data);
        setState(dbState);
        saveLocalState(dbState);
      } else {
        // First login — save current local state to DB
        const local = loadLocalState();
        await supabase.from("game_state").upsert(stateToDb(local, userId));
        setState(local);
      }
      setDbLoaded(true);
    };

    loadFromDb();
  }, [user]);

  // Debounced save to DB
  const saveToDb = useCallback(
    (newState: GameState) => {
      if (!user) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        await supabase
          .from("game_state")
          .upsert(stateToDb(newState, user.id));
      }, 1000);
    },
    [user]
  );

  const update = useCallback(
    (updater: (prev: GameState) => GameState) => {
      setState((prev) => {
        const next = updater(prev);
        saveLocalState(next);
        saveToDb(next);
        return next;
      });
    },
    [saveToDb]
  );

  const addCoins = useCallback(
    (amount: number) => update((s) => ({ ...s, coins: Math.max(0, s.coins + amount) })),
    [update]
  );

  const addRolls = useCallback(
    (amount: number) => update((s) => ({ ...s, rolls: s.rolls + amount })),
    [update]
  );

  const tapMonster = useCallback(() => {
    const monster = MONSTERS.find((m) => m.id === state.activeMonster);
    if (!monster) return;
    const currentTaps = state.monsterTaps[monster.id] ?? 0;
    const evo = getMonsterEvolution(monster, currentTaps + 1);
    update((s) => ({
      ...s,
      coins: s.coins + evo.coinsPerTap,
      monsterTaps: { ...s.monsterTaps, [monster.id]: (s.monsterTaps[monster.id] ?? 0) + 1 },
    }));
  }, [state.activeMonster, state.monsterTaps, update]);

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
      update((s) => ({ ...s, coins: s.coins - pack.costCoins, rolls: s.rolls + pack.rolls }));
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

  const activeMonsterData = MONSTERS.find((m) => m.id === state.activeMonster)!;
  const activeMonsterTaps = state.monsterTaps[state.activeMonster] ?? 0;
  const activeEvolution = getMonsterEvolution(activeMonsterData, activeMonsterTaps);

  return {
    ...state,
    addCoins,
    addRolls,
    tapMonster,
    rollDice,
    buyDicePack,
    unlockDiceTier,
    setActiveDiceTier,
    unlockMonster,
    setActiveMonster,
    activeMonsterData,
    activeMonsterTaps,
    activeEvolution,
    activeDiceTierData: DICE_TIERS.find((t) => t.id === state.activeDiceTier) ?? DICE_TIERS[0],
  };
}
