import { createClient } from "npm:@supabase/supabase-js@2";
import {
  aiPick,
  buildCombatant,
  powerRating,
  resolveRound,
  type BaseStats,
  type Combatant,
  type TurnEvent,
} from "../_shared/combat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Op = "set_team" | "match" | "status";

const PVP_DAILY_CAP = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const userClient = createClient(supaUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData } = await userClient.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supaUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const op: Op = body.op;

    const { data: stats, error: statsErr } = await admin.from("monster_stats_def").select("*");
    if (statsErr || !stats) throw new Error("failed to load combat stats");
    const statsMap = new Map<string, BaseStats>(stats.map((s) => [s.monster_id, s as BaseStats]));

    if (op === "set_team") {
      const monsterId = String(body.monster_id ?? "");
      const level = Math.max(1, Math.min(8, Number(body.level ?? 1)));
      const base = statsMap.get(monsterId);
      if (!base) return json({ error: "unknown monster" }, 400);

      // Verify ownership
      const { data: gs } = await admin.from("game_state")
        .select("unlocked_monsters,level").eq("user_id", userId).maybeSingle();
      const unlocked: string[] = gs?.unlocked_monsters ?? [];
      if (!unlocked.includes(monsterId)) return json({ error: "monster not unlocked" }, 403);
      const cappedLevel = Math.max(1, Math.min(level, Math.max(1, gs?.level ?? 1)));

      const c = buildCombatant(base, cappedLevel, base.monster_id);
      const power = powerRating(c);

      const { data: team, error } = await admin.from("pvp_defense_teams").upsert({
        user_id: userId,
        monster_id: monsterId,
        monster_level: cappedLevel,
        monster_rarity: base.rarity,
        power,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).select().single();
      if (error) throw error;
      return json({ team });
    }

    if (op === "status") {
      const [{ data: team }, { data: recent }, { data: top }] = await Promise.all([
        admin.from("pvp_defense_teams").select("*").eq("user_id", userId).maybeSingle(),
        admin.from("battles").select("id,winner,attacker_monster,defender_monster,rewards,created_at,log")
          .eq("user_id", userId).eq("mode", "pvp").order("created_at", { ascending: false }).limit(10),
        admin.from("pvp_defense_teams").select("user_id,monster_id,monster_level,rating,wins,losses")
          .order("rating", { ascending: false }).limit(10),
      ]);
      // Today's fight count
      const since = new Date(); since.setUTCHours(0, 0, 0, 0);
      const { count: todayCount } = await admin.from("battles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("mode", "pvp").gte("created_at", since.toISOString());
      return json({ team, recent, leaderboard: top, today_count: todayCount ?? 0, daily_cap: PVP_DAILY_CAP });
    }

    if (op === "match") {
      // Validate user has a team
      const { data: myTeam } = await admin.from("pvp_defense_teams")
        .select("*").eq("user_id", userId).maybeSingle();
      if (!myTeam) return json({ error: "set a defense team first" }, 400);

      // Daily cap
      const since = new Date(); since.setUTCHours(0, 0, 0, 0);
      const { count: todayCount } = await admin.from("battles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("mode", "pvp").gte("created_at", since.toISOString());
      if ((todayCount ?? 0) >= PVP_DAILY_CAP) {
        return json({ error: "daily PvP cap reached. Come back tomorrow!" }, 429);
      }

      // Find opponent in ±15% power band, excluding self
      const band = Math.max(50, Math.round(myTeam.power * 0.15));
      const { data: candidates } = await admin.from("pvp_defense_teams")
        .select("*")
        .neq("user_id", userId)
        .gte("power", myTeam.power - band)
        .lte("power", myTeam.power + band)
        .limit(20);

      let opponentTeam = candidates && candidates.length
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : null;

      // Fall back to a synthetic ghost opponent at user's power
      const myBase = statsMap.get(myTeam.monster_id);
      if (!myBase) return json({ error: "your monster stats missing" }, 500);
      const mine = buildCombatant(myBase, myTeam.monster_level, myBase.monster_id);

      let theirs: Combatant;
      let opponentUserId: string | null = null;
      let opponentLabel: string;
      if (opponentTeam) {
        const oppBase = statsMap.get(opponentTeam.monster_id);
        if (!oppBase) return json({ error: "opponent stats missing" }, 500);
        theirs = buildCombatant(oppBase, opponentTeam.monster_level, `${oppBase.monster_id}`);
        opponentUserId = opponentTeam.user_id;
        opponentLabel = `Rival ${opponentTeam.user_id.slice(0, 6)}`;
      } else {
        // Ghost: random monster scaled to match my power
        const pool = Array.from(statsMap.values());
        const ghostBase = pool[Math.floor(Math.random() * pool.length)];
        theirs = buildCombatant(ghostBase, myTeam.monster_level, `Ghost ${ghostBase.monster_id}`);
        opponentLabel = `Ghost Champion`;
      }

      // Simulate up to 40 rounds
      const log: TurnEvent[] = [
        { side: "attacker", action: "attack", text: `PvP: ${mine.name} vs ${theirs.name}!` },
      ];
      let round = 0;
      while (mine.hp > 0 && theirs.hp > 0 && round < 40) {
        const myAct = aiPick(mine, 5); // virtual wave 5 — moderate aggressiveness
        const oppAct = aiPick(theirs, 5);
        const events = resolveRound(mine, theirs, myAct, oppAct);
        log.push(...events);
        round++;
      }
      const winner: "attacker" | "defender" | "draw" =
        mine.hp <= 0 && theirs.hp <= 0 ? "draw" : theirs.hp <= 0 ? "attacker" : mine.hp <= 0 ? "defender" : "draw";
      const iWon = winner === "attacker";

      const shards = iWon ? 5 + Math.floor(Math.random() * 11) : 2; // 5-15 win / 2 loss
      const coins = iWon ? 30 + Math.floor(Math.random() * 30) : 5;
      const rewards = { coins, shards, xp: iWon ? 25 : 5 };

      // Persist battle
      const { data: battleRow } = await admin.from("battles").insert({
        user_id: userId,
        mode: "pvp",
        attacker_monster: mine,
        defender_monster: theirs,
        attacker_hp: mine.hp,
        defender_hp: theirs.hp,
        attacker_special_cd: mine.special_cd,
        defender_special_cd: theirs.special_cd,
        current_turn: round,
        status: "ended",
        winner,
        log,
        rewards,
        ended_at: new Date().toISOString(),
      }).select().single();

      // Grant currency to player
      await admin.rpc("grant_battle_rewards", {
        p_user_id: userId, p_coins: rewards.coins, p_shards: rewards.shards, p_xp: rewards.xp,
      });

      // Update ratings
      const delta = iWon ? 18 : winner === "draw" ? 0 : -12;
      await admin.from("pvp_defense_teams").update({
        wins: myTeam.wins + (iWon ? 1 : 0),
        losses: myTeam.losses + (winner === "defender" ? 1 : 0),
        rating: Math.max(0, myTeam.rating + delta),
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      if (opponentTeam && opponentUserId) {
        await admin.from("pvp_defense_teams").update({
          wins: opponentTeam.wins + (winner === "defender" ? 1 : 0),
          losses: opponentTeam.losses + (iWon ? 1 : 0),
          rating: Math.max(0, opponentTeam.rating - delta),
          updated_at: new Date().toISOString(),
        }).eq("user_id", opponentUserId);
      }

      return json({ battle: battleRow, winner, iWon, rewards, opponentLabel });
    }

    return json({ error: "unknown op" }, 400);
  } catch (e) {
    console.error("pvp-match error", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}