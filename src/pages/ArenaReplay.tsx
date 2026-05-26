import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MONSTERS } from "@/data/monsters";
import type { TurnEvent } from "@/lib/combat";

interface BattleRow {
  id: string;
  current_turn: number;
  winner: string | null;
  log: TurnEvent[];
  attacker_monster: { name: string; monster_id: string; level: number };
  defender_monster: { name: string; monster_id: string; level: number };
  created_at: string;
}

interface RunRow {
  id: string;
  monster_id: string;
  wave: number;
  best_wave: number;
  status: string;
  coins_earned: number;
  shards_earned: number;
  started_at: string;
  ended_at: string | null;
}

function monsterName(id: string): string {
  return MONSTERS.find((m) => m.id === id)?.name ?? id;
}

export default function ArenaReplay() {
  const { user } = useAuth();
  const [run, setRun] = useState<RunRow | null>(null);
  const [battles, setBattles] = useState<BattleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: r } = await supabase.from("arena_runs")
        .select("*").eq("user_id", user.id)
        .order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (r) {
        setRun(r as RunRow);
        const { data: bs } = await supabase.from("battles")
          .select("id,current_turn,winner,log,attacker_monster,defender_monster,created_at")
          .eq("user_id", user.id).eq("arena_run_id", r.id)
          .order("created_at", { ascending: true });
        setBattles((bs as unknown as BattleRow[]) ?? []);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0f2e] via-[#2d1b4e] to-[#0d0824] text-cream font-body">
      <header className="flex items-center justify-between px-4 py-3 border-b-2 border-wood-dark bg-wood/30">
        <Link to="/arena" className="flex items-center gap-2 hover:text-gold transition-colors">
          <ArrowLeft size={18} />
          <span className="font-display text-sm">Arena</span>
        </Link>
        <h1 className="font-display text-lg text-gold tracking-wider flex items-center gap-2">
          <Swords size={18} /> Battle Replay
        </h1>
        <div className="w-16" />
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-3">
        {loading && <div className="text-center text-cream/60 py-10">Loading replay…</div>}

        {!loading && !run && (
          <div className="text-center py-10 text-cream/70">
            No arena runs yet. <Link to="/arena" className="text-gold underline">Start one</Link>.
          </div>
        )}

        {run && (
          <motion.section
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-4 border-wood-dark bg-wood/40 p-4 shadow-chunky"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-display text-base text-gold">
                  {monsterName(run.monster_id)} — reached Wave {run.wave}
                </h2>
                <p className="text-[11px] text-cream/60">
                  {new Date(run.started_at).toLocaleString()}
                  {run.ended_at ? ` • ended ${new Date(run.ended_at).toLocaleTimeString()}` : " • in progress"}
                </p>
              </div>
              <div className="text-right text-xs">
                <div className="flex items-center gap-1 text-gold font-display">
                  <Trophy size={12} /> Best W{run.best_wave}
                </div>
                <div className="text-cream/80">💰 {run.coins_earned} · ✨ {run.shards_earned}</div>
              </div>
            </div>
          </motion.section>
        )}

        {battles.map((b, idx) => {
          const youWon = b.winner === "attacker";
          return (
            <motion.section
              key={b.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-xl border-2 border-wood-dark bg-black/40 p-3"
            >
              <header className="flex items-center justify-between mb-2">
                <div className="font-display text-sm text-gold">
                  Wave {idx + 1} — {b.attacker_monster.name} vs {b.defender_monster.name}
                </div>
                <span className={`text-[11px] font-display px-2 py-0.5 rounded-full ${
                  youWon ? "bg-emerald-600/30 text-emerald-300" :
                  b.winner === "defender" ? "bg-candy-red/30 text-candy-red" : "bg-cream/20 text-cream/70"
                }`}>
                  {youWon ? "VICTORY" : b.winner === "defender" ? "DEFEAT" : b.winner === "draw" ? "DRAW" : "ONGOING"}
                </span>
              </header>
              <ol className="text-[11px] space-y-0.5 text-cream/90 max-h-48 overflow-y-auto pr-1">
                {b.log.map((e, i) => (
                  <li key={i} className={
                    e.crit ? "text-yellow-300" :
                    e.bleed ? "text-rose-400" :
                    e.action === "defend" ? "text-sky-300" :
                    e.action === "special" ? "text-purple-300" : ""
                  }>
                    <span className="text-cream/40 mr-1">T{i + 1}.</span>{e.text}
                  </li>
                ))}
              </ol>
            </motion.section>
          );
        })}

        {run && battles.length === 0 && !loading && (
          <div className="text-center text-cream/60 py-6 text-sm">No battles in this run yet.</div>
        )}

        <div className="pt-4">
          <Link to="/arena">
            <Button className="w-full font-display">Back to Arena</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}