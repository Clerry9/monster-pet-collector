export interface LevelTheme {
  id: number;
  name: string;
  emoji: string;
  xpRequired: number; // total XP to reach this level
  bgGradient: string; // tailwind gradient classes
  tileBonus: string; // description of unique tile modifier
  tileModifier: (type: string, value: number) => number;
  accentColor: string; // CSS hsl color for progress bar
}

// 8 hand-crafted base themes — these cycle as the player climbs through 1200 levels.
const BASE_THEMES: Omit<LevelTheme, "id" | "xpRequired">[] = [
  {
    name: "Goblin Forest", emoji: "🌲",
    bgGradient: "from-green-900/20 to-emerald-900/10",
    tileBonus: "Normal tiles",
    tileModifier: (_t, v) => v,
    accentColor: "142 71% 45%",
  },
  {
    name: "Crystal Caves", emoji: "💎",
    bgGradient: "from-blue-900/20 to-cyan-900/10",
    tileBonus: "Chest tiles give +25% coins",
    tileModifier: (t, v) => t === "chest" ? Math.round(v * 1.25) : v,
    accentColor: "199 89% 48%",
  },
  {
    name: "Lava Peaks", emoji: "🌋",
    bgGradient: "from-red-900/20 to-orange-900/10",
    tileBonus: "Star tiles give +50% coins",
    tileModifier: (t, v) => t === "star" ? Math.round(v * 1.5) : v,
    accentColor: "25 95% 53%",
  },
  {
    name: "Haunted Marsh", emoji: "👻",
    bgGradient: "from-purple-900/20 to-violet-900/10",
    tileBonus: "Skull penalties reduced by 50%",
    tileModifier: (t, v) => t === "skull" ? Math.round(v * 0.5) : v,
    accentColor: "271 76% 53%",
  },
  {
    name: "Sky Citadel", emoji: "🏰",
    bgGradient: "from-sky-900/20 to-indigo-900/10",
    tileBonus: "All coin tiles give +30%",
    tileModifier: (t, v) => t === "coins" ? Math.round(v * 1.3) : v,
    accentColor: "217 91% 60%",
  },
  {
    name: "Dragon's Lair", emoji: "🐉",
    bgGradient: "from-amber-900/20 to-yellow-900/10",
    tileBonus: "Bonus tiles give 2x effect",
    tileModifier: (t, v) => t === "bonus" ? v * 2 : v,
    accentColor: "45 93% 47%",
  },
  {
    name: "Void Realm", emoji: "🌌",
    bgGradient: "from-slate-900/30 to-zinc-900/20",
    tileBonus: "All rewards +50%, skulls +25% penalty",
    tileModifier: (t, v) => t === "skull" ? Math.round(v * 1.25) : Math.round(v * 1.5),
    accentColor: "0 0% 80%",
  },
  {
    name: "Celestial Plane", emoji: "✨",
    bgGradient: "from-yellow-900/20 to-amber-800/10",
    tileBonus: "All rewards doubled!",
    tileModifier: (t, v) => t === "skull" ? v : v * 2,
    accentColor: "50 100% 64%",
  },
];

export const MAX_LEVEL = 1200;

// Roman-ish numeral suffix for cycle index past the first lap
function tier(n: number): string {
  if (n <= 0) return "";
  const numerals: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [v, s] of numerals) {
    while (n >= v) { out += s; n -= v; }
  }
  return ` ${out}`;
}

/**
 * XP required to REACH a given level (1-indexed).
 * Each level's XP cost is 15% higher than the previous level.
 *   gap(k) = BASE * 1.15^(k-1)   for the jump from level k → k+1
 *   xpForLevel(id) = sum_{k=1..id-1} gap(k) = BASE * (1.15^(id-1) - 1) / 0.15
 *
 * BASE = 100 → L2 needs 100 XP, L8 ≈ 1066 XP, L20 ≈ 10,244 XP, L50 ≈ 695k XP.
 * Numbers grow exponentially past L80 — capped only by MAX_LEVEL.
 */
const XP_BASE = 100;
const XP_GROWTH = 1.15;
export function xpForLevel(id: number): number {
  if (id <= 1) return 0;
  const total = XP_BASE * (Math.pow(XP_GROWTH, id - 1) - 1) / (XP_GROWTH - 1);
  return Math.round(total);
}

function buildLevel(id: number): LevelTheme {
  const base = BASE_THEMES[(id - 1) % BASE_THEMES.length];
  const cycle = Math.floor((id - 1) / BASE_THEMES.length);
  return {
    ...base,
    id,
    name: cycle === 0 ? base.name : `${base.name}${tier(cycle)}`,
    xpRequired: xpForLevel(id),
  };
}

// Materialized 1200-level catalogue (cheap — small objects, lazy modifiers).
export const LEVELS: LevelTheme[] = Array.from({ length: MAX_LEVEL }, (_, i) => buildLevel(i + 1));

/** BET_MULTIPLIERS and the minimum coins required to use each */
export const BET_MULTIPLIERS = [
  { mult: 1, minCoins: 0 },
  { mult: 2, minCoins: 20 },
  { mult: 5, minCoins: 50 },
  { mult: 10, minCoins: 100 },
  { mult: 25, minCoins: 250 },
  { mult: 50, minCoins: 500 },
  { mult: 100, minCoins: 1000 },
  { mult: 250, minCoins: 2500 },
  { mult: 500, minCoins: 5000 },
  { mult: 1000, minCoins: 10000 },
];

/** Get the current level for a given XP amount — closed-form, O(1). */
export function getLevelForXp(xp: number): LevelTheme {
  if (xp <= 0) return LEVELS[0];
  // Invert: xp = BASE * (g^(id-1) - 1) / (g-1)
  //   →  id = 1 + log_g(1 + xp * (g-1) / BASE)
  const ratio = 1 + (xp * (XP_GROWTH - 1)) / XP_BASE;
  const idApprox = 1 + Math.log(ratio) / Math.log(XP_GROWTH);
  const id = Math.min(MAX_LEVEL, Math.max(1, Math.floor(idApprox)));
  return LEVELS[id - 1];
}

/** Prestige milestone every 100 levels grants a permanent +5% coin bonus per tier. */
export const PRESTIGE_INTERVAL = 100;
export const PRESTIGE_BONUS_PER_TIER = 0.05;

export function getPrestigeTier(level: number): number {
  return Math.floor(Math.max(1, level) / PRESTIGE_INTERVAL);
}

/** Multiplier applied to coin rewards based on prestige tier. 0 → 1.0, 1 → 1.05, 2 → 1.10... */
export function getPrestigeCoinMultiplier(level: number): number {
  return 1 + getPrestigeTier(level) * PRESTIGE_BONUS_PER_TIER;
}

/** Returns the prestige tier just unlocked when crossing fromLevel → toLevel, or 0 if none. */
export function prestigeTierUnlocked(fromLevel: number, toLevel: number): number {
  const before = getPrestigeTier(fromLevel);
  const after = getPrestigeTier(toLevel);
  return after > before ? after : 0;
}

/** Get XP progress within current level (0-1) */
export function getLevelProgress(xp: number): { current: LevelTheme; next: LevelTheme | null; progress: number; xpInLevel: number; xpNeeded: number } {
  const current = getLevelForXp(xp);
  const next = current.id < MAX_LEVEL ? LEVELS[current.id] : null;

  if (!next) return { current, next: null, progress: 1, xpInLevel: 0, xpNeeded: 0 };

  const xpInLevel = xp - current.xpRequired;
  const xpNeeded = next.xpRequired - current.xpRequired;
  const progress = Math.min(1, xpInLevel / xpNeeded);

  return { current, next, progress, xpInLevel, xpNeeded };
}

/** Get available bet multipliers for a given coin balance */
export function getAvailableBets(coins: number): number[] {
  return BET_MULTIPLIERS.filter((b) => coins >= b.minCoins).map((b) => b.mult);
}
