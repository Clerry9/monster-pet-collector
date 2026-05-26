import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildCombatant,
  generateGladiator,
  resolveRound,
  aiPick,
  type Action,
  type BaseStats,
  type Combatant,
  type TurnEvent,
} from "../_shared/combat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Op = "start" | "turn" | "choose" | "abandon";
type WaveChoice = "heal" | "buff" | "skip";

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
  return { ...c, hp, special_cd: cd };
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

    // Load combat stat catalog (small, ~9 rows)
    const { data: stats, error: statsErr } = await admin
      .from("monster_stats_def")
      .select("*");
    if (statsErr || !stats) throw new Error("failed to load combat stats");
    const statsMap = new Map<string, BaseStats>(stats.map((s) => [s.monster_id, s as BaseStats]));
    const allStats = stats as BaseStats[];

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

      const c = buildCombatant(base, level, base.monster_id);
      const { data: run, error: runErr } = await admin.from("arena_runs").insert({
        user_id: userId,
        monster_id: monsterId,
        monster_level: level,
        monster_rarity: base.rarity,
        current_hp: c.hp,
        max_hp: c.max_hp,
        wave: 1,
        status: "active",
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
      await admin.from("arena_runs").update({
        status: "ended", ended_at: new Date().toISOString(),
        best_wave: Math.max(run.best_wave, run.wave - 1),
      }).eq("id", run.id);
      await grantRewards(admin, userId, run.coins_earned, run.shards_earned, run.wave * 10);
      return json({ ended: true, run });
    }

    // ====== CHOOSE (between-wave bonus) ======
    if (op === "choose") {
      if (run.status !== "choosing") return json({ error: "not in choosing state" }, 400);
      const choice: WaveChoice = body.choice;
      const base = statsMap.get(run.monster_id)!;
      const c = buildCombatant(base, run.monster_level, base.monster_id, run.atk_buff_pct, run.current_hp);
      let newHp = c.hp;
      let newBuff = run.atk_buff_pct;
      let nextWave = run.wave + 1;
      let extraCoins = 0, extraShards = 0;

      if (choice === "heal") {
        newHp = Math.min(c.max_hp, Math.round(c.hp + c.max_hp * 0.30));
      } else if (choice === "buff") {
        newBuff = Math.min(100, run.atk_buff_pct + 10);
      } else if (choice === "skip") {
        extraCoins = Math.floor(nextWave * 2);
        extraShards = Math.floor(nextWave * 0.5);
        nextWave += 1;
      } else {
        return json({ error: "bad choice" }, 400);
      }

      const next = buildCombatant(base, run.monster_level, base.monster_id, newBuff, newHp);
      const { data: updated } = await admin.from("arena_runs").update({
        current_hp: newHp,
        atk_buff_pct: newBuff,
        wave: nextWave,
        status: "active",
        coins_earned: run.coins_earned + extraCoins,
        shards_earned: run.shards_earned + extraShards,
        updated_at: new Date().toISOString(),
      }).eq("id", run.id).select().single();

      const battle = await createBattle(admin, userId, updated as ArenaRow, next, allStats);
      return json({ run: updated, battle });
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
        current_turn: b.current_turn + 1,
        log, winner,
        status: winner ? "ended" : "active",
        ended_at: winner ? new Date().toISOString() : null,
      }).eq("id", b.id);

      // Update run HP
      let runUpdate: Partial<ArenaRow> & { updated_at?: string } = {
        current_hp: atk.hp, updated_at: new Date().toISOString(),
      };
      let ended = false;
      let rewardSummary: { coins: number; shards: number; xp: number } | null = null;

      if (winner === "attacker") {
        const isBoss = run.wave % 5 === 0;
        const waveCoins = Math.floor(run.wave * 5) + (isBoss ? 50 : 0);
        const waveShards = Math.floor(run.wave * 1.5) + (isBoss ? 25 : 0);
        runUpdate = {
          ...runUpdate,
          coins_earned: run.coins_earned + waveCoins,
          shards_earned: run.shards_earned + waveShards,
          status: "choosing",
        };
      } else if (winner === "defender" || winner === "draw") {
        ended = true;
        const bestWave = Math.max(run.best_wave, run.wave - (winner === "draw" ? 0 : 1), winner === "attacker" ? run.wave : run.wave - 1);
        runUpdate = {
          ...runUpdate,
          status: "ended",
          best_wave: Math.max(run.best_wave, run.wave - 1),
        };
        (runUpdate as { ended_at?: string }).ended_at = new Date().toISOString();
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