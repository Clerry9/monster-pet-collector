import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Monster3D } from "@/components/Monster3D";
import { MONSTERS } from "@/data/monsters";
import { ArrowLeft, Crown, Swords, Trophy } from "lucide-react";
import { toast } from "sonner";
import type { TurnEvent } from "@/lib/combat";
import { GuestAccountGate } from "@/components/GuestAccountGate";
import { PreBattleBoostBar } from "@/components/PreBattleBoostBar";

interface DefenseTeam {
  user_id: string;
  monster_id: string;
  monster_level: number;
  monster_rarity: string;
  power: number;
  wins: number;
  losses: number;
  rating: number;
}

interface PvpStatus {
  team: DefenseTeam | null;
  recent: Array<{ id: string; winner: string; rewards: { coins: number; shards: number } | null; created_at: string; attacker_monster: { name: string }; defender_monster: { name: string } }>;
  leaderboard: Array<{ user_id: string; monster_id: string; monster_level: number; rating: number; wins: number; losses: number }>;
  today_count: number;
  daily_cap: number;
}

interface MatchResult {
  winner: "attacker" | "defender" | "draw";
  iWon: boolean;
  rewards: { coins: number; shards: number; xp: number };
  opponentLabel: string;
  battle: { log: TurnEvent[]; attacker_monster: { name: string }; defender_monster: { name: string } };
}

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("pvp-match", { body });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
}

export default function PvP() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PvpStatus | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [boosts, setBoosts] = useState<string[]>([]);
  const isGuest = !!user?.is_anonymous;

  const refresh = async () => {
    if (!user) return;
    const s = await call({ op: "status" }) as PvpStatus;
    setStatus(s);
    if (s.team && !chosen) {
      setChosen(s.team.monster_id);
      setLevel(s.team.monster_level);
    }
  };

  useEffect(() => {
    if (!user || isGuest) return;
    (async () => {
      // Ensure a game_state row exists for fresh accounts (e.g. just signed
      // up from /auth). Without this, unlocked_monsters is empty and no
      // monster tiles render, so "Set defense team" stays disabled.
      await (supabase as any).rpc("bootstrap_game_state");
      const { data: gs } = await supabase.from("game_state")
        .select("unlocked_monsters,level,active_monster").eq("user_id", user.id).maybeSingle();
      if (gs) {
        setUnlocked(gs.unlocked_monsters ?? ["gobby"]);
        setLevel(Math.min(gs.level ?? 1, 8));
      }
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isGuest]);

  const setTeam = async () => {
    if (!chosen) return;
    setLoading(true);
    try {
      await call({ op: "set_team", monster_id: chosen, level });
      toast.success("Defense team locked in");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  // Anonymous/guest accounts can't read game_state (RLS blocks
  // is_anonymous=true), so the roster, level, and defense team would all
  // come back empty and the page silently breaks. Gate PvP behind a real
  // account. Placed AFTER all hooks so hook order stays stable across
  // sign-in/sign-out.
  if (isGuest) {
    return (
      <GuestAccountGate
        feature="PvP"
        description="PvP needs a saved roster, rating, and rewards across sessions — guest accounts can't sync those. Create or link an account to enter the arena."
      />
    );
  }

  const findMatch = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await call({ op: "match", power_ups: boosts }) as MatchResult;
      setResult(r);
      toast.success(r.iWon ? `Victory! +${r.rewards.shards} shards` : "Defeated…");
      setBoosts([]);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1b3d] via-[#1e1a4e] to-[#0d0824] text-cream font-body">
      <header className="flex items-center justify-between px-4 py-3 border-b-2 border-wood-dark bg-wood/30">
        <Link to="/" className="flex items-center gap-2 hover:text-gold transition-colors">
          <ArrowLeft size={18} />
          <span className="font-display text-sm">Back</span>
        </Link>
        <h1 className="font-display text-xl text-gold tracking-wider flex items-center gap-2">
          <Crown size={18} /> PvP Coliseum
        </h1>
        <div className="w-16" />
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Defense team */}
        <section className="rounded-2xl border-4 border-wood-dark bg-wood/40 p-4 shadow-chunky">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-base text-gold">Your Defense Team</h2>
            {status?.team && (
              <span className="text-[11px] text-cream/70">
                Power <span className="text-gold font-display">{status.team.power}</span> · Rating {status.team.rating}
              </span>
            )}
          </div>
          <p className="text-[11px] text-cream/60 mb-3">
            This monster defends when other players queue against you.
          </p>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-3">
            {MONSTERS.filter((m) => unlocked.includes(m.id)).map((m) => (
              <button
                key={m.id}
                onClick={() => setChosen(m.id)}
                className={`p-2 rounded-xl border-2 transition-all ${
                  chosen === m.id ? "border-gold bg-gold/20 scale-105" : "border-wood-dark bg-black/30 hover:border-gold/50"
                }`}
              >
                <Monster3D src={m.image} size={56} compact />
                <div className="text-[10px] font-display mt-1 truncate">{m.name}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs text-cream/70">Level</label>
            <input
              type="range" min={1} max={8} value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="flex-1"
            />
            <span className="font-display text-gold text-sm w-8 text-right">{level}</span>
          </div>
          <Button onClick={setTeam} disabled={!chosen || loading} className="w-full font-display">
            {status?.team ? "Update Defense Team" : "Submit Defense Team"}
          </Button>
        </section>

        {/* Find match */}
        <section className="rounded-2xl border-4 border-wood-dark bg-wood/40 p-4 shadow-chunky">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-base text-gold flex items-center gap-1">
              <Swords size={14} /> Queue for Battle
            </h2>
            <span className="text-[11px] text-cream/70">
              {status?.today_count ?? 0} / {status?.daily_cap ?? 10} today
            </span>
          </div>
          <p className="text-[11px] text-cream/60 mb-3">
            Matched to a rival within ±15% power. Win 5–15 shards, lose 2.
          </p>
          <div className="mb-3">
            <PreBattleBoostBar kind="pvp" max={2} onChange={setBoosts} />
          </div>
          <Button
            onClick={findMatch}
            disabled={loading || !status?.team || (status?.today_count ?? 0) >= (status?.daily_cap ?? 10)}
            className="w-full font-display"
          >
            {loading ? "Matching…" : "⚔️ Find Match"}
          </Button>
        </section>

        {/* Match result */}
        <AnimatePresence>
          {result && (
            <motion.section
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className={`rounded-2xl border-4 ${result.iWon ? "border-gold" : "border-candy-red"} bg-wood-dark/80 p-4 shadow-chunky`}
            >
              <h3 className={`font-display text-lg text-center mb-1 ${result.iWon ? "text-gold" : "text-candy-red"}`}>
                {result.iWon ? "VICTORY" : result.winner === "defender" ? "DEFEAT" : "DRAW"}
              </h3>
              <p className="text-center text-xs text-cream/80 mb-3">
                vs {result.opponentLabel} · {result.battle.defender_monster.name}
              </p>
              <div className="text-xs text-center mb-3">
                💰 +{result.rewards.coins} · ✨ +{result.rewards.shards} · 🍖 +{result.rewards.xp} XP
              </div>
              <ol className="text-[11px] space-y-0.5 bg-black/40 rounded p-2 max-h-40 overflow-y-auto">
                {result.battle.log.map((e, i) => (
                  <li key={i} className={
                    e.crit ? "text-yellow-300" :
                    e.bleed ? "text-rose-400" :
                    e.action === "special" ? "text-purple-300" : "text-cream/85"
                  }>{e.text}</li>
                ))}
              </ol>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Leaderboard */}
        {status && status.leaderboard.length > 0 && (
          <section className="rounded-2xl border-4 border-wood-dark bg-wood/40 p-4 shadow-chunky">
            <h2 className="font-display text-base text-gold flex items-center gap-1 mb-2">
              <Trophy size={14} /> Top Rivals
            </h2>
            <ol className="text-xs space-y-1">
              {status.leaderboard.map((row, i) => (
                <li key={row.user_id} className={`flex justify-between px-2 py-1 rounded ${row.user_id === user?.id ? "bg-gold/20 text-gold" : "text-cream/80"}`}>
                  <span>#{i + 1} {MONSTERS.find((m) => m.id === row.monster_id)?.name ?? row.monster_id} Lv.{row.monster_level}</span>
                  <span className="font-display">⭐ {row.rating} · {row.wins}W/{row.losses}L</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Recent fights */}
        {status && status.recent.length > 0 && (
          <section className="rounded-2xl border-4 border-wood-dark bg-wood/40 p-4 shadow-chunky">
            <h2 className="font-display text-base text-gold mb-2">Recent Fights</h2>
            <ul className="text-xs space-y-1">
              {status.recent.map((b) => (
                <li key={b.id} className="flex justify-between text-cream/80">
                  <span>{b.attacker_monster.name} vs {b.defender_monster.name}</span>
                  <span className={b.winner === "attacker" ? "text-emerald-300" : b.winner === "defender" ? "text-candy-red" : "text-cream/60"}>
                    {b.winner === "attacker" ? "WIN" : b.winner === "defender" ? "LOSS" : "DRAW"}
                    {b.rewards ? ` · +${b.rewards.shards}✨` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}