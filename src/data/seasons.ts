// Seasonal event system — rotates every 3 days deterministically.
// Each season has a theme, special symbol, mini-game palette, and two reward cards.

export interface SeasonReward {
  tier: number;          // 1-10
  symbolsRequired: number;
  free?: { type: "coins" | "rolls" | "symbols"; amount: number; label: string };
  premium?: { type: "coins" | "rolls" | "card" | "monster" | "dice"; amount?: number; id?: string; label: string };
}

export interface Season {
  id: string;            // stable id like "frostfall"
  name: string;
  emoji: string;
  symbol: string;        // the special symbol emoji
  symbolName: string;
  tagline: string;
  palette: {
    bg: string;          // tailwind hsl
    accent: string;
    glow: string;
  };
  miniGameTiles: string[]; // 5 emojis used in the match-3 grid
  rareCardId: string;    // unlock at 25 symbols
  ultraCardId: string;   // unlock at 75 symbols
  rewards: SeasonReward[]; // 10 tiers
}

const buildRewards = (rareCardId: string, ultraCardId: string): SeasonReward[] => [
  { tier: 1,  symbolsRequired: 5,   free: { type: "coins",  amount: 100, label: "+100 Coins" },  premium: { type: "rolls",  amount: 5,   label: "+5 Rolls" } },
  { tier: 2,  symbolsRequired: 10,  free: { type: "rolls",  amount: 3,   label: "+3 Rolls" },     premium: { type: "coins",  amount: 300, label: "+300 Coins" } },
  { tier: 3,  symbolsRequired: 18,  free: { type: "symbols",amount: 3,   label: "+3 Symbols" },   premium: { type: "rolls",  amount: 10,  label: "+10 Rolls" } },
  { tier: 4,  symbolsRequired: 25,  free: { type: "coins",  amount: 250, label: "+250 Coins" },   premium: { type: "card",   id: rareCardId, label: "🃏 Rare Card" } },
  { tier: 5,  symbolsRequired: 35,  free: { type: "rolls",  amount: 5,   label: "+5 Rolls" },     premium: { type: "coins",  amount: 750, label: "+750 Coins" } },
  { tier: 6,  symbolsRequired: 45,  free: { type: "symbols",amount: 5,   label: "+5 Symbols" },   premium: { type: "rolls",  amount: 20,  label: "+20 Rolls" } },
  { tier: 7,  symbolsRequired: 55,  free: { type: "coins",  amount: 500, label: "+500 Coins" },   premium: { type: "dice",   id: "silver", label: "🎲 Silver Dice" } },
  { tier: 8,  symbolsRequired: 65,  free: { type: "rolls",  amount: 8,   label: "+8 Rolls" },     premium: { type: "coins",  amount: 1500,label: "+1,500 Coins" } },
  { tier: 9,  symbolsRequired: 75,  free: { type: "symbols",amount: 10,  label: "+10 Symbols" },  premium: { type: "card",   id: ultraCardId, label: "🌟 Ultra-Rare Card" } },
  { tier: 10, symbolsRequired: 100, free: { type: "coins",  amount: 1000,label: "+1,000 Coins" }, premium: { type: "monster",id: "drako", label: "👾 Bonus Monster" } },
];

export const SEASONS: Season[] = [
  {
    id: "frostfall",
    name: "Frostfall",
    emoji: "❄️",
    symbol: "❄️",
    symbolName: "Snowflake",
    tagline: "A frozen wonderland of crystal treasures",
    palette: { bg: "210 60% 92%", accent: "199 90% 55%", glow: "199 100% 75%" },
    miniGameTiles: ["❄️", "⛄", "🧊", "🌨️", "🎿"],
    rareCardId: "season-frost-rare",
    ultraCardId: "season-frost-ultra",
    rewards: buildRewards("season-frost-rare", "season-frost-ultra"),
  },
  {
    id: "emberfest",
    name: "Emberfest",
    emoji: "🔥",
    symbol: "🔥",
    symbolName: "Ember",
    tagline: "Forge your fortune in molten gold",
    palette: { bg: "20 80% 88%", accent: "16 95% 55%", glow: "30 100% 65%" },
    miniGameTiles: ["🔥", "🌋", "💥", "☄️", "🪨"],
    rareCardId: "season-ember-rare",
    ultraCardId: "season-ember-ultra",
    rewards: buildRewards("season-ember-rare", "season-ember-ultra"),
  },
  {
    id: "starbound",
    name: "Starbound",
    emoji: "✨",
    symbol: "⭐",
    symbolName: "Starlight",
    tagline: "Chase the cosmic relics across the void",
    palette: { bg: "260 50% 90%", accent: "270 80% 60%", glow: "280 100% 75%" },
    miniGameTiles: ["⭐", "🌟", "✨", "🌙", "🪐"],
    rareCardId: "season-star-rare",
    ultraCardId: "season-star-ultra",
    rewards: buildRewards("season-star-rare", "season-star-ultra"),
  },
  {
    id: "bloomtide",
    name: "Bloomtide",
    emoji: "🌸",
    symbol: "🌸",
    symbolName: "Petal",
    tagline: "Spring's bounty blooms with rare gifts",
    palette: { bg: "330 60% 92%", accent: "330 80% 60%", glow: "320 100% 78%" },
    miniGameTiles: ["🌸", "🌷", "🌼", "🍃", "🦋"],
    rareCardId: "season-bloom-rare",
    ultraCardId: "season-bloom-ultra",
    rewards: buildRewards("season-bloom-rare", "season-bloom-ultra"),
  },
];

// Epoch chosen as a fixed Monday. Seasons cycle every 3 days.
const SEASON_EPOCH_MS = Date.UTC(2026, 0, 5, 0, 0, 0); // 2026-01-05
const SEASON_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

export function getCurrentSeason(now = Date.now()): { season: Season; index: number; startsAt: number; endsAt: number; seasonInstanceId: string } {
  const elapsed = Math.max(0, now - SEASON_EPOCH_MS);
  const slot = Math.floor(elapsed / SEASON_DURATION_MS);
  const index = slot % SEASONS.length;
  const startsAt = SEASON_EPOCH_MS + slot * SEASON_DURATION_MS;
  const endsAt = startsAt + SEASON_DURATION_MS;
  const season = SEASONS[index];
  // Per-rotation instance id so progress resets each cycle
  const seasonInstanceId = `${season.id}_${slot}`;
  return { season, index, startsAt, endsAt, seasonInstanceId };
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Ending soon";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
