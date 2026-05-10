/**
 * Shared reward pool used by every roulette/spin in the game.
 * Both the on-board Island Reward roulette and the side-rail Lucky Roulette
 * read from this module so prize payouts stay consistent everywhere.
 */

export type RewardKind =
  | "coins_small"
  | "coins_med"
  | "coins_jackpot"
  | "rolls"
  | "card_flip"
  | "island_star"
  | "monster_food"
  | "season_xp";

export interface Reward {
  kind: RewardKind;
  amount: number;
  emoji: string;
  /** Short human label (e.g. "Coins", "Free Rolls"). */
  label: string;
}

export interface RewardTemplate {
  /** Relative draw weight inside the shared pool. Higher = more common. */
  weight: number;
  /** Builds a fresh reward instance (handles random ranges). */
  build: () => Reward;
  /** Stable label used by the lucky-roulette legend. */
  staticLabel: string;
  /** Stable emoji used by the lucky-roulette wedge. */
  emoji: string;
}

export const SHARED_POOL: RewardTemplate[] = [
  {
    weight: 30,
    staticLabel: "Coins",
    emoji: "🪙",
    build: () => ({ kind: "coins_small", amount: 50 + Math.floor(Math.random() * 100), emoji: "🪙", label: "Coins" }),
  },
  {
    weight: 20,
    staticLabel: "Coin Stash",
    emoji: "💰",
    build: () => ({ kind: "coins_med", amount: 200 + Math.floor(Math.random() * 300), emoji: "💰", label: "Coin Stash" }),
  },
  {
    weight: 14,
    staticLabel: "Free Rolls",
    emoji: "⚡",
    build: () => ({ kind: "rolls", amount: 3 + Math.floor(Math.random() * 8), emoji: "⚡", label: "Free Rolls" }),
  },
  {
    weight: 10,
    staticLabel: "Monster Food",
    emoji: "🍖",
    build: () => ({ kind: "monster_food", amount: 25 + Math.floor(Math.random() * 50), emoji: "🍖", label: "Monster Food" }),
  },
  {
    weight: 9,
    staticLabel: "Season XP",
    emoji: "🌟",
    build: () => ({ kind: "season_xp", amount: 10, emoji: "🌟", label: "Season XP" }),
  },
  {
    weight: 7,
    staticLabel: "Free Card Flip",
    emoji: "🃏",
    build: () => ({ kind: "card_flip", amount: 1, emoji: "🃏", label: "Free Card Flip" }),
  },
  {
    weight: 7,
    staticLabel: "Island Star",
    emoji: "⭐",
    build: () => ({ kind: "island_star", amount: 1, emoji: "⭐", label: "Island Star" }),
  },
  {
    weight: 3,
    staticLabel: "JACKPOT",
    emoji: "💎",
    build: () => ({ kind: "coins_jackpot", amount: 1000 + Math.floor(Math.random() * 2000), emoji: "💎", label: "JACKPOT!" }),
  },
];

const POOL_TOTAL_WEIGHT = SHARED_POOL.reduce((sum, t) => sum + t.weight, 0);

/** Weighted random pick from the shared pool. */
export function pickReward(): Reward {
  let r = Math.random() * POOL_TOTAL_WEIGHT;
  for (const t of SHARED_POOL) {
    r -= t.weight;
    if (r <= 0) return t.build();
  }
  return SHARED_POOL[0].build();
}

/**
 * Fixed 8-slot layout for the Lucky Roulette wheel. Every slot maps to a
 * shared-pool template so prize amounts come from the same source as
 * island rewards. Slot order is intentionally stable so the legend, wedge
 * labels and ball animation always agree.
 */
export interface LuckySlot {
  /** Index into SHARED_POOL. */
  templateIndex: number;
  /** Wedge fill (semantic token only). */
  fill: string;
  /** Pre-baked reward used for display + payout. */
  reward: Reward;
}

const SLOT_TEMPLATE_ORDER = [0, 2, 1, 6, 3, 5, 4, 7]; // alternates color families
const SLOT_FILLS = [
  "hsl(var(--gold))",
  "hsl(var(--wood-dark))",
  "hsl(var(--gold))",
  "hsl(var(--candy-red))",
  "hsl(var(--gold))",
  "hsl(var(--wood-dark))",
  "hsl(var(--candy-red))",
  "hsl(var(--gold))",
];

/** Build the canonical 8-slot list. The amounts are sampled once per call. */
export function buildLuckySlots(): LuckySlot[] {
  return SLOT_TEMPLATE_ORDER.map((templateIndex, i) => ({
    templateIndex,
    fill: SLOT_FILLS[i],
    reward: SHARED_POOL[templateIndex].build(),
  }));
}

/**
 * Per-slot odds in percent. The wheel itself lands uniformly (1 in 8), but
 * we surface the underlying pool weights in the legend so users see how
 * each prize compares to the rest of the shared pool.
 */
export function slotOddsPercent(slots: LuckySlot[]): number[] {
  const total = slots.reduce((s, x) => s + SHARED_POOL[x.templateIndex].weight, 0);
  return slots.map((x) => Math.round((SHARED_POOL[x.templateIndex].weight / total) * 1000) / 10);
}

/** Equal per-spin odds (1/N) for the "you only win if it lands on your pick" mechanic. */
export function uniformSlotOdds(n: number): number {
  return Math.round((100 / n) * 10) / 10;
}