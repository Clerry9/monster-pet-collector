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
