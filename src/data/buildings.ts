export interface BuildingTheme {
  level: number;
  name: string;
  finalEmoji: string;
  resources: [string, string, string]; // foundation, walls, roof
  sections: [string, string, string];
}

export const BUILDINGS: BuildingTheme[] = [
  { level: 1, name: "Wooden Hut",     finalEmoji: "🛖", resources: ["🪵", "🌿", "🍂"], sections: ["Foundation", "Walls", "Roof"] },
  { level: 2, name: "Crystal Shrine", finalEmoji: "🔮", resources: ["💎", "🔷", "✨"], sections: ["Crystal Base", "Prism Walls", "Glow Spire"] },
  { level: 3, name: "Forge Tower",    finalEmoji: "🗼", resources: ["🪨", "🔥", "⚒️"], sections: ["Stone Base", "Forge Walls", "Smokestack"] },
  { level: 4, name: "Ghost Shack",    finalEmoji: "🏚️", resources: ["🪦", "🕸️", "👻"], sections: ["Cursed Floor", "Boarded Walls", "Spectral Roof"] },
  { level: 5, name: "Sky Bridge",     finalEmoji: "🌉", resources: ["☁️", "🪶", "⚡"], sections: ["Cloud Base", "Wind Pillars", "Storm Cap"] },
  { level: 6, name: "Dragon Roost",   finalEmoji: "🏯", resources: ["🥚", "🔥", "🐲"], sections: ["Egg Nest", "Scale Walls", "Wing Roof"] },
  { level: 7, name: "Void Obelisk",   finalEmoji: "🗿", resources: ["🌑", "🌌", "🕳️"], sections: ["Dark Base", "Void Walls", "Singularity"] },
  { level: 8, name: "Star Temple",    finalEmoji: "🏛️", resources: ["⭐", "🌟", "☀️"], sections: ["Star Floor", "Light Walls", "Sun Crown"] },
];

export function getBuildingForLevel(level: number): BuildingTheme {
  return BUILDINGS.find((b) => b.level === level) ?? BUILDINGS[BUILDINGS.length - 1];
}

/**
 * Coin cost to start a build. Scales by 13% per player level so each new
 * island costs more than the last.
 *   cost(L) = round(BASE * 1.13^(L-1))
 */
export const BUILD_BASE_COST = 100;
export const BUILD_COST_GROWTH = 1.13;

export function getBuildCoinCost(playerLevel: number): number {
  const L = Math.max(1, Math.floor(playerLevel));
  return Math.round(BUILD_BASE_COST * Math.pow(BUILD_COST_GROWTH, L - 1));
}
