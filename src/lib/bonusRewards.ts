/**
 * Per-roll bonus reward system (Phase 1).
 *
 * On every roll the player has a chance to receive a SECOND reward on top of
 * the normal tile reward. The chance and quality scale with bet_multiplier.
 */

export type BonusKind =
  | "energy"
  | "monster_buff"
  | "minigame_token"
  | "build_discount"
  | "shards"
  | "shards_mega";

export interface BonusReward {
  kind: BonusKind;
  amount: number;
  /** For build_discount only: minutes the discount lasts. */
  durationMinutes?: number;
  label: string;
  emoji: string;
  description: string;
}

/** Chance any bonus triggers this roll. Scales with bet. */
export function bonusChance(bet: number): number {
  const b = Math.max(1, bet);
  return Math.min(0.65, 0.15 + Math.log2(b) * 0.08);
}

interface PoolEntry {
  kind: BonusKind;
  weight: (bet: number) => number;
  make: (bet: number) => BonusReward;
}

const POOL: PoolEntry[] = [
  {
    kind: "shards",
    weight: () => 40,
    make: (bet) => {
      const min = 1 + Math.floor(Math.log2(bet));
      const amount = min + Math.floor(Math.random() * (10 + min));
      return {
        kind: "shards",
        amount,
        label: `+${amount} Shards`,
        emoji: "💠",
        description: "Spend at the Summon altar.",
      };
    },
  },
  {
    kind: "energy",
    weight: () => 25,
    make: (bet) => {
      const tiers = bet >= 8 ? [25, 50] : bet >= 3 ? [10, 25] : [10];
      const amount = tiers[Math.floor(Math.random() * tiers.length)];
      return {
        kind: "energy",
        amount,
        label: `+${amount} Energy`,
        emoji: "⚡",
        description: "Keep on rolling!",
      };
    },
  },
  {
    kind: "monster_buff",
    weight: () => 15,
    make: () => ({
      kind: "monster_buff",
      amount: 5,
      label: "Monster Buff",
      emoji: "💪",
      description: "+10% coins on the next 5 rolls.",
    }),
  },
  {
    kind: "minigame_token",
    weight: () => 10,
    make: () => ({
      kind: "minigame_token",
      amount: 1,
      label: "Mini-Game Token",
      emoji: "🎮",
      description: "Play a mini-game free.",
    }),
  },
  {
    kind: "build_discount",
    weight: () => 8,
    make: (bet) => {
      const minutes = bet >= 5 ? 15 : bet >= 3 ? 10 : 5;
      return {
        kind: "build_discount",
        amount: 25,
        durationMinutes: minutes,
        label: `−25% Build for ${minutes}m`,
        emoji: "🔧",
        description: "Building costs reduced.",
      };
    },
  },
  {
    kind: "shards_mega",
    // Only available at higher bets; tiny chance overall.
    weight: (bet) => (bet >= 3 ? 2 : 0),
    make: (bet) => {
      const amount = 25 + Math.floor(Math.random() * 26) + Math.floor(bet);
      return {
        kind: "shards_mega",
        amount,
        label: `+${amount} Shards!`,
        emoji: "✨",
        description: "Mega shard burst!",
      };
    },
  },
];

/** Returns a BonusReward or null if no bonus this roll. */
export function rollBonusReward(bet: number): BonusReward | null {
  if (Math.random() > bonusChance(bet)) return null;
  const entries = POOL.map((e) => ({ e, w: e.weight(bet) })).filter((x) => x.w > 0);
  const total = entries.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const { e, w } of entries) {
    r -= w;
    if (r <= 0) return e.make(bet);
  }
  return entries[0].e.make(bet);
}