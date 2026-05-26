// Shared combat module — used by every battle edge function.
// All combat math lives here so client cannot manipulate it.

export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Action = "attack" | "defend" | "special";
export type Side = "attacker" | "defender";

export const RARITY_MULT: Record<Rarity, number> = {
  common: 1.0,
  rare: 1.15,
  epic: 1.35,
  legendary: 1.6,
};

export interface BaseStats {
  monster_id: string;
  base_hp: number;
  base_atk: number;
  base_def: number;
  base_spd: number;
  signature_move_name: string;
  signature_move_desc: string;
  signature_multiplier: number;
  rarity: Rarity;
}

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

export function deriveStats(base: BaseStats, level: number): {
  hp: number; atk: number; def: number; spd: number;
} {
  const m = RARITY_MULT[base.rarity] ?? 1;
  return {
    hp: Math.round(base.base_hp * (1 + 0.25 * level) * m),
    atk: Math.round(base.base_atk * (1 + 0.20 * level) * m),
    def: Math.round(base.base_def * (1 + 0.15 * level) * m),
    spd: Math.round(base.base_spd + 2 * level),
  };
}

export function buildCombatant(
  base: BaseStats,
  level: number,
  name: string,
  atkBuffPct = 0,
  currentHp?: number,
): Combatant {
  const s = deriveStats(base, level);
  return {
    monster_id: base.monster_id,
    name,
    level,
    rarity: base.rarity,
    hp: currentHp ?? s.hp,
    max_hp: s.hp,
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    signature_name: base.signature_move_name,
    signature_mult: base.signature_multiplier,
    special_cd: 0,
    defending: false,
    attack_buff_pct: atkBuffPct,
    bleed_turns: 0,
  };
}

export function powerRating(c: Combatant): number {
  return Math.round(c.max_hp + c.atk * 4 + c.def * 3 + c.spd * 2);
}

/** AI policy: choose action for an NPC combatant. */
export function aiPick(self: Combatant): Action {
  if (self.special_cd === 0 && self.hp / self.max_hp > 0.35 && Math.random() < 0.55) {
    return "special";
  }
  if (self.hp / self.max_hp < 0.30 && Math.random() < 0.50) return "defend";
  return "attack";
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

function damageFormula(atk: number, def: number, mult = 1, ignoreDefPct = 0): number {
  const effectiveDef = def * (1 - ignoreDefPct);
  const raw = atk * mult * (100 / (100 + Math.max(0, effectiveDef)));
  const variance = 0.9 + Math.random() * 0.2; // ±10%
  return Math.max(1, Math.round(raw * variance));
}

/** Apply one action. Mutates target/self. Returns event(s). */
function applyAction(
  side: Side,
  action: Action,
  self: Combatant,
  enemy: Combatant,
): TurnEvent[] {
  // Reset defending flag at start of own action (consumed below if defend chosen)
  self.defending = false;

  if (action === "defend") {
    self.defending = true;
    return [{ side, action, text: `${self.name} braces for impact.` }];
  }

  // Attack-type action
  const events: TurnEvent[] = [];
  let dmg = 0;
  let mult = 1;
  let ignoreDef = 0;
  let isSpecial = false;

  if (action === "special") {
    if (self.special_cd > 0) {
      // shouldn't happen — caller validates — fall back to attack
      action = "attack";
    } else {
      isSpecial = true;
      mult = self.signature_mult;
      // Epic signature ignores 50% def; legendary applies bleed
      if (self.rarity === "epic") ignoreDef = 0.5;
      self.special_cd = 3;
    }
  }

  // Common rare = "Quick Slash" = hit twice for 0.8x
  if (action === "attack" && false) { /* placeholder */ }

  if (isSpecial && self.rarity === "rare") {
    // Quick Slash: 2 hits 0.8x
    for (let i = 0; i < 2; i++) {
      const hit = damageFormula(self.atk * (1 + self.attack_buff_pct / 100), enemy.def, 0.8, 0);
      const taken = enemy.defending ? Math.round(hit * 0.5) : hit;
      enemy.hp = Math.max(0, enemy.hp - taken);
      events.push({
        side, action: "special", damage: taken,
        text: `${self.name} unleashes ${self.signature_name} (hit ${i + 1}) for ${taken}!`,
      });
      if (enemy.hp === 0) break;
    }
    return events;
  }

  dmg = damageFormula(self.atk * (1 + self.attack_buff_pct / 100), enemy.def, mult, ignoreDef);
  const crit = Math.random() < 0.12;
  if (crit) dmg = Math.round(dmg * 1.5);
  const taken = enemy.defending ? Math.round(dmg * 0.5) : dmg;
  enemy.hp = Math.max(0, enemy.hp - taken);

  if (isSpecial && self.rarity === "legendary") {
    enemy.bleed_turns = 2;
  }

  events.push({
    side,
    action: isSpecial ? "special" : "attack",
    damage: taken,
    crit,
    ignoreDef: ignoreDef > 0,
    bleed: isSpecial && self.rarity === "legendary",
    text: isSpecial
      ? `${self.name} unleashes ${self.signature_name} for ${taken}${crit ? " CRIT!" : "!"}`
      : `${self.name} attacks for ${taken}${crit ? " CRIT!" : "."}`,
  });
  return events;
}

/** Resolve one full round (both sides act in speed order). */
export function resolveRound(
  attacker: Combatant,
  defender: Combatant,
  attackerAction: Action,
  defenderAction: Action,
): TurnEvent[] {
  const events: TurnEvent[] = [];
  const order: Array<{ side: Side; action: Action; self: Combatant; enemy: Combatant }> =
    attacker.spd >= defender.spd
      ? [
          { side: "attacker", action: attackerAction, self: attacker, enemy: defender },
          { side: "defender", action: defenderAction, self: defender, enemy: attacker },
        ]
      : [
          { side: "defender", action: defenderAction, self: defender, enemy: attacker },
          { side: "attacker", action: attackerAction, self: attacker, enemy: defender },
        ];

  for (const step of order) {
    if (step.self.hp <= 0) continue;
    if (step.enemy.hp <= 0) continue;
    events.push(...applyAction(step.side, step.action, step.self, step.enemy));
  }

  // End-of-round: bleed ticks + cooldown decay
  for (const c of [attacker, defender]) {
    if (c.hp > 0 && c.bleed_turns > 0) {
      const bleedDmg = Math.max(1, Math.round(c.max_hp * 0.05));
      c.hp = Math.max(0, c.hp - bleedDmg);
      c.bleed_turns -= 1;
      events.push({
        side: c === attacker ? "attacker" : "defender",
        action: "attack",
        damage: bleedDmg,
        bleed: true,
        text: `${c.name} bleeds for ${bleedDmg}.`,
      });
    }
    if (c.special_cd > 0) c.special_cd -= 1;
  }

  return events;
}

/** Generate a procedural arena gladiator for a given wave. */
export function generateGladiator(wave: number, allStats: BaseStats[]): Combatant {
  const level = Math.max(1, Math.floor(wave * 0.6) + 1);
  // Rarity weights shift over time
  const weights: Record<Rarity, number> = {
    common: Math.max(1, 8 - Math.floor(wave / 3)),
    rare: 4 + Math.floor(wave / 4),
    epic: 1 + Math.floor(wave / 5),
    legendary: wave >= 10 ? Math.floor(wave / 8) : 0,
  };
  const isBoss = wave % 5 === 0;
  let pool: BaseStats[];
  if (isBoss) {
    pool = allStats.filter((s) => s.rarity === "legendary");
    if (pool.length === 0) pool = allStats.filter((s) => s.rarity === "epic");
  } else {
    const expanded: BaseStats[] = [];
    for (const s of allStats) {
      const w = weights[s.rarity] ?? 1;
      for (let i = 0; i < w; i++) expanded.push(s);
    }
    pool = expanded.length ? expanded : allStats;
  }
  const base = pool[Math.floor(Math.random() * pool.length)];
  const c = buildCombatant(base, isBoss ? level + 2 : level, `Wave ${wave} ${base.monster_id}`);
  if (isBoss) {
    c.hp = Math.round(c.hp * 1.3);
    c.max_hp = c.hp;
    c.atk = Math.round(c.atk * 1.2);
  }
  return c;
}