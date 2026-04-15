import monster1 from "@/assets/monster-1.png";
import monster2 from "@/assets/monster-2.png";
import monster3 from "@/assets/monster-3.png";
import monster4 from "@/assets/monster-4.png";
import monster5 from "@/assets/monster-5.png";
import monster6 from "@/assets/monster-6.png";

export interface Monster {
  id: string;
  name: string;
  image: string;
  cost: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  description: string;
  coinsPerTap: number;
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
  },
  {
    id: "vexor",
    name: "Vexor",
    image: monster2,
    cost: 500,
    rarity: "epic",
    description: "A terrifying multi-eyed beast dripping with slime.",
    coinsPerTap: 5,
  },
  {
    id: "fluffina",
    name: "Fluffina",
    image: monster3,
    cost: 200,
    rarity: "rare",
    description: "The cutest fluffy monster with tiny angel wings.",
    coinsPerTap: 3,
  },
  {
    id: "cyclops",
    name: "Cyclops Jr.",
    image: monster4,
    cost: 800,
    rarity: "epic",
    description: "One giant eye, many tentacles, zero manners.",
    coinsPerTap: 7,
  },
  {
    id: "drako",
    name: "Drako",
    image: monster5,
    cost: 300,
    rarity: "rare",
    description: "A baby dragon who still can't breathe fire.",
    coinsPerTap: 4,
  },
  {
    id: "shadowfiend",
    name: "Shadow Fiend",
    image: monster6,
    cost: 2000,
    rarity: "legendary",
    description: "Born from pure darkness. The ultimate monster.",
    coinsPerTap: 15,
  },
];
