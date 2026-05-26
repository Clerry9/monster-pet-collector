import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useArena } from "@/hooks/useArena";
import { BattleArena } from "@/components/BattleArena";
import { Button } from "@/components/ui/button";
import { MONSTERS } from "@/data/monsters";
import { Monster3D } from "@/components/Monster3D";
import { Trophy, Swords, ArrowLeft } from "lucide-react";

export default function Arena() {
  const { user } = useAuth();
  const arena = useArena();
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [picking, setPicking] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<Array<{ monster_id: string; best_wave: number }>>([]);

  // Load unlocked roster + best wave
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: gs } = await supabase.from("game_state")
        .select("unlocked_monsters,active_monster").eq("user_id", user.id).maybeSingle();
      if (gs) {
        setUnlocked(gs.unlocked_monsters ?? ["gobby"]);
        setChosen(gs.active_monster ?? "gobby");
      }
      const { data: top } = await supabase.from("arena_runs")
        .select("monster_id,best_wave").eq("user_id", user.id).eq("status", "ended")
        .order("best_wave", { ascending: false }).limit(5);
      if (top) setLeaderboard(top);
    })();
  }, [user, arena.lastResult?.ended]);

  // If we hydrated an in-progress run, exit picking mode
  useEffect(() => {
    if (arena.run && arena.battle) setPicking(false);
  }, [arena.run, arena.battle]);

  const startRun = async () => {
    if (!chosen) return;
    await arena.start(chosen, 1);
    setPicking(false);
  };

  const endedThisTurn = arena.lastResult?.ended;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0f2e] via-[#2d1b4e] to-[#0d0824] text-cream font-body">
      <header className="flex items-center justify-between px-4 py-3 border-b-2 border-wood-dark bg-wood/30">
        <Link to="/" className="flex items-center gap-2 text-cream hover:text-gold transition-colors">
          <ArrowLeft size={18} />
          <span className="font-display text-sm">Back</span>
        </Link>
        <h1 className="font-display text-2xl text-gold tracking-wider flex items-center gap-2">
          <Swords size={20} /> Gladiator Arena
        </h1>
        <div className="w-16" />
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {arena.error && (
          <div className="rounded-md bg-candy-red/20 border border-candy-red text-candy-red px-3 py-2 text-sm">
            {arena.error}
          </div>
        )}

        {picking && (
          <motion.section
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-4 border-wood-dark bg-wood/40 p-4 shadow-chunky"
          >
            <h2 className="font-display text-lg text-gold mb-1">Choose your gladiator</h2>
            <p className="text-xs text-cream/70 mb-3">
              Fight escalating waves of enemies. HP carries between waves — heal wisely!
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
              {MONSTERS.filter((m) => unlocked.includes(m.id)).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setChosen(m.id)}
                  className={`p-2 rounded-xl border-2 transition-all ${
                    chosen === m.id
                      ? "border-gold bg-gold/20 scale-105"
                      : "border-wood-dark bg-black/30 hover:border-gold/50"
                  }`}
                >
                  <Monster3D src={m.image} size={70} compact />
                  <div className="text-[10px] font-display mt-1 truncate">{m.name}</div>
                  <div className={`text-[9px] uppercase tracking-wider ${
                    m.rarity === "legendary" ? "text-yellow-300" :
                    m.rarity === "epic" ? "text-purple-300" :
                    m.rarity === "rare" ? "text-sky-300" : "text-cream/60"
                  }`}>{m.rarity}</div>
                </button>
              ))}
            </div>

            <Button
              onClick={startRun}
              disabled={!chosen || arena.loading}
              className="w-full font-display text-base"
            >
              {arena.loading ? "Entering Arena..." : "⚔️ Enter the Colosseum"}
            </Button>

            {leaderboard.length > 0 && (
              <div className="mt-4 pt-3 border-t border-wood-dark">
                <h3 className="font-display text-xs text-gold flex items-center gap-1 mb-2">
                  <Trophy size={12} /> Your Best Runs
                </h3>
                <ul className="text-xs space-y-1">
                  {leaderboard.map((r, i) => (
                    <li key={i} className="flex justify-between text-cream/80">
                      <span>{MONSTERS.find((m) => m.id === r.monster_id)?.name ?? r.monster_id}</span>
                      <span className="font-display text-gold">Wave {r.best_wave}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.section>
        )}

        {!picking && arena.battle && arena.run && (
          <>
            <div className="flex items-center justify-between px-1">
              <div className="font-display text-sm text-gold">
                Wave {arena.run.wave}
                {arena.run.wave % 5 === 0 && <span className="ml-2 text-candy-red animate-pulse">⚠ BOSS</span>}
              </div>
              <div className="text-xs text-cream/80">
                💰 {arena.run.coins_earned} · ✨ {arena.run.shards_earned}
                {arena.run.atk_buff_pct > 0 && <span className="ml-2 text-amber-300">+{arena.run.atk_buff_pct}% ATK</span>}
              </div>
            </div>

            <BattleArena
              battle={arena.battle}
              onAction={(a) => arena.turn(a).catch(() => {})}
              loading={arena.loading}
              recentEvents={arena.lastEvents}
              waveLabel={`WAVE ${arena.run.wave}`}
            />

            <AnimatePresence>
              {arena.run.status === "choosing" && !endedThisTurn && (
                <motion.div
                  key="choosing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border-4 border-gold bg-wood-dark/80 p-4 shadow-chunky"
                >
                  <h3 className="font-display text-base text-gold text-center mb-2">
                    Victory! Wave {arena.run.wave} cleared — choose a boon:
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={() => arena.choose("heal").catch(() => {})} disabled={arena.loading} className="font-display flex-col h-auto py-3">
                      <span className="text-2xl">❤️</span>
                      <span className="text-[10px] mt-1">Heal 30%</span>
                    </Button>
                    <Button onClick={() => arena.choose("buff").catch(() => {})} disabled={arena.loading} className="font-display flex-col h-auto py-3">
                      <span className="text-2xl">⚔️</span>
                      <span className="text-[10px] mt-1">+10% ATK</span>
                    </Button>
                    <Button onClick={() => arena.choose("skip").catch(() => {})} disabled={arena.loading} variant="secondary" className="font-display flex-col h-auto py-3">
                      <span className="text-2xl">⏭️</span>
                      <span className="text-[10px] mt-1">Skip +rewards</span>
                    </Button>
                  </div>
                </motion.div>
              )}

              {endedThisTurn && (
                <motion.div
                  key="ended"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border-4 border-candy-red bg-wood-dark/90 p-6 text-center shadow-chunky"
                >
                  <h3 className="font-display text-2xl text-gold mb-2">Run Ended</h3>
                  <p className="text-cream/90 mb-3">
                    Reached <span className="text-gold font-display">Wave {arena.run.wave}</span>
                  </p>
                  <div className="text-sm space-y-1 mb-4">
                    <div>💰 +{arena.run.coins_earned} coins</div>
                    <div>✨ +{arena.run.shards_earned} shards</div>
                    <div>🍖 +{arena.run.wave * 10} XP</div>
                  </div>
                  <Button onClick={() => { arena.reset(); setPicking(true); }} className="w-full font-display">
                    Return to Lobby
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {arena.run.status === "active" && !endedThisTurn && (
              <button
                onClick={() => { if (confirm("Abandon run? You keep current rewards.")) arena.abandon(); }}
                className="block mx-auto text-[11px] text-cream/50 hover:text-candy-red underline"
              >
                Abandon run
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}