// Shared combat module — used by every battle edge function.
// All combat math lives here so client cannot manipulate it.

export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Action = "attack" | "defend" | "special" | "item";
export type Side = "attacker" | "defender";
export type Element = "fire" | "water" | "earth" | "air" | "neutral";
export type ItemId = "potion" | "bomb" | "shield";

export const RARITY_MULT: Record<Rarity, number> = {
  common: 1.0,
  rare: 1.15,
  epic: 1.35,
  legendary: 1.6,
};

/** Rock-paper-scissors element table.
 * fire > earth > air > water > fire.  Neutral always 1.0x. */
const ELEMENT_STRONG: Record<Element, Element | null> = {
  fire: "earth",
  earth: "air",
  air: "water",
  water: "fire",
  neutral: null,
};

export function elementMult(attacker: Element, defender: Element): number {
  if (attacker === "neutral" || defender === "neutral") return 1;
  if (ELEMENT_STRONG[attacker] === defender) return 1.5;
  if (ELEMENT_STRONG[defender] === attacker) return 0.75;
  return 1;
}

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
  element?: Element;
}

export interface Combatant {
  monster_id: string;
  name: string;
  level: number;
  rarity: Rarity;
  element: Element;
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
  burn_turns: number;
  poison_turns: number;
  stun_turns: number;
  freeze_turns: number;
  shield_turns: number;
  combo_count: number;
}

export function deriveStats(base: BaseStats, level: number, monsterLevelBonus = 0): {
  hp: number; atk: number; def: number; spd: number;
} {
  const m = RARITY_MULT[base.rarity] ?? 1;
  // Each monster_progress level adds 5% to all stats.
  const mp = 1 + monsterLevelBonus * 0.05;
  return {
    hp: Math.round(base.base_hp * (1 + 0.25 * level) * m * mp),
    atk: Math.round(base.base_atk * (1 + 0.20 * level) * m * mp),
    def: Math.round(base.base_def * (1 + 0.15 * level) * m * mp),
    spd: Math.round((base.base_spd + 2 * level) * mp),
  };
}

export function buildCombatant(
  base: BaseStats,
  level: number,
  name: string,
  atkBuffPct = 0,
  currentHp?: number,
  monsterLevelBonus = 0,
): Combatant {
  const s = deriveStats(base, level, monsterLevelBonus);
  return {
    monster_id: base.monster_id,
    name,
    level,
    rarity: base.rarity,
    element: base.element ?? "neutral",
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
    burn_turns: 0,
    poison_turns: 0,
    stun_turns: 0,
    freeze_turns: 0,
    shield_turns: 0,
    combo_count: 0,
  };
}

export function powerRating(c: Combatant): number {
  return Math.round(c.max_hp + c.atk * 4 + c.def * 3 + c.spd * 2);
}

/** AI policy: choose action for an NPC combatant. */
export function aiPick(self: Combatant, wave = 1): Action {
  // Special-move frequency scales with wave: 55% at W1 → ~90% by W15+.
  const specialChance = Math.min(0.9, 0.55 + (wave - 1) * 0.025);
  if (self.special_cd === 0 && self.hp / self.max_hp > 0.30 && Math.random() < specialChance) {
    return "special";
  }
  // Higher waves: defend more aggressively when low HP to stretch fights.
  const defendThreshold = Math.min(0.45, 0.30 + (wave - 1) * 0.01);
  if (self.hp / self.max_hp < defendThreshold && Math.random() < 0.55) return "defend";
  return "attack";
}

export interface TurnEvent {
  side: Side;
  action: Action;
  damage?: number;
  crit?: boolean;
  ignoreDef?: boolean;
  bleed?: boolean;
  burn?: boolean;
  poison?: boolean;
  stun?: boolean;
  freeze?: boolean;
  shielded?: boolean;
  combo?: number;
  elementMult?: number;
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

  // Stun/freeze gating
  if (self.stun_turns > 0) {
    self.stun_turns -= 1;
    self.combo_count = 0;
    return [{ side, action: "defend", stun: true, text: `${self.name} is stunned and cannot act!` }];
  }

  if (action === "defend") {
    self.defending = true;
    self.combo_count = 0;
    return [{ side, action, text: `${self.name} braces for impact.` }];
  }

  // Attack-type action
  const events: TurnEvent[] = [];
  let dmg = 0;
  let mult = 1;
  let ignoreDef = 0;
  let isSpecial = false;
  let isCombo = false;

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
      self.combo_count = 0;
    }
  }

  // Combo: 3 consecutive attacks → next attack is a 1.2x double-hit finisher
  if (action === "attack" && !isSpecial && self.combo_count >= 2) {
    isCombo = true;
    mult = 1.2;
    self.combo_count = 0;
  }

  // Element multiplier
  const elMult = elementMult(self.element, enemy.element);

  if (isSpecial && self.rarity === "rare") {
    // Quick Slash: 2 hits 0.8x with 30% stun on second hit
    for (let i = 0; i < 2; i++) {
      const hit = damageFormula(self.atk * (1 + self.attack_buff_pct / 100), enemy.def, 0.8 * elMult, 0);
      let taken = enemy.defending ? Math.round(hit * 0.5) : hit;
      if (enemy.shield_turns > 0) taken = Math.round(taken * 0.4);
      enemy.hp = Math.max(0, enemy.hp - taken);
      const stun = i === 1 && Math.random() < 0.3;
      if (stun) enemy.stun_turns = Math.max(enemy.stun_turns, 1);
      events.push({
        side, action: "special", damage: taken, stun, elementMult: elMult,
        text: `${self.name} unleashes ${self.signature_name} (hit ${i + 1}) for ${taken}!`,
      });
      if (enemy.hp === 0) break;
    }
    return events;
  }

  dmg = damageFormula(self.atk * (1 + self.attack_buff_pct / 100), enemy.def, mult * elMult, ignoreDef);
  const crit = Math.random() < 0.12;
  if (crit) dmg = Math.round(dmg * 1.5);
  let taken = enemy.defending ? Math.round(dmg * 0.5) : dmg;
  if (enemy.shield_turns > 0) taken = Math.round(taken * 0.4);
  enemy.hp = Math.max(0, enemy.hp - taken);

  // Status effects from specials
  if (isSpecial) {
    if (self.rarity === "common") enemy.burn_turns = Math.max(enemy.burn_turns, 2);
    if (self.rarity === "epic") enemy.freeze_turns = Math.max(enemy.freeze_turns, 2);
    if (self.rarity === "legendary") {
      enemy.bleed_turns = Math.max(enemy.bleed_turns, 2);
      enemy.poison_turns = Math.max(enemy.poison_turns, 3);
    }
  }

  // Combo tracking
  if (action === "attack" && !isSpecial) {
    self.combo_count = Math.min(3, self.combo_count + 1);
  }

  events.push({
    side,
    action: isSpecial ? "special" : "attack",
    damage: taken,
    crit,
    ignoreDef: ignoreDef > 0,
    elementMult: elMult,
    combo: isCombo ? 3 : (action === "attack" ? self.combo_count : undefined),
    bleed: isSpecial && self.rarity === "legendary",
    burn: isSpecial && self.rarity === "common",
    freeze: isSpecial && self.rarity === "epic",
    poison: isSpecial && self.rarity === "legendary",
    text: isSpecial
      ? `${self.name} unleashes ${self.signature_name} for ${taken}${crit ? " CRIT!" : "!"}${elMult > 1 ? " (super effective!)" : elMult < 1 ? " (not very effective)" : ""}`
      : `${self.name}${isCombo ? " combo finisher" : " attacks"} for ${taken}${crit ? " CRIT!" : "."}${elMult > 1 ? " ★" : ""}`,
  });

  // Combo bonus: an extra free strike at 0.7x after the finisher
  if (isCombo && enemy.hp > 0) {
    const bonus = damageFormula(self.atk * (1 + self.attack_buff_pct / 100), enemy.def, 0.7 * elMult, 0);
    let bTaken = enemy.defending ? Math.round(bonus * 0.5) : bonus;
    if (enemy.shield_turns > 0) bTaken = Math.round(bTaken * 0.4);
    enemy.hp = Math.max(0, enemy.hp - bTaken);
    events.push({
      side, action: "attack", damage: bTaken, combo: 3, elementMult: elMult,
      text: `${self.name} chains a bonus strike for ${bTaken}!`,
    });
  }

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
  // Freeze halves effective speed for ordering
  const aSpd = attacker.freeze_turns > 0 ? Math.round(attacker.spd * 0.5) : attacker.spd;
  const dSpd = defender.freeze_turns > 0 ? Math.round(defender.spd * 0.5) : defender.spd;
  const order: Array<{ side: Side; action: Action; self: Combatant; enemy: Combatant }> =
    aSpd >= dSpd
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

  // End-of-round: status ticks + cooldown/shield decay
  for (const c of [attacker, defender]) {
    if (c.hp <= 0) continue;
    const side: Side = c === attacker ? "attacker" : "defender";
    if (c.hp > 0 && c.bleed_turns > 0) {
      const bleedDmg = Math.max(1, Math.round(c.max_hp * 0.05));
      c.hp = Math.max(0, c.hp - bleedDmg);
      c.bleed_turns -= 1;
      events.push({ side, action: "attack", damage: bleedDmg, bleed: true,
        text: `${c.name} bleeds for ${bleedDmg}.` });
    }
    if (c.hp > 0 && c.burn_turns > 0) {
      const burnDmg = Math.max(1, Math.round(c.max_hp * 0.05));
      c.hp = Math.max(0, c.hp - burnDmg);
      c.burn_turns -= 1;
      events.push({ side, action: "attack", damage: burnDmg, burn: true,
        text: `${c.name} burns for ${burnDmg}.` });
    }
    if (c.hp > 0 && c.poison_turns > 0) {
      const psnDmg = Math.max(1, Math.round(c.max_hp * 0.04));
      c.hp = Math.max(0, c.hp - psnDmg);
      c.poison_turns -= 1;
      events.push({ side, action: "attack", damage: psnDmg, poison: true,
        text: `${c.name} is poisoned for ${psnDmg}.` });
    }
    if (c.freeze_turns > 0) c.freeze_turns -= 1;
    if (c.shield_turns > 0) c.shield_turns -= 1;
    if (c.special_cd > 0) c.special_cd -= 1;
  }

  return events;
}

/** Apply a mid-battle item. Returns events. */
export function applyItem(
  side: Side,
  itemId: ItemId,
  self: Combatant,
  enemy: Combatant,
): TurnEvent[] {
  const events: TurnEvent[] = [];
  if (itemId === "potion") {
    const heal = Math.round(self.max_hp * 0.35);
    self.hp = Math.min(self.max_hp, self.hp + heal);
    events.push({ side, action: "item", text: `${self.name} drinks a potion (+${heal} HP).` });
  } else if (itemId === "bomb") {
    const dmg = Math.max(5, Math.round(enemy.max_hp * 0.18));
    enemy.hp = Math.max(0, enemy.hp - dmg);
    events.push({ side, action: "item", damage: dmg, text: `${self.name} throws a bomb for ${dmg}!` });
  } else if (itemId === "shield") {
    self.shield_turns = Math.max(self.shield_turns, 2);
    events.push({ side, action: "item", shielded: true, text: `${self.name} raises a magic shield!` });
  }
  self.combo_count = 0;
  return events;
}

/** Resolve a round where the player uses an item. Enemy still acts. */
export function resolveItemRound(
  attacker: Combatant,
  defender: Combatant,
  itemId: ItemId,
  defenderAction: Action,
): TurnEvent[] {
  const events: TurnEvent[] = [];
  events.push(...applyItem("attacker", itemId, attacker, defender));
  if (defender.hp > 0 && attacker.hp > 0) {
    events.push(...applyAction("defender", defenderAction, defender, attacker));
  }
  // End-of-round ticks (mirror resolveRound)
  for (const c of [attacker, defender]) {
    if (c.hp <= 0) continue;
    const side: Side = c === attacker ? "attacker" : "defender";
    if (c.bleed_turns > 0) {
      const d = Math.max(1, Math.round(c.max_hp * 0.05));
      c.hp = Math.max(0, c.hp - d); c.bleed_turns -= 1;
      events.push({ side, action: "attack", damage: d, bleed: true, text: `${c.name} bleeds for ${d}.` });
    }
    if (c.burn_turns > 0) {
      const d = Math.max(1, Math.round(c.max_hp * 0.05));
      c.hp = Math.max(0, c.hp - d); c.burn_turns -= 1;
      events.push({ side, action: "attack", damage: d, burn: true, text: `${c.name} burns for ${d}.` });
    }
    if (c.poison_turns > 0) {
      const d = Math.max(1, Math.round(c.max_hp * 0.04));
      c.hp = Math.max(0, c.hp - d); c.poison_turns -= 1;
      events.push({ side, action: "attack", damage: d, poison: true, text: `${c.name} is poisoned for ${d}.` });
    }
    if (c.freeze_turns > 0) c.freeze_turns -= 1;
    if (c.shield_turns > 0) c.shield_turns -= 1;
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
  // Per-wave difficulty scaling stacks on top of level/rarity. ~+4%/wave compounding.
  const waveMult = 1 + Math.min(2.0, wave * 0.04); // capped at +200% for very deep runs
  c.max_hp = Math.round(c.max_hp * waveMult);
  c.hp = c.max_hp;
  c.atk = Math.round(c.atk * (1 + Math.min(1.2, wave * 0.035)));
  c.def = Math.round(c.def * (1 + Math.min(1.0, wave * 0.03)));
  c.spd = Math.round(c.spd * (1 + Math.min(0.5, wave * 0.015)));
  if (isBoss) {
    c.max_hp = Math.round(c.max_hp * 1.3);
    c.hp = c.max_hp;
    c.atk = Math.round(c.atk * 1.2);
  }
  return c;
}