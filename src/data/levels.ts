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

// XP thresholds increase exponentially
export const LEVELS: LevelTheme[] = [
  {
    id: 1, name: "Goblin Forest", emoji: "🌲",
    xpRequired: 0,
    bgGradient: "from-green-900/20 to-emerald-900/10",
    tileBonus: "Normal tiles",
    tileModifier: (_t, v) => v,
    accentColor: "142 71% 45%",
  },
  {
    id: 2, name: "Crystal Caves", emoji: "💎",
    xpRequired: 100,
    bgGradient: "from-blue-900/20 to-cyan-900/10",
    tileBonus: "Chest tiles give +25% coins",
    tileModifier: (t, v) => t === "chest" ? Math.round(v * 1.25) : v,
    accentColor: "199 89% 48%",
  },
  {
    id: 3, name: "Lava Peaks", emoji: "🌋",
    xpRequired: 300,
    bgGradient: "from-red-900/20 to-orange-900/10",
    tileBonus: "Star tiles give +50% coins",
    tileModifier: (t, v) => t === "star" ? Math.round(v * 1.5) : v,
    accentColor: "25 95% 53%",
  },
  {
    id: 4, name: "Haunted Marsh", emoji: "👻",
    xpRequired: 700,
    bgGradient: "from-purple-900/20 to-violet-900/10",
    tileBonus: "Skull penalties reduced by 50%",
    tileModifier: (t, v) => t === "skull" ? Math.round(v * 0.5) : v,
    accentColor: "271 76% 53%",
  },
  {
    id: 5, name: "Sky Citadel", emoji: "🏰",
    xpRequired: 1500,
    bgGradient: "from-sky-900/20 to-indigo-900/10",
    tileBonus: "All coin tiles give +30%",
    tileModifier: (t, v) => t === "coins" ? Math.round(v * 1.3) : v,
    accentColor: "217 91% 60%",
  },
  {
    id: 6, name: "Dragon's Lair", emoji: "🐉",
    xpRequired: 3000,
    bgGradient: "from-amber-900/20 to-yellow-900/10",
    tileBonus: "Bonus tiles give 2x effect",
    tileModifier: (t, v) => t === "bonus" ? v * 2 : v,
    accentColor: "45 93% 47%",
  },
  {
    id: 7, name: "Void Realm", emoji: "🌌",
    xpRequired: 6000,
    bgGradient: "from-slate-900/30 to-zinc-900/20",
    tileBonus: "All rewards +50%, skulls +25% penalty",
    tileModifier: (t, v) => t === "skull" ? Math.round(v * 1.25) : Math.round(v * 1.5),
    accentColor: "0 0% 80%",
  },
  {
    id: 8, name: "Celestial Plane", emoji: "✨",
    xpRequired: 12000,
    bgGradient: "from-yellow-900/20 to-amber-800/10",
    tileBonus: "All rewards doubled!",
    tileModifier: (t, v) => t === "skull" ? v : v * 2,
    accentColor: "50 100% 64%",
  },
];

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

/** Get the current level for a given XP amount */
export function getLevelForXp(xp: number): LevelTheme {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xpRequired) level = l;
    else break;
  }
  return level;
}

/** Get XP progress within current level (0-1) */
export function getLevelProgress(xp: number): { current: LevelTheme; next: LevelTheme | null; progress: number; xpInLevel: number; xpNeeded: number } {
  const current = getLevelForXp(xp);
  const currentIdx = LEVELS.indexOf(current);
  const next = currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1] : null;

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
