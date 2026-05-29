export type PowerUpKind = "arena" | "pvp" | "board";

export interface PowerUpDef {
  id: string;
  kind: PowerUpKind;
  name: string;
  description: string;
  emoji: string;
  coinPrice: number;
  /** Power-ups marked preview are buyable & stockpiled but don't take effect yet. */
  preview?: boolean;
}

/** Mirrors the seed in power_ups_def. Keep in sync. */
export const POWER_UPS: PowerUpDef[] = [
  // Arena
  { id: "arena_iron_skin",  kind: "arena", name: "Iron Skin",       description: "+25% max HP for your next Arena run.",         emoji: "🛡️", coinPrice: 400 },
  { id: "arena_war_cry",    kind: "arena", name: "War Cry",         "+20% attack for your next Arena run." as unknown as string, emoji: "⚔️", coinPrice: 500 } as unknown as PowerUpDef,
  { id: "arena_phoenix",    kind: "arena", name: "Phoenix Feather", description: "Start your Arena run with 3 extra potions.",    emoji: "🔥", coinPrice: 800 },
  { id: "arena_shard_2x",   kind: "arena", name: "Bomb Crate",      description: "Start your Arena run with 3 extra bombs.",      emoji: "💣", coinPrice: 600 },
  // PvP (preview — purchasable, stockpiled, takes full effect in a future update)
  { id: "pvp_first_strike", kind: "pvp", name: "First Strike", description: "Guaranteed first turn in your next PvP match.",  emoji: "⚡", coinPrice: 300, preview: true },
  { id: "pvp_lucky_crit",   kind: "pvp", name: "Lucky Crit",   description: "+30% crit chance for your next PvP match.",      emoji: "🎯", coinPrice: 400, preview: true },
  { id: "pvp_aegis",        kind: "pvp", name: "Aegis Shield", description: "Block the first incoming hit in your next PvP.", emoji: "🛡️", coinPrice: 500, preview: true },
  // Board
  { id: "board_coin_rush",   kind: "board", name: "Coin Rush",    description: "2x coin rewards for your next 5 rolls.", emoji: "🪙", coinPrice: 250, preview: true },
  { id: "board_energy_tonic",kind: "board", name: "Energy Tonic", description: "Instantly refill +100 energy.",          emoji: "🧪", coinPrice: 300 },
];

export const POWER_UPS_BY_KIND = (k: PowerUpKind) => POWER_UPS.filter((p) => p.kind === k);
export const POWER_UP_BY_ID = (id: string) => POWER_UPS.find((p) => p.id === id);

export const BOOST_BUNDLES = [
  { priceId: "boost_bundle_starter", name: "Starter Boost Bundle", price: "$4.99", emoji: "📦", description: "12 boosts across Arena, PvP & Board — ~40% off coin pricing." },
  { priceId: "boost_bundle_big",     name: "Big Boost Bundle",     price: "$9.99", emoji: "🎁", description: "30 boosts across Arena, PvP & Board — ~55% off coin pricing." },
] as const;