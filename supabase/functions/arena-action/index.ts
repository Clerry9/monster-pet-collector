import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildCombatant,
  generateGladiator,
  resolveRound,
  resolveItemRound,
  aiPick,
  type Action,
  type BaseStats,
  type Combatant,
  type TurnEvent,
  type ItemId,
} from "../_shared/combat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Op = "start" | "turn" | "choose" | "abandon" | "item";

interface ChoiceCard {
  id: string;
  kind: "heal" | "atk_buff" | "def_buff" | "potion" | "bomb" | "shield" | "card";
  label: string;
  description: string;
  emoji: string;
}

interface RunItem { id: ItemId; count: number; }

interface ArenaRow {
  id: string;
  user_id: string;
  monster_id: string;
  monster_level: number;
  monster_rarity: string;
  current_hp: number;
  max_hp: number;
  wave: number;
  best_wave: number;
  status: string;
  atk_buff_pct: number;
  coins_earned: number;
  shards_earned: number;
  win_streak: number;
  items: RunItem[];
  pending_choices: ChoiceCard[] | null;
}

interface BattleRow {
  id: string;
  user_id: string;
  attacker_monster: Combatant;
  defender_monster: Combatant;
  attacker_hp: number;
  defender_hp: number;
  attacker_special_cd: number;
  defender_special_cd: number;
  current_turn: number;
  status: string;
  log: TurnEvent[];
  winner: string | null;
  arena_run_id: string | null;
}

function rehydrate(c: Combatant, hp: number, cd: number): Combatant {
  // Ensure new status fields exist on rehydrated combatants from older battles.
  return {
    burn_turns: 0, poison_turns: 0, stun_turns: 0, freeze_turns: 0,
    shield_turns: 0, combo_count: 0, element: "neutral",
    ...c, hp, special_cd: cd,
  };
}

function rollChoices(wave: number): ChoiceCard[] {
  const pool: ChoiceCard[] = [
    { id: "heal", kind: "heal", label: "Heal 40%", description: "Restore 40% of your monster's max HP.", emoji: "❤️" },
    { id: "atk", kind: "atk_buff", label: "+12% ATK", description: "Permanent attack buff for the run.", emoji: "⚔️" },
    { id: "def", kind: "def_buff", label: "+10% DEF", description: "Permanent defense buff for the run.", emoji: "🛡️" },
    { id: "potion", kind: "potion", label: "+1 Potion", description: "Heals 35% HP mid-battle when used.", emoji: "🧪" },
    { id: "bomb", kind: "bomb", label: "+1 Bomb", description: "Deals 18% of enemy max HP, ignores defense.", emoji: "💣" },
    { id: "shield", kind: "shield", label: "+1 Shield", description: "Block 60% of damage for 2 turns.", emoji: "🪄" },
  ];
  if (wave >= 3) {
    pool.push({ id: "card", kind: "card", label: "Rare Card Pack", description: "Adds a card flip to your collection.", emoji: "🃏" });
  }
  // Shuffle & take 3
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function streakMult(streak: number): number {
  return Math.min(5, 1 + streak * 0.2);
}

function addItem(items: RunItem[], id: ItemId, count = 1): RunItem[] {
  const next = [...(items ?? [])];
  const idx = next.findIndex((i) => i.id === id);
  if (idx >= 0) next[idx] = { ...next[idx], count: next[idx].count + count };
  else next.push({ id, count });
  return next;
}

function consumeItem(items: RunItem[], id: ItemId): RunItem[] | null {
  const next = [...(items ?? [])];
  const idx = next.findIndex((i) => i.id === id);
  if (idx < 0 || next[idx].count <= 0) return null;
  next[idx] = { ...next[idx], count: next[idx].count - 1 };
  return next.filter((i) => i.count > 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supaUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supaUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const op: Op = body.op;

    // Lazy season rollover on traffic
    try { await admin.rpc("roll_arena_season"); } catch (_) { /* ignore */ }

    // Load combat stat catalog (small, ~9 rows)
    const { data: stats, error: statsErr } = await admin
      .from("monster_stats_def")
      .select("*");
    if (statsErr || !stats) throw new Error("failed to load combat stats");
    const statsMap = new Map<string, BaseStats>(stats.map((s) => [s.monster_id, s as BaseStats]));
    const allStats = stats as BaseStats[];

    // Helper: load monster-progress level for a user/monster
    const getMonsterLevel = async (mid: string): Promise<number> => {
      const { data: mp } = await admin
        .from("monster_progress")
        .select("level")
        .eq("user_id", userId)
        .eq("monster_id", mid)
        .maybeSingle();
      return mp?.level ?? 1;
    };

    // ====== START ======
    if (op === "start") {
      const monsterId = String(body.monster_id ?? "");
      const level = Math.max(1, Math.min(4, Number(body.level ?? 1)));
      const base = statsMap.get(monsterId);
      if (!base) return json({ error: "unknown monster" }, 400);

      // End any existing active run
      await admin.from("arena_runs").update({
        status: "ended", ended_at: new Date().toISOString(),
      }).eq("user_id", userId).in("status", ["active", "choosing"]);

      const monsterLevelBonus = (await getMonsterLevel(monsterId)) - 1;
      const c = buildCombatant(base, level, base.monster_id, 0, undefined, monsterLevelBonus);
      const { data: run, error: runErr } = await admin.from("arena_runs").insert({
        user_id: userId,
        monster_id: monsterId,
        monster_level: level,
        monster_rarity: base.rarity,
        current_hp: c.hp,
        max_hp: c.max_hp,
        wave: 1,
        status: "active",
        win_streak: 0,
        items: [{ id: "potion", count: 1 }] as RunItem[],
        pending_choices: null,
      }).select().single();
      if (runErr || !run) throw runErr ?? new Error("run insert failed");

      const battle = await createBattle(admin, userId, run as ArenaRow, c, allStats);
      return json({ run, battle });
    }

    // All other ops require an active run
    const { data: run } = await admin
      .from("arena_runs").select("*").eq("user_id", userId)
      .in("status", ["active", "choosing"]).order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (!run) return json({ error: "no active run" }, 400);

    // ====== ABANDON ======
    if (op === "abandon") {
      const finalWave = Math.max(run.best_wave, run.wave - 1);
      await admin.from("arena_runs").update({
        status: "ended", ended_at: new Date().toISOString(),
        best_wave: finalWave,
      }).eq("id", run.id);
      await grantRewards(admin, userId, run.coins_earned, run.shards_earned, run.wave * 10);
      if (finalWave > 0) {
        try {
          await admin.rpc("record_arena_run_score", {
            p_user_id: userId,
            p_wave: finalWave,
            p_monster_id: run.monster_id,
          });
        } catch (e) { console.error("record score failed", e); }
      }
      return json({ ended: true, run });
    }

    // ====== CHOOSE (post-battle bonus from pending_choices) ======
    if (op === "choose") {
      if (run.status !== "choosing") return json({ error: "not in choosing state" }, 400);
      const choiceId = String(body.choice_id ?? "");
      const choices: ChoiceCard[] = (run.pending_choices ?? []) as ChoiceCard[];
      const pick = choices.find((c) => c.id === choiceId);
      if (!pick) return json({ error: "invalid choice" }, 400);

      const base = statsMap.get(run.monster_id)!;
      const monsterLevelBonus = (await getMonsterLevel(run.monster_id)) - 1;
      const c = buildCombatant(base, run.monster_level, base.monster_id, run.atk_buff_pct, run.current_hp, monsterLevelBonus);
      let newHp = c.hp;
      let newBuff = run.atk_buff_pct;
      const nextWave = run.wave + 1;
      let newItems: RunItem[] = (run.items ?? []) as RunItem[];
      let cardGranted = false;

      switch (pick.kind) {
        case "heal":
          newHp = Math.min(c.max_hp, Math.round(c.hp + c.max_hp * 0.40));
          break;
        case "atk_buff":
          newBuff = Math.min(150, run.atk_buff_pct + 12);
          break;
        case "def_buff":
          // def buff is encoded by re-deriving with bonus — keep simple: bake into combatant via extra hp
          newHp = Math.min(c.max_hp, c.hp + Math.round(c.max_hp * 0.10));
          newBuff = run.atk_buff_pct; // unchanged
          break;
        case "potion": newItems = addItem(newItems, "potion"); break;
        case "bomb":   newItems = addItem(newItems, "bomb"); break;
        case "shield": newItems = addItem(newItems, "shield"); break;
        case "card":   cardGranted = true; break;
      }

      const next = buildCombatant(base, run.monster_level, base.monster_id, newBuff, newHp, monsterLevelBonus);
      const { data: updated } = await admin.from("arena_runs").update({
        current_hp: newHp,
        atk_buff_pct: newBuff,
        wave: nextWave,
        status: "active",
        items: newItems,
        pending_choices: null,
        updated_at: new Date().toISOString(),
      }).eq("id", run.id).select().single();

      if (cardGranted) {
        // Read-modify-write add 1 pending card flip via service role
        const { data: gs } = await admin
          .from("game_state").select("pending_card_flips")
          .eq("user_id", userId).maybeSingle();
        const cur = gs?.pending_card_flips ?? 0;
        await admin.from("game_state")
          .update({ pending_card_flips: Math.min(cur + 1, 10000) })
          .eq("user_id", userId);
      }

      const battle = await createBattle(admin, userId, updated as ArenaRow, next, allStats);
      return json({ run: updated, battle });
    }

    // ====== ITEM (mid-battle use) ======
    if (op === "item") {
      const itemId = body.item_id as ItemId;
      if (!["potion", "bomb", "shield"].includes(itemId)) return json({ error: "bad item" }, 400);
      const newItems = consumeItem((run.items ?? []) as RunItem[], itemId);
      if (!newItems) return json({ error: "item not available" }, 400);

      const { data: battle } = await admin.from("battles")
        .select("*").eq("arena_run_id", run.id).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!battle) return json({ error: "no active battle" }, 400);
      const b = battle as BattleRow;

      const atk = rehydrate(b.attacker_monster, b.attacker_hp, b.attacker_special_cd);
      const def = rehydrate(b.defender_monster, b.defender_hp, b.defender_special_cd);
      const enemyAction = aiPick(def, run.wave);
      const events = resolveItemRound(atk, def, itemId, enemyAction);
      const log = [...b.log, ...events];
      const winner = atk.hp <= 0 && def.hp <= 0 ? "draw" : def.hp <= 0 ? "attacker" : atk.hp <= 0 ? "defender" : null;

      await admin.from("battles").update({
        attacker_hp: atk.hp, defender_hp: def.hp,
        attacker_special_cd: atk.special_cd, defender_special_cd: def.special_cd,
        attacker_monster: atk, defender_monster: def,
        current_turn: b.current_turn + 1,
        log, winner,
        status: winner ? "ended" : "active",
        ended_at: winner ? new Date().toISOString() : null,
      }).eq("id", b.id);

      const { updatedRun, ended } = await postRound(admin, userId, run, atk, winner, allStats, newItems);
      const { data: updatedBattle } = await admin.from("battles").select("*").eq("id", b.id).single();
      return json({ run: updatedRun, battle: updatedBattle, events, winner, ended });
    }

    // ====== TURN ======
    if (op === "turn") {
      const action: Action = body.action;
      if (!["attack", "defend", "special"].includes(action)) return json({ error: "bad action" }, 400);

      // Find active battle in this run
      const { data: battle } = await admin.from("battles")
        .select("*").eq("arena_run_id", run.id).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!battle) return json({ error: "no active battle" }, 400);
      const b = battle as BattleRow;

      const atk = rehydrate(b.attacker_monster, b.attacker_hp, b.attacker_special_cd);
      const def = rehydrate(b.defender_monster, b.defender_hp, b.defender_special_cd);
      if (action === "special" && atk.special_cd > 0) return json({ error: "special on cooldown" }, 400);

      const enemyAction = aiPick(def, run.wave);
      const events = resolveRound(atk, def, action, enemyAction);
      const log = [...b.log, ...events];
      const winner = atk.hp <= 0 && def.hp <= 0 ? "draw" : def.hp <= 0 ? "attacker" : atk.hp <= 0 ? "defender" : null;

      await admin.from("battles").update({
        attacker_hp: atk.hp, defender_hp: def.hp,
        attacker_special_cd: atk.special_cd, defender_special_cd: def.special_cd,
        attacker_monster: atk, defender_monster: def,
        current_turn: b.current_turn + 1,
        log, winner,
        status: winner ? "ended" : "active",
        ended_at: winner ? new Date().toISOString() : null,
      }).eq("id", b.id);

      const { updatedRun, ended } = await postRound(
        admin, userId, run, atk, winner, allStats, (run.items ?? []) as RunItem[]
      );
      const { data: updatedBattle } = await admin.from("battles").select("*").eq("id", b.id).single();
      return json({ run: updatedRun, battle: updatedBattle, events, winner, ended });
    }

    return json({ error: "unknown op" }, 400);
  } catch (e) {
    console.error("arena-action error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Shared post-round handling for both turn and item ops. */
async function postRound(
  admin: ReturnType<typeof createClient>,
  userId: string,
  run: ArenaRow,
  attacker: Combatant,
  winner: string | null,
  _allStats: BaseStats[],
  items: RunItem[],
) {
  let runUpdate: Record<string, unknown> = {
    current_hp: attacker.hp,
    items,
    updated_at: new Date().toISOString(),
  };
  let ended = false;
  let rewardSummary: { coins: number; shards: number; xp: number } | null = null;

  if (winner === "attacker") {
    const isBoss = run.wave % 5 === 0;
    const streak = (run.win_streak ?? 0) + 1;
    const mult = streakMult(streak);
    const waveCoins = Math.round((run.wave * 5 + (isBoss ? 50 : 0)) * mult);
    const waveShards = Math.round((run.wave * 1.5 + (isBoss ? 25 : 0)) * mult);
    const choices = rollChoices(run.wave);
    runUpdate = {
      ...runUpdate,
      coins_earned: run.coins_earned + waveCoins,
      shards_earned: run.shards_earned + waveShards,
      win_streak: streak,
      pending_choices: choices,
      status: "choosing",
    };
    // Award monster XP for the kill
    const xpGain = 50 + run.wave * 10 + (isBoss ? 100 : 0);
    await admin.rpc("grant_monster_xp", {
      p_user_id: userId,
      p_monster_id: run.monster_id,
      p_xp: xpGain,
    });
  } else if (winner === "defender" || winner === "draw") {
    ended = true;
    runUpdate = {
      ...runUpdate,
      status: "ended",
      best_wave: Math.max(run.best_wave, run.wave - 1),
      win_streak: 0,
      ended_at: new Date().toISOString(),
    };
    rewardSummary = {
      coins: run.coins_earned,
      shards: run.shards_earned,
      xp: run.wave * 10,
    };
  }

  const { data: updatedRun } = await admin.from("arena_runs")
    .update(runUpdate).eq("id", run.id).select().single();

  if (ended && rewardSummary) {
    await grantRewards(admin, userId, rewardSummary.coins, rewardSummary.shards, rewardSummary.xp);
  }
    if (ended) {
      const finalWave = Math.max(run.best_wave, run.wave - 1);
      if (finalWave > 0) {
        try {
          await admin.rpc("record_arena_run_score", {
            p_user_id: userId,
            p_wave: finalWave,
            p_monster_id: run.monster_id,
          });
        } catch (e) { console.error("record score failed", e); }
      }
    }
  return { updatedRun, ended };
}

async function createBattle(
  admin: ReturnType<typeof createClient>,
  userId: string,
  run: ArenaRow,
  attacker: Combatant,
  allStats: BaseStats[],
) {
  const defender = generateGladiator(run.wave, allStats);
  const { data: battle, error } = await admin.from("battles").insert({
    user_id: userId,
    mode: "arena",
    arena_run_id: run.id,
    attacker_monster: attacker,
    defender_monster: defender,
    attacker_hp: attacker.hp,
    defender_hp: defender.hp,
    attacker_special_cd: 0,
    defender_special_cd: 0,
    log: [{ side: "attacker", action: "attack", text: `Wave ${run.wave} — ${attacker.name} vs ${defender.name}!` }],
    status: "active",
  }).select().single();
  if (error) throw error;
  return battle;
}

async function grantRewards(
  admin: ReturnType<typeof createClient>,
  userId: string,
  coins: number,
  shards: number,
  xp: number,
) {
  if (coins === 0 && shards === 0 && xp === 0) return;
  await admin.rpc("grant_battle_rewards", {
    p_user_id: userId, p_coins: coins, p_shards: shards, p_xp: xp,
  });
}