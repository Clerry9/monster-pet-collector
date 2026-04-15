import monster1 from "@/assets/monster-1.png";
import monster2 from "@/assets/monster-2.png";
import monster3 from "@/assets/monster-3.png";
import monster4 from "@/assets/monster-4.png";
import monster5 from "@/assets/monster-5.png";
import monster6 from "@/assets/monster-6.png";

export interface MonsterEvolution {
  level: number;
  name: string;
  coinsPerTap: number;
  tapsRequired: number; // cumulative taps to reach this level
  description: string;
}

export interface Monster {
  id: string;
  name: string;
  image: string;
  cost: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  description: string;
  coinsPerTap: number;
  evolutions: MonsterEvolution[];
}

export const MONSTERS: Monster[] = [
  {
    id: "gobby",
    name: "Gobby",
    image: monster1,
    cost: 0,
    rarity: "common",
    description: "A friendly little green guy. Your starter monster!",
    coinsPerTap: 1,
    evolutions: [
      { level: 1, name: "Gobby", coinsPerTap: 1, tapsRequired: 0, description: "A friendly little green guy." },
      { level: 2, name: "Goblin Scout", coinsPerTap: 3, tapsRequired: 50, description: "Learned to find hidden coins!" },
      { level: 3, name: "Goblin Chief", coinsPerTap: 6, tapsRequired: 200, description: "Rules a tribe of coin collectors." },
      { level: 4, name: "Goblin King", coinsPerTap: 12, tapsRequired: 500, description: "The supreme ruler of all goblins!" },
    ],
  },
  {
    id: "vexor",
    name: "Vexor",
    image: monster2,
    cost: 500,
    rarity: "epic",
    description: "A terrifying multi-eyed beast dripping with slime.",
    coinsPerTap: 5,
    evolutions: [
      { level: 1, name: "Vexor", coinsPerTap: 5, tapsRequired: 0, description: "A terrifying multi-eyed beast." },
      { level: 2, name: "Vexor Prime", coinsPerTap: 10, tapsRequired: 100, description: "Extra eyes mean extra coins!" },
      { level: 3, name: "Vexor Overlord", coinsPerTap: 20, tapsRequired: 400, description: "Slime that turns to gold." },
      { level: 4, name: "Vexor Titan", coinsPerTap: 40, tapsRequired: 1000, description: "An unstoppable coin machine!" },
    ],
  },
  {
    id: "fluffina",
    name: "Fluffina",
    image: monster3,
    cost: 200,
    rarity: "rare",
    description: "The cutest fluffy monster with tiny angel wings.",
    coinsPerTap: 3,
    evolutions: [
      { level: 1, name: "Fluffina", coinsPerTap: 3, tapsRequired: 0, description: "Tiny angel wings and big dreams." },
      { level: 2, name: "Fluffina Angel", coinsPerTap: 7, tapsRequired: 75, description: "Wings grew bigger and shinier!" },
      { level: 3, name: "Fluffina Seraph", coinsPerTap: 14, tapsRequired: 300, description: "Heavenly coin powers unlocked." },
      { level: 4, name: "Fluffina Divine", coinsPerTap: 28, tapsRequired: 750, description: "A true divine coin goddess!" },
    ],
  },
  {
    id: "cyclops",
    name: "Cyclops Jr.",
    image: monster4,
    cost: 800,
    rarity: "epic",
    description: "One giant eye, many tentacles, zero manners.",
    coinsPerTap: 7,
    evolutions: [
      { level: 1, name: "Cyclops Jr.", coinsPerTap: 7, tapsRequired: 0, description: "One eye, many tentacles." },
      { level: 2, name: "Cyclops Warrior", coinsPerTap: 15, tapsRequired: 120, description: "Tentacles grab coins everywhere!" },
      { level: 3, name: "Cyclops Elder", coinsPerTap: 30, tapsRequired: 500, description: "Ancient wisdom = ancient wealth." },
      { level: 4, name: "Cyclops Demigod", coinsPerTap: 55, tapsRequired: 1200, description: "Power beyond comprehension!" },
    ],
  },
  {
    id: "drako",
    name: "Drako",
    image: monster5,
    cost: 300,
    rarity: "rare",
    description: "A baby dragon who still can't breathe fire.",
    coinsPerTap: 4,
    evolutions: [
      { level: 1, name: "Drako", coinsPerTap: 4, tapsRequired: 0, description: "A baby dragon, can't breathe fire yet." },
      { level: 2, name: "Drako Flame", coinsPerTap: 9, tapsRequired: 80, description: "First spark! Burns coins into gold." },
      { level: 3, name: "Drako Inferno", coinsPerTap: 18, tapsRequired: 350, description: "A blazing furnace of fortune." },
      { level: 4, name: "Drako Ancient", coinsPerTap: 35, tapsRequired: 900, description: "Ancient dragon hoarding mountains of gold!" },
    ],
  },
  {
    id: "shadowfiend",
    name: "Shadow Fiend",
    image: monster6,
    cost: 2000,
    rarity: "legendary",
    description: "Born from pure darkness. The ultimate monster.",
    coinsPerTap: 15,
    evolutions: [
      { level: 1, name: "Shadow Fiend", coinsPerTap: 15, tapsRequired: 0, description: "Born from pure darkness." },
      { level: 2, name: "Shadow Lord", coinsPerTap: 30, tapsRequired: 150, description: "Darkness consumes all coins nearby!" },
      { level: 3, name: "Shadow Emperor", coinsPerTap: 60, tapsRequired: 600, description: "Entire economies tremble before it." },
      { level: 4, name: "Shadow God", coinsPerTap: 120, tapsRequired: 1500, description: "Ultimate power. Ultimate coins." },
    ],
  },
];

export function getMonsterEvolution(monster: Monster, taps: number): MonsterEvolution {
  let current = monster.evolutions[0];
  for (const evo of monster.evolutions) {
    if (taps >= evo.tapsRequired) current = evo;
  }
  return current;
}

export function getNextEvolution(monster: Monster, taps: number): MonsterEvolution | null {
  for (const evo of monster.evolutions) {
    if (taps < evo.tapsRequired) return evo;
  }
  return null;
}
