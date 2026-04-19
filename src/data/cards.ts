export type CardRarity = "common" | "rare" | "epic" | "legendary";

export const TRADE_VALUES: Record<CardRarity, number> = {
  common: 10,
  rare: 30,
  epic: 75,
  legendary: 200,
};

export interface GameCard {
  id: string;
  name: string;
  theme: string;
  rarity: CardRarity;
  emoji: string;
  description: string;
  reward: {
    type: "coins" | "monster";
    amount?: number;       // for coins
    monsterId?: string;    // for monster unlock
  };
}

export interface CardSet {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cards: GameCard[];
  setBonus: {
    type: "coins" | "monster";
    amount?: number;
    monsterId?: string;
    description: string;
  };
}

const forestCards: GameCard[] = [
  { id: "forest-1", name: "Ancient Oak", theme: "forest", rarity: "common", emoji: "🌳", description: "A thousand-year-old oak radiating life.", reward: { type: "coins", amount: 15 } },
  { id: "forest-2", name: "Mushroom Ring", theme: "forest", rarity: "common", emoji: "🍄", description: "A fairy circle of glowing mushrooms.", reward: { type: "coins", amount: 20 } },
  { id: "forest-3", name: "Forest Spirit", theme: "forest", rarity: "rare", emoji: "🧚", description: "A gentle spirit guarding the woodland.", reward: { type: "coins", amount: 40 } },
  { id: "forest-4", name: "Golden Acorn", theme: "forest", rarity: "rare", emoji: "🌰", description: "Said to grant wishes to whoever finds it.", reward: { type: "coins", amount: 50 } },
  { id: "forest-5", name: "Enchanted Stag", theme: "forest", rarity: "epic", emoji: "🦌", description: "A majestic deer with crystalline antlers.", reward: { type: "coins", amount: 100 } },
];

const oceanCards: GameCard[] = [
  { id: "ocean-1", name: "Pearl Shell", theme: "ocean", rarity: "common", emoji: "🐚", description: "A shimmering shell hiding a perfect pearl.", reward: { type: "coins", amount: 15 } },
  { id: "ocean-2", name: "Coral Reef", theme: "ocean", rarity: "common", emoji: "🪸", description: "A vibrant reef teeming with life.", reward: { type: "coins", amount: 20 } },
  { id: "ocean-3", name: "Sea Serpent", theme: "ocean", rarity: "rare", emoji: "🐉", description: "A massive serpent coiled in the deep.", reward: { type: "coins", amount: 45 } },
  { id: "ocean-4", name: "Sunken Treasure", theme: "ocean", rarity: "epic", emoji: "💎", description: "Gold doubloons from a pirate shipwreck.", reward: { type: "coins", amount: 120 } },
  { id: "ocean-5", name: "Kraken Eye", theme: "ocean", rarity: "legendary", emoji: "👁️", description: "The all-seeing eye of the ocean ruler.", reward: { type: "coins", amount: 250 } },
];

const darkCards: GameCard[] = [
  { id: "dark-1", name: "Bat Colony", theme: "dark", rarity: "common", emoji: "🦇", description: "Thousands of bats swirling in the moonlight.", reward: { type: "coins", amount: 18 } },
  { id: "dark-2", name: "Cursed Mirror", theme: "dark", rarity: "rare", emoji: "🪞", description: "Shows your shadow self staring back.", reward: { type: "coins", amount: 45 } },
  { id: "dark-3", name: "Night Crystal", theme: "dark", rarity: "rare", emoji: "🔮", description: "A crystal that absorbs all light.", reward: { type: "coins", amount: 55 } },
  { id: "dark-4", name: "Phantom Cloak", theme: "dark", rarity: "epic", emoji: "👻", description: "Wear it to walk between worlds.", reward: { type: "coins", amount: 110 } },
  { id: "dark-5", name: "Shadow Fiend Egg", theme: "dark", rarity: "legendary", emoji: "🥚", description: "The egg of the legendary Shadow Fiend!", reward: { type: "monster", monsterId: "shadowfiend" } },
];

const fireCards: GameCard[] = [
  { id: "fire-1", name: "Ember Sprite", theme: "fire", rarity: "common", emoji: "🔥", description: "A tiny dancing flame with a mischievous grin.", reward: { type: "coins", amount: 18 } },
  { id: "fire-2", name: "Lava Stone", theme: "fire", rarity: "common", emoji: "🪨", description: "Still warm from the volcano's heart.", reward: { type: "coins", amount: 22 } },
  { id: "fire-3", name: "Phoenix Feather", theme: "fire", rarity: "rare", emoji: "🪶", description: "Burns bright but never burns out.", reward: { type: "coins", amount: 50 } },
  { id: "fire-4", name: "Drako Scale", theme: "fire", rarity: "epic", emoji: "🐲", description: "A scale from a young dragon — still warm!", reward: { type: "monster", monsterId: "drako" } },
  { id: "fire-5", name: "Inferno Crown", theme: "fire", rarity: "legendary", emoji: "👑", description: "Worn by the king of all fire creatures.", reward: { type: "coins", amount: 300 } },
];

// Seasonal event cards — only obtainable via the rotating Season system.
export const SEASON_CARDS: GameCard[] = [
  { id: "season-frost-rare", name: "Frost Sigil", theme: "season", rarity: "rare", emoji: "❄️", description: "A glimmering sigil of the Frostfall season.", reward: { type: "coins", amount: 100 } },
  { id: "season-frost-ultra", name: "Glacier Heart", theme: "season", rarity: "legendary", emoji: "🧊", description: "The frozen core of an ancient glacier — Frostfall ultra-rare.", reward: { type: "coins", amount: 500 } },
  { id: "season-ember-rare", name: "Ember Mark", theme: "season", rarity: "rare", emoji: "🔥", description: "A burning brand of the Emberfest season.", reward: { type: "coins", amount: 100 } },
  { id: "season-ember-ultra", name: "Forge Crown", theme: "season", rarity: "legendary", emoji: "👑", description: "Worn by the master of the Emberfest forges.", reward: { type: "coins", amount: 500 } },
  { id: "season-star-rare", name: "Starlight Charm", theme: "season", rarity: "rare", emoji: "⭐", description: "A charm woven from cosmic light — Starbound rare.", reward: { type: "coins", amount: 100 } },
  { id: "season-star-ultra", name: "Astral Relic", theme: "season", rarity: "legendary", emoji: "🪐", description: "Forged in the heart of a dying star.", reward: { type: "coins", amount: 500 } },
  { id: "season-bloom-rare", name: "Petal Sigil", theme: "season", rarity: "rare", emoji: "🌸", description: "The first bloom of the Bloomtide season.", reward: { type: "coins", amount: 100 } },
  { id: "season-bloom-ultra", name: "Eternal Bloom", theme: "season", rarity: "legendary", emoji: "🌷", description: "A blossom that never withers — Bloomtide ultra-rare.", reward: { type: "coins", amount: 500 } },
];


  { id: "cosmic-1", name: "Stardust", theme: "cosmic", rarity: "common", emoji: "✨", description: "Glittering particles from a dying star.", reward: { type: "coins", amount: 20 } },
  { id: "cosmic-2", name: "Moon Shard", theme: "cosmic", rarity: "rare", emoji: "🌙", description: "A fragment of a shattered moon.", reward: { type: "coins", amount: 55 } },
  { id: "cosmic-3", name: "Nebula Core", theme: "cosmic", rarity: "rare", emoji: "🌌", description: "The compressed heart of a nebula.", reward: { type: "coins", amount: 60 } },
  { id: "cosmic-4", name: "Alien Artifact", theme: "cosmic", rarity: "epic", emoji: "🛸", description: "Technology beyond human understanding.", reward: { type: "coins", amount: 130 } },
  { id: "cosmic-5", name: "Vexor Shard", theme: "cosmic", rarity: "legendary", emoji: "🧿", description: "Contains the essence of Vexor!", reward: { type: "monster", monsterId: "vexor" } },
];

export const CARD_SETS: CardSet[] = [
  {
    id: "forest",
    name: "Enchanted Forest",
    emoji: "🌲",
    description: "Mystical creatures and treasures of the woodland.",
    cards: forestCards,
    setBonus: { type: "monster", monsterId: "fluffina", description: "Unlock Fluffina!" },
  },
  {
    id: "ocean",
    name: "Deep Ocean",
    emoji: "🌊",
    description: "Secrets from the darkest depths of the sea.",
    cards: oceanCards,
    setBonus: { type: "coins", amount: 500, description: "+500 coins!" },
  },
  {
    id: "dark",
    name: "Shadow Realm",
    emoji: "🌑",
    description: "Cursed relics from the land of eternal night.",
    cards: darkCards,
    setBonus: { type: "monster", monsterId: "shadowfiend", description: "Unlock Shadow Fiend!" },
  },
  {
    id: "fire",
    name: "Volcanic Forge",
    emoji: "🌋",
    description: "Blazing artifacts from the world's core.",
    cards: fireCards,
    setBonus: { type: "monster", monsterId: "drako", description: "Unlock Drako!" },
  },
  {
    id: "cosmic",
    name: "Cosmic Void",
    emoji: "🪐",
    description: "Otherworldly treasures from beyond the stars.",
    cards: cosmicCards,
    setBonus: { type: "monster", monsterId: "vexor", description: "Unlock Vexor!" },
  },
];

export const ALL_CARDS: GameCard[] = CARD_SETS.flatMap((s) => s.cards);

// Get a random card based on rarity weights
export function drawRandomCard(): GameCard {
  const rarityWeights: Record<CardRarity, number> = {
    common: 50,
    rare: 30,
    epic: 15,
    legendary: 5,
  };

  const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let selectedRarity: CardRarity = "common";

  for (const [rarity, weight] of Object.entries(rarityWeights) as [CardRarity, number][]) {
    roll -= weight;
    if (roll <= 0) {
      selectedRarity = rarity;
      break;
    }
  }

  const pool = ALL_CARDS.filter((c) => c.rarity === selectedRarity);
  if (pool.length === 0) return ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

export const RARITY_COLORS: Record<CardRarity, string> = {
  common: "border-muted-foreground/40 bg-muted/30",
  rare: "border-primary/60 bg-primary/10",
  epic: "border-secondary/60 bg-secondary/10",
  legendary: "border-accent/60 bg-accent/10",
};

export const RARITY_GLOW: Record<CardRarity, string> = {
  common: "",
  rare: "box-glow-green",
  epic: "box-glow-purple",
  legendary: "box-glow-orange",
};
