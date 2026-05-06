import monster1 from "@/assets/monster-1.png";
import monster2 from "@/assets/monster-2.png";
import monster3 from "@/assets/monster-3.png";
import monster4 from "@/assets/monster-4.png";
import monster5 from "@/assets/monster-5.png";
import monster6 from "@/assets/monster-6.png";
import monster7 from "@/assets/monster-7.png";
import monster8 from "@/assets/monster-8.png";
import monster9 from "@/assets/monster-9.png";

export type MonsterBiome = "forest" | "abyss" | "sky" | "shadow";

export interface MonsterEvolution {
  level: number;
  name: string;
  coinBonus: number; // passive % coin bonus from all tiles
  xpRequired: number; // cumulative XP to reach this level
  description: string;
}

export interface Monster {
  id: string;
  name: string;
  image: string;
  cost: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  description: string;
  coinBonus: number; // base bonus
  evolutions: MonsterEvolution[];
  biome: MonsterBiome;
}

export const MONSTERS: Monster[] = [
  {
    id: "gobby",
    name: "Gobby",
    image: monster1,
    cost: 0,
    rarity: "common",
    description: "A friendly little green guy. Your starter monster!",
    coinBonus: 0,
    biome: "forest",
    evolutions: [
      { level: 1, name: "Gobby", coinBonus: 0, xpRequired: 0, description: "A friendly little green guy." },
      { level: 2, name: "Goblin Scout", coinBonus: 10, xpRequired: 50, description: "Finds 10% more coins on every tile!" },
      { level: 3, name: "Goblin Chief", coinBonus: 25, xpRequired: 200, description: "Rules a tribe — 25% coin bonus." },
      { level: 4, name: "Goblin King", coinBonus: 50, xpRequired: 500, description: "The supreme ruler — 50% coin bonus!" },
    ],
  },
  {
    id: "vexor",
    name: "Vexor",
    image: monster2,
    cost: 500,
    rarity: "epic",
    description: "A terrifying multi-eyed beast dripping with slime.",
    coinBonus: 5,
    biome: "abyss",
    evolutions: [
      { level: 1, name: "Vexor", coinBonus: 5, xpRequired: 0, description: "A terrifying multi-eyed beast." },
      { level: 2, name: "Vexor Prime", coinBonus: 15, xpRequired: 100, description: "Extra eyes spot 15% more coins!" },
      { level: 3, name: "Vexor Overlord", coinBonus: 35, xpRequired: 400, description: "Slime attracts gold — 35% bonus." },
      { level: 4, name: "Vexor Titan", coinBonus: 60, xpRequired: 1000, description: "Unstoppable — 60% coin bonus!" },
    ],
  },
  {
    id: "fluffina",
    name: "Fluffina",
    image: monster3,
    cost: 200,
    rarity: "rare",
    description: "The cutest fluffy monster with tiny angel wings.",
    coinBonus: 3,
    biome: "sky",
    evolutions: [
      { level: 1, name: "Fluffina", coinBonus: 3, xpRequired: 0, description: "Tiny angel wings and big dreams." },
      { level: 2, name: "Fluffina Angel", coinBonus: 12, xpRequired: 75, description: "Wings shimmer — 12% coin bonus!" },
      { level: 3, name: "Fluffina Seraph", coinBonus: 28, xpRequired: 300, description: "Heavenly aura — 28% coin bonus." },
      { level: 4, name: "Fluffina Divine", coinBonus: 55, xpRequired: 750, description: "Divine blessing — 55% coin bonus!" },
    ],
  },
  {
    id: "cyclops",
    name: "Cyclops Jr.",
    image: monster4,
    cost: 800,
    rarity: "epic",
    description: "One giant eye, many tentacles, zero manners.",
    coinBonus: 7,
    biome: "abyss",
    evolutions: [
      { level: 1, name: "Cyclops Jr.", coinBonus: 7, xpRequired: 0, description: "One eye, many tentacles." },
      { level: 2, name: "Cyclops Warrior", coinBonus: 20, xpRequired: 120, description: "Tentacles grab 20% more coins!" },
      { level: 3, name: "Cyclops Elder", coinBonus: 40, xpRequired: 500, description: "Ancient wisdom — 40% bonus." },
      { level: 4, name: "Cyclops Demigod", coinBonus: 70, xpRequired: 1200, description: "Godlike — 70% coin bonus!" },
    ],
  },
  {
    id: "drako",
    name: "Drako",
    image: monster5,
    cost: 300,
    rarity: "rare",
    description: "A baby dragon who still can't breathe fire.",
    coinBonus: 4,
    biome: "sky",
    evolutions: [
      { level: 1, name: "Drako", coinBonus: 4, xpRequired: 0, description: "A baby dragon, can't breathe fire yet." },
      { level: 2, name: "Drako Flame", coinBonus: 14, xpRequired: 80, description: "First spark! 14% more coins." },
      { level: 3, name: "Drako Inferno", coinBonus: 30, xpRequired: 350, description: "Blazing fortune — 30% bonus." },
      { level: 4, name: "Drako Ancient", coinBonus: 55, xpRequired: 900, description: "Ancient dragon — 55% coin bonus!" },
    ],
  },
  {
    id: "shadowfiend",
    name: "Shadow Fiend",
    image: monster6,
    cost: 2000,
    rarity: "legendary",
    description: "Born from pure darkness. The ultimate monster.",
    coinBonus: 15,
    biome: "shadow",
    evolutions: [
      { level: 1, name: "Shadow Fiend", coinBonus: 15, xpRequired: 0, description: "Born from pure darkness." },
      { level: 2, name: "Shadow Lord", coinBonus: 35, xpRequired: 150, description: "Darkness devours — 35% bonus!" },
      { level: 3, name: "Shadow Emperor", coinBonus: 65, xpRequired: 600, description: "Economies tremble — 65% bonus." },
      { level: 4, name: "Shadow God", coinBonus: 100, xpRequired: 1500, description: "Ultimate power — 100% coin bonus!" },
    ],
  },
  {
    id: "mossfang",
    name: "Mossfang",
    image: monster7,
    cost: 350,
    rarity: "rare",
    description: "A mossy little beast with leaf horns and tiny fangs.",
    coinBonus: 6,
    biome: "forest",
    evolutions: [
      { level: 1, name: "Mossfang",       coinBonus: 6,  xpRequired: 0,    description: "Tiny but feisty — +6% coins." },
      { level: 2, name: "Mossfang Stalker", coinBonus: 18, xpRequired: 90,  description: "Hunts in the underbrush — +18% coins." },
      { level: 3, name: "Mossfang Alpha", coinBonus: 34, xpRequired: 380,  description: "Pack leader of the forest — +34% coins." },
      { level: 4, name: "Mossfang Primal", coinBonus: 58, xpRequired: 950, description: "Spirit of the wild — +58% coins." },
    ],
  },
  {
    id: "tidecaller",
    name: "Tidecaller",
    image: monster8,
    cost: 1100,
    rarity: "epic",
    description: "A glowing abyssal cutie that summons gentle tides.",
    coinBonus: 9,
    biome: "abyss",
    evolutions: [
      { level: 1, name: "Tidecaller",         coinBonus: 9,  xpRequired: 0,    description: "Bioluminescent abyss pup — +9% coins." },
      { level: 2, name: "Tidecaller Surge",   coinBonus: 22, xpRequired: 130,  description: "Currents flow your way — +22% coins." },
      { level: 3, name: "Tidecaller Maelstrom", coinBonus: 42, xpRequired: 520, description: "Whirlpools of treasure — +42% coins." },
      { level: 4, name: "Tidecaller Leviathan", coinBonus: 68, xpRequired: 1300, description: "Master of the depths — +68% coins." },
    ],
  },
  {
    id: "aurorix",
    name: "Aurorix",
    image: monster9,
    cost: 2500,
    rarity: "legendary",
    description: "A celestial sky-cat that shimmers like the aurora.",
    coinBonus: 18,
    biome: "sky",
    evolutions: [
      { level: 1, name: "Aurorix",         coinBonus: 18,  xpRequired: 0,    description: "Born of starlight — +18% coins." },
      { level: 2, name: "Aurorix Prism",   coinBonus: 38,  xpRequired: 180,  description: "Refracts fortune — +38% coins." },
      { level: 3, name: "Aurorix Zenith",  coinBonus: 70,  xpRequired: 700,  description: "Crowns the sky — +70% coins." },
      { level: 4, name: "Aurorix Eternal", coinBonus: 110, xpRequired: 1700, description: "Light of the cosmos — +110% coins." },
    ],
  },
];

export function getMonsterEvolution(monster: Monster, xp: number): MonsterEvolution {
  let current = monster.evolutions[0];
  for (const evo of monster.evolutions) {
    if (xp >= evo.xpRequired) current = evo;
  }
  return current;
}

export function getNextEvolution(monster: Monster, xp: number): MonsterEvolution | null {
  for (const evo of monster.evolutions) {
    if (xp < evo.xpRequired) return evo;
  }
  return null;
}

export const BIOMES: { id: MonsterBiome; name: string; emoji: string }[] = [
  { id: "forest", name: "Mossy Forest", emoji: "🌲" },
  { id: "sky",    name: "Skyreach",     emoji: "☁️" },
  { id: "abyss",  name: "The Abyss",    emoji: "🌊" },
  { id: "shadow", name: "Shadowlands",  emoji: "🌑" },
];
