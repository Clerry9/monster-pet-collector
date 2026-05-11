import { useState, useCallback, useEffect, useRef } from "react";
import { MONSTERS, getMonsterEvolution } from "@/data/monsters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLevelForXp, getLevelProgress, getAvailableBets } from "@/data/levels";
import { drawRandomCard, GameCard, CARD_SETS, TRADE_VALUES } from "@/data/cards";

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

export type TileType = "coins" | "bonus" | "food" | "chest" | "skull" | "star";

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
    { type: "food", weight: 15, minVal: 10, maxVal: 50 },
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
  collectedCards: string[];
  monsterTaps: Record<string, number>;
  level: number;
  xp: number;
  betMultiplier: number;
  islandStars: number;
  pendingCardFlips: number;
  lastSpinAt: string | null;
  energy: number;
  energyUpdatedAt: string; // ISO timestamp of last regen tick
}

// Each "island" = ~5 tiles. Stars convert at this ratio.
export const STARS_PER_FLIP = 5;
/** Number of duplicate monster-card "pieces" required to unlock the monster. */
export const MONSTER_PIECES_REQUIRED = 5;
export const TILES_PER_ISLAND = 5;
export const SPIN_COOLDOWN_MS = 12 * 60 * 60 * 1000;

// --- Energy system ---
// Auto-regen 1 ⚡ every ENERGY_REGEN_MS up to a level-scaled cap.
// Cap = floor(150 * (1 + 0.10 * (level - 1))).  L1=150, L2=165, L10=285.
// Energy may exceed the cap if granted directly (packs, ads, daily reward),
// in which case regen pauses until the player spends back down.
export const ENERGY_BASE_CAP = 150;
export const ENERGY_REGEN_MS = 3 * 60 * 1000;
export const ENERGY_PER_LEVEL_PCT = 0.10;

export function energyCapForLevel(level: number): number {
  return Math.floor(ENERGY_BASE_CAP * (1 + ENERGY_PER_LEVEL_PCT * Math.max(0, level - 1)));
}

/** Pure: advance regen ticks since `state.energyUpdatedAt`.
 *  Caps at level cap, but leaves overflow energy alone (no auto-tick when at/over cap).
 *  When energy >= cap, the regen anchor is held at `nowMs` so that the very moment
 *  energy drops below cap (e.g. after a roll), regen resumes from a fresh full interval. */
export function applyRegen(state: GameState, nowMs: number): GameState {
  const cap = energyCapForLevel(state.level);
  const parsed = Date.parse(state.energyUpdatedAt);
  const last = Number.isFinite(parsed) ? parsed : nowMs;

  if (state.energy >= cap) {
    // At or over cap — pin the anchor to "now" so the next tick is a full interval away.
    if (last === nowMs) return state;
    return { ...state, energyUpdatedAt: new Date(nowMs).toISOString() };
  }

  const elapsed = Math.max(0, nowMs - last);
  const ticks = Math.floor(elapsed / ENERGY_REGEN_MS);
  if (ticks <= 0) return state;
  const next = Math.min(cap, state.energy + ticks);
  const gained = next - state.energy;
  // Advance anchor by exactly the time consumed by the granted ticks.
  const newAnchor = last + gained * ENERGY_REGEN_MS;
  return { ...state, energy: next, energyUpdatedAt: new Date(newAnchor).toISOString() };
}

/** Sanitize an energy delta — reject NaN, Infinity, non-numbers.
 *  Returns a safe integer delta (rounded toward zero). */
export function sanitizeEnergyDelta(amount: unknown): number {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
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
        collectedCards: p.collectedCards ?? [],
        monsterTaps: p.monsterTaps ?? {},
        level: p.level ?? 1,
        xp: p.xp ?? 0,
        betMultiplier: p.betMultiplier ?? 1,
        islandStars: p.islandStars ?? 0,
        pendingCardFlips: p.pendingCardFlips ?? 0,
        lastSpinAt: p.lastSpinAt ?? null,
        energy: p.energy ?? ENERGY_BASE_CAP,
        energyUpdatedAt: p.energyUpdatedAt ?? new Date().toISOString(),
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
    collectedCards: row.collected_cards ?? [],
    monsterTaps: row.monster_taps as Record<string, number>,
    level: row.level ?? 1,
    xp: row.xp ?? 0,
    betMultiplier: row.bet_multiplier ?? 1,
    islandStars: row.island_stars ?? 0,
    pendingCardFlips: row.pending_card_flips ?? 0,
    lastSpinAt: row.last_spin_at ?? null,
    energy: row.energy ?? ENERGY_BASE_CAP,
    energyUpdatedAt: row.energy_updated_at ?? new Date().toISOString(),
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
    collected_cards: state.collectedCards,
    monster_taps: state.monsterTaps,
    level: state.level,
    xp: state.xp,
    bet_multiplier: state.betMultiplier,
    island_stars: state.islandStars,
    pending_card_flips: state.pendingCardFlips,
    last_spin_at: state.lastSpinAt,
    energy: state.energy,
    energy_updated_at: state.energyUpdatedAt,
  };
}

export function useGameState() {
  const { user } = useAuth();
  const [state, setState] = useState<GameState>(() => applyRegen(loadLocalState(), Date.now()));
  const [dbLoaded, setDbLoaded] = useState(false);
  // Track in-flight server-side purchases so the UI can disable paid buttons
  // until the RPC confirms (or fails). Each entry is the pack/tier id.
  const [pendingPurchases, setPendingPurchases] = useState<Set<string>>(new Set());
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
        await supabase.from("game_state").upsert(stateToDb(currentState, userId), { onConflict: "user_id" });
      }

      const { data } = await supabase
        .from("game_state")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (data) {
        // Server is source of truth for energy_updated_at — apply regen using
        // the DB anchor so offline regen counts but we never overwrite a newer
        // (higher) DB energy value with a stale local one.
        const dbState = applyRegen(dbToState(data), Date.now());
        setState(dbState);
        saveLocalState(dbState);
      } else {
        // First login — save current local state to DB
        const local = loadLocalState();
        await supabase.from("game_state").upsert(stateToDb(local, userId), { onConflict: "user_id" });
        setState(local);
      }
      setDbLoaded(true);
    };

    loadFromDb();
  }, [user]);

  // Realtime: when the server (e.g. payments webhook) credits coins/rolls/etc.
  // to the player's row, refresh local state so the UI updates without refresh.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const channel = supabase
      .channel(`game_state:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_state', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Parameters<typeof dbToState>[0];
          if (!row) return;
          setState((prev) => {
            const remote = applyRegen(dbToState(row), Date.now());
            // Only accept growth in economic resources to avoid clobbering an
            // optimistic local debit that hasn't been saved yet.
            const merged: GameState = {
              ...prev,
              coins: Math.max(prev.coins, remote.coins),
              rolls: Math.max(prev.rolls, remote.rolls),
              islandStars: Math.max(prev.islandStars, remote.islandStars),
              pendingCardFlips: Math.max(prev.pendingCardFlips, remote.pendingCardFlips),
              unlockedDiceTiers: Array.from(new Set([...prev.unlockedDiceTiers, ...remote.unlockedDiceTiers])),
              unlockedMonsters: Array.from(new Set([...prev.unlockedMonsters, ...remote.unlockedMonsters])),
              activeDiceTier: remote.activeDiceTier || prev.activeDiceTier,
            };
            saveLocalState(merged);
            return merged;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Debounced save to DB
  const saveToDb = useCallback(
    (newState: GameState) => {
      if (!user) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        await supabase
          .from("game_state")
          .upsert(stateToDb(newState, user.id), { onConflict: "user_id" });
        // Mirror level onto profiles so leaderboards can display prestige ribbons.
        await supabase
          .from("profiles")
          .update({ level: newState.level })
          .eq("user_id", user.id);
      }, 1000);
    },
    [user]
  );

  const update = useCallback(
    (updater: (prev: GameState) => GameState) => {
      setState((prev) => {
        const next = applyRegen(updater(prev), Date.now());
        saveLocalState(next);
        saveToDb(next);
        return next;
      });
    },
    [saveToDb]
  );

  // Tick once a minute to keep the energy counter and timer fresh in the UI.
  useEffect(() => {
    const id = window.setInterval(() => {
      setState((prev) => {
        const next = applyRegen(prev, Date.now());
        if (next === prev) return prev;
        saveLocalState(next);
        saveToDb(next);
        return next;
      });
    }, 60_000);
    return () => window.clearInterval(id);
  }, [saveToDb]);

  const addCoins = useCallback(
    (amount: number) => update((s) => ({ ...s, coins: Math.max(0, s.coins + amount) })),
    [update]
  );

  const addRolls = useCallback(
    (amount: number) => update((s) => ({ ...s, rolls: Math.max(0, s.rolls + amount) })),
    [update]
  );

  // Energy: can be added (overflow allowed) or subtracted (clamped to 0).
  const addEnergy = useCallback(
    (amount: number) => {
      const delta = sanitizeEnergyDelta(amount);
      if (delta === 0) return;
      update((s) => {
        const cap = energyCapForLevel(s.level);
        const next = s.energy + delta;
        // Clamp lower bound to 0. Upper bound: positive grants may push above cap
        // (overflow), but we never let regen-style additions exceed cap implicitly —
        // overflow only comes from explicit positive grants here, which is the
        // intended behavior. Negative deltas just clamp at 0.
        return { ...s, energy: Math.max(0, next) };
      });
    },
    [update]
  );

  const grantCard = useCallback(
    (cardId: string) => update((s) => ({
      ...s,
      collectedCards: [...s.collectedCards, cardId],
      cardsCollected: s.cardsCollected + (s.collectedCards.includes(cardId) ? 0 : 1),
    })),
    [update]
  );

  const grantMonster = useCallback(
    (id: string) => update((s) => (
      s.unlockedMonsters.includes(id)
        ? s
        : { ...s, unlockedMonsters: [...s.unlockedMonsters, id] }
    )),
    [update]
  );

  const grantDiceTier = useCallback(
    (tierId: string) => update((s) => (
      s.unlockedDiceTiers.includes(tierId)
        ? s
        : { ...s, unlockedDiceTiers: [...s.unlockedDiceTiers, tierId] }
    )),
    [update]
  );

  // Monster XP is now gained from "food" tiles during rollDice, no more tapping

  const rollDice = useCallback((): { steps: number; tile: BoardTile; card?: GameCard; monsterLevelUp?: { name: string; level: number; coinBonus: number }; islandStarEarned?: boolean } | null => {
    // Each roll costs `betMultiplier` energy (×1 = 1, ×2 = 2, ×3 = 3 …).
    const energyCost = Math.max(1, state.betMultiplier);
    if (state.energy < energyCost) return null;
    const tier = DICE_TIERS.find((t) => t.id === state.activeDiceTier) ?? DICE_TIERS[0];
    const steps = Math.floor(Math.random() * tier.maxRoll) + 1;
    const newPosition = (state.position + steps) % BOARD_TILES.length;
    const tile = BOARD_TILES[newPosition];

    const activeMonster = MONSTERS.find((m) => m.id === state.activeMonster);
    const monsterXp = state.monsterTaps[state.activeMonster] ?? 0;
    const monsterEvo = activeMonster ? getMonsterEvolution(activeMonster, monsterXp) : null;
    const monsterBonus = monsterEvo ? 1 + monsterEvo.coinBonus / 100 : 1;

    const currentLevel = getLevelForXp(state.xp);
    const modifiedValue = currentLevel.tileModifier(tile.type, tile.value);
    const finalValue = Math.round(modifiedValue * state.betMultiplier * monsterBonus);
    const xpGain = Math.max(1, Math.round(steps * state.betMultiplier));
    const modifiedTile = { ...tile, value: finalValue };

    const monsterXpGain = tile.type === "food" ? tile.value : 0;

    let monsterLevelUp: { name: string; level: number; coinBonus: number } | undefined;
    if (monsterXpGain > 0 && activeMonster) {
      const oldEvo = getMonsterEvolution(activeMonster, monsterXp);
      const newEvo = getMonsterEvolution(activeMonster, monsterXp + monsterXpGain);
      if (newEvo.level > oldEvo.level) {
        monsterLevelUp = { name: newEvo.name, level: newEvo.level, coinBonus: newEvo.coinBonus };
      }
    }

    const drawnCard = (tile.type === "chest" || tile.type === "star") ? drawRandomCard() : undefined;

    // Island star detection: crossed into a new island? + 30% chance, always on star tile
    const oldIsland = Math.floor(state.position / TILES_PER_ISLAND);
    const newIsland = Math.floor(newPosition / TILES_PER_ISLAND);
    const crossedIsland = newIsland !== oldIsland;
    const islandStarEarned = tile.type === "star" || (crossedIsland && Math.random() < 0.3);

    update((s) => {
      const newXp = s.xp + xpGain;
      const newLevel = getLevelForXp(newXp);
      let newCollectedCards = s.collectedCards;
      let newUnlockedMonsters = s.unlockedMonsters;
      let bonusCoins = 0;

      if (drawnCard) {
        newCollectedCards = [...s.collectedCards, drawnCard.id];
        const isNew = !s.collectedCards.includes(drawnCard.id);

        if (isNew) {
          if (drawnCard.reward.type === "coins" && drawnCard.reward.amount) {
            bonusCoins += drawnCard.reward.amount;
          }
        }
        // Monster cards must be collected MONSTER_PIECES_REQUIRED times
        // (duplicates allowed) before the playable monster is unlocked.
        if (drawnCard.reward.type === "monster" && drawnCard.reward.monsterId) {
          const monsterId = drawnCard.reward.monsterId;
          if (!s.unlockedMonsters.includes(monsterId)) {
            const pieces = newCollectedCards.filter((id) => id === drawnCard.id).length;
            if (pieces >= MONSTER_PIECES_REQUIRED) {
              newUnlockedMonsters = [...s.unlockedMonsters, monsterId];
            }
          }
        }

        if (isNew) {
          for (const set of CARD_SETS) {
            const allSetCards = set.cards.map((c) => c.id);
            const hadAllBefore = allSetCards.every((id) => s.collectedCards.includes(id));
            const hasAllNow = allSetCards.every((id) => newCollectedCards.includes(id));
            if (!hadAllBefore && hasAllNow) {
              if (set.setBonus.type === "coins" && set.setBonus.amount) {
                bonusCoins += set.setBonus.amount;
              } else if (set.setBonus.type === "monster" && set.setBonus.monsterId) {
                if (!newUnlockedMonsters.includes(set.setBonus.monsterId)) {
                  newUnlockedMonsters = [...newUnlockedMonsters, set.setBonus.monsterId];
                }
              }
            }
          }
        }
      }

      // Global -20% coin payout adjustment to make packs feel more valuable.
      // Weekend events apply a 2× multiplier on top of all coin payouts.
      const COIN_PAYOUT_MULTIPLIER = 0.48;
      // Lazy-import to keep this hook tree-shake-friendly and pure.
      const weekendMul = (() => {
        const day = new Date().getDay();
        return day === 0 || day === 6 ? 2 : 1;
      })();
      const coinGain = tile.type === "food"
        ? 0
        : Math.round(finalValue * COIN_PAYOUT_MULTIPLIER * weekendMul);
      bonusCoins = Math.round(bonusCoins * COIN_PAYOUT_MULTIPLIER * weekendMul);
      const newMonsterTaps = monsterXpGain > 0
        ? { ...s.monsterTaps, [s.activeMonster]: (s.monsterTaps[s.activeMonster] ?? 0) + monsterXpGain }
        : s.monsterTaps;

      let newIslandStars = s.islandStars + (islandStarEarned ? 1 : 0);
      let newPendingFlips = s.pendingCardFlips;
      while (newIslandStars >= STARS_PER_FLIP) {
        newIslandStars -= STARS_PER_FLIP;
        newPendingFlips += 1;
      }

      return {
        ...s,
        rolls: s.rolls,
        energy: Math.max(0, s.energy - energyCost),
        position: newPosition,
        totalSteps: s.totalSteps + steps,
        coins: Math.max(0, s.coins + coinGain + bonusCoins),
        cardsCollected: drawnCard && !s.collectedCards.includes(drawnCard.id) ? s.cardsCollected + 1 : s.cardsCollected,
        collectedCards: newCollectedCards,
        unlockedMonsters: newUnlockedMonsters,
        monsterTaps: newMonsterTaps,
        xp: newXp,
        level: newLevel.id,
        islandStars: newIslandStars,
        pendingCardFlips: newPendingFlips,
      };
    });
    return { steps, tile: modifiedTile, card: drawnCard, monsterLevelUp, islandStarEarned };
  }, [state.rolls, state.position, state.activeDiceTier, state.betMultiplier, state.xp, state.activeMonster, state.monsterTaps, update]);

  const addStars = useCallback(
    (amount: number) => update((s) => {
      let stars = s.islandStars + amount;
      let flips = s.pendingCardFlips;
      while (stars >= STARS_PER_FLIP) { stars -= STARS_PER_FLIP; flips += 1; }
      return { ...s, islandStars: stars, pendingCardFlips: flips };
    }),
    [update]
  );

  const consumeCardFlip = useCallback(
    (): boolean => {
      if (state.pendingCardFlips <= 0) return false;
      update((s) => ({ ...s, pendingCardFlips: Math.max(0, s.pendingCardFlips - 1) }));
      return true;
    },
    [state.pendingCardFlips, update]
  );

  const recordSpin = useCallback(
    () => update((s) => ({ ...s, lastSpinAt: new Date().toISOString() })),
    [update]
  );

  const addCardFlip = useCallback(
    (amount: number) => update((s) => ({ ...s, pendingCardFlips: Math.max(0, s.pendingCardFlips + amount) })),
    [update]
  );

  const buyDicePack = useCallback(
    (packId: string) => {
      const pack = DICE_PACKS.find((p) => p.id === packId);
      if (!pack || state.coins < pack.costCoins) return false;
      if (user) {
        // Server-authoritative path: do NOT touch local state until the RPC
        // confirms the purchase. This prevents bypassing the server price
        // check via direct table writes (now blocked by RLS anyway).
        setPendingPurchases((prev) => { const n = new Set(prev); n.add(`pack:${packId}`); return n; });
        supabase.rpc("buy_dice_pack", { p_pack_id: packId }).then(({ data, error }) => {
          setPendingPurchases((prev) => { const n = new Set(prev); n.delete(`pack:${packId}`); return n; });
          if (error || !data) return;
          const fresh = applyRegen(dbToState(data as any), Date.now());
          setState(fresh);
          saveLocalState(fresh);
        });
      } else {
        // Anonymous (no user) — optimistic local-only path for offline play.
        update((s) => ({ ...s, coins: s.coins - pack.costCoins, rolls: s.rolls + pack.rolls }));
      }
      return true;
    },
    [state.coins, update, user]
  );

  const unlockDiceTier = useCallback(
    (tierId: string) => {
      const tier = DICE_TIERS.find((t) => t.id === tierId);
      if (!tier || state.unlockedDiceTiers.includes(tierId) || state.coins < tier.costCoins) return false;
      if (user && (tierId === "silver" || tierId === "gold")) {
        // Server-validated unlock — RLS blocks direct array growth.
        setPendingPurchases((prev) => { const n = new Set(prev); n.add(`tier:${tierId}`); return n; });
        supabase.rpc("unlock_dice_tier", { p_tier_id: tierId }).then(({ data, error }) => {
          setPendingPurchases((prev) => { const n = new Set(prev); n.delete(`tier:${tierId}`); return n; });
          if (error || !data) return;
          const fresh = applyRegen(dbToState(data as any), Date.now());
          // Auto-select the newly purchased tier locally.
          const next = { ...fresh, activeDiceTier: tierId };
          setState(next);
          saveLocalState(next);
          saveToDb(next);
        });
        return true;
      }
      // Free tiers (e.g. seeded "basic") fall through to local update.
      update((s) => ({
        ...s,
        coins: s.coins - tier.costCoins,
        unlockedDiceTiers: [...s.unlockedDiceTiers, tierId],
        activeDiceTier: tierId,
      }));
      return true;
    },
    [state.unlockedDiceTiers, state.coins, update, user, saveToDb]
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

  const setBetMultiplier = useCallback(
    (mult: number) => {
      const available = getAvailableBets(state.coins);
      if (!available.includes(mult)) return;
      update((s) => ({ ...s, betMultiplier: mult }));
    },
    [state.coins, update]
  );

  const addXp = useCallback(
    (amount: number) => update((s) => {
      const newXp = Math.max(0, s.xp + amount);
      const newLevel = getLevelForXp(newXp);
      return { ...s, xp: newXp, level: newLevel.id };
    }),
    [update]
  );

  const tradeCard = useCallback(
    (cardId: string) => {
      // Count how many of this card we have
      const count = state.collectedCards.filter((id) => id === cardId).length;
      if (count < 2) return false; // Need at least 2 (keep 1, trade 1)

      // Find the card to get its rarity
      const allCards = CARD_SETS.flatMap((s) => s.cards);
      const card = allCards.find((c) => c.id === cardId);
      if (!card) return false;

      const tradeValue = TRADE_VALUES[card.rarity];

      update((s) => {
        // Remove one instance of the card
        const idx = s.collectedCards.indexOf(cardId);
        const newCards = [...s.collectedCards];
        newCards.splice(idx, 1);
        return { ...s, collectedCards: newCards, coins: s.coins + tradeValue };
      });
      return true;
    },
    [state.collectedCards, update]
  );

  const activeMonsterData = MONSTERS.find((m) => m.id === state.activeMonster)!;
  const activeMonsterTaps = state.monsterTaps[state.activeMonster] ?? 0;
  const activeEvolution = getMonsterEvolution(activeMonsterData, activeMonsterTaps);
  const levelProgress = getLevelProgress(state.xp);

  return {
    ...state,
    pendingPurchases,
    addCoins,
    addRolls,
    addEnergy,
    rollDice,
    buyDicePack,
    unlockDiceTier,
    setActiveDiceTier,
    unlockMonster,
    setActiveMonster,
    setBetMultiplier,
    tradeCard,
    grantCard,
    grantMonster,
    grantDiceTier,
    addStars,
    addXp,
    consumeCardFlip,
    addCardFlip,
    recordSpin,
    activeMonsterData,
    activeMonsterTaps,
    activeEvolution,
    activeDiceTierData: DICE_TIERS.find((t) => t.id === state.activeDiceTier) ?? DICE_TIERS[0],
    levelProgress,
    energyCap: energyCapForLevel(state.level),
    energyRegenMs: ENERGY_REGEN_MS,
  };
}
