// Client-side combat types (mirror of server _shared/combat.ts).
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Action = "attack" | "defend" | "special";
export type Side = "attacker" | "defender";

export interface Combatant {
  monster_id: string;
  name: string;
  level: number;
  rarity: Rarity;
  hp: number;
  max_hp: number;
  atk: number;
  def: number;
  spd: number;
  signature_name: string;
  signature_mult: number;
  special_cd: number;
  defending: boolean;
  attack_buff_pct: number;
  bleed_turns: number;
}

export interface TurnEvent {
  side: Side;
  action: Action;
  damage?: number;
  crit?: boolean;
  ignoreDef?: boolean;
  bleed?: boolean;
  text: string;
}

export interface ArenaRun {
  id: string;
  user_id: string;
  monster_id: string;
  monster_level: number;
  monster_rarity: Rarity;
  current_hp: number;
  max_hp: number;
  wave: number;
  best_wave: number;
  status: "active" | "choosing" | "ended";
  atk_buff_pct: number;
  coins_earned: number;
  shards_earned: number;
}

export interface BattleState {
  id: string;
  attacker_monster: Combatant;
  defender_monster: Combatant;
  attacker_hp: number;
  defender_hp: number;
  attacker_special_cd: number;
  defender_special_cd: number;
  current_turn: number;
  status: "active" | "ended";
  log: TurnEvent[];
  winner: Side | "draw" | null;
}