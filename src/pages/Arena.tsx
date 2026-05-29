import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useArena } from "@/hooks/useArena";
import { BattleArena } from "@/components/BattleArena";
import { BattleResultModal } from "@/components/BattleResultModal";
import { BattleChoiceModal } from "@/components/BattleChoiceModal";
import { ArenaLeaderboard } from "@/components/ArenaLeaderboard";
import { ArenaSeasonRewardModal, type SeasonRewardRow } from "@/components/ArenaSeasonRewardModal";
import type { RunChoiceCard, RunItem } from "@/lib/combat";
import { Button } from "@/components/ui/button";
import { MONSTERS } from "@/data/monsters";
import { Monster3D } from "@/components/Monster3D";
import { Trophy, Swords, ArrowLeft } from "lucide-react";
import { GuestAccountGate } from "@/components/GuestAccountGate";

export default function Arena() {
  const { user } = useAuth();
  const arena = useArena();
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [picking, setPicking] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);
  const [tab, setTab] = useState<"play" | "leaderboard">("play");
  const [pendingRewards, setPendingRewards] = useState<SeasonRewardRow[] | null>(null);

  // Guests are blocked from game_state by RLS, so unlocked_monsters is
  // empty and run progress can't persist. Show the account gate before
  // any of the arena UI tries to load.
  if (user?.is_anonymous) {
    return (
      <GuestAccountGate
        feature="the Gladiator Arena"
        description="Arena runs save your wave, items, and season ranking — guest accounts can't sync any of that. Create or link an account to start a run."
      />
    );
  }

  // Load unlocked roster
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: gs } = await supabase.from("game_state")
        .select("unlocked_monsters,active_monster").eq("user_id", user.id).maybeSingle();
      if (gs) {
        setUnlocked(gs.unlocked_monsters ?? ["gobby"]);
        setChosen(gs.active_monster ?? "gobby");
      }
    })();
  }, [user]);

  // Claim any pending season rewards on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("claim_pending_arena_rewards");
      if (data && Array.isArray(data) && data.length > 0) {
        setPendingRewards(data as SeasonRewardRow[]);
      }
    })();
  }, [user]);

  // If we hydrated an in-progress run, exit picking mode
  useEffect(() => {
    if (arena.run && arena.battle) setPicking(false);
  }, [arena.run, arena.battle]);

  const startRun = async () => {
    if (!chosen) return;
    await arena.start(chosen, 1);
    setPicking(false);
    setTab("play");
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
          <div className="flex gap-2">
            <button
              onClick={() => setTab("play")}
              className={`flex-1 py-2 rounded-md font-display text-sm border-2 transition-all ${
                tab === "play" ? "border-gold bg-gold/20 text-gold" : "border-wood-dark bg-black/30 text-cream/70"
              }`}
            >
              ⚔️ Play
            </button>
            <button
              onClick={() => setTab("leaderboard")}
              className={`flex-1 py-2 rounded-md font-display text-sm border-2 transition-all ${
                tab === "leaderboard" ? "border-gold bg-gold/20 text-gold" : "border-wood-dark bg-black/30 text-cream/70"
              }`}
            >
              🏆 Leaderboard
            </button>
          </div>
        )}

        {picking && tab === "leaderboard" && <ArenaLeaderboard />}

        {picking && tab === "play" && (
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
              onUseItem={(id) => arena.useItem(id).catch(() => {})}
              loading={arena.loading}
              recentEvents={arena.lastEvents}
              waveLabel={`WAVE ${arena.run.wave}`}
              items={(arena.run.items ?? []) as RunItem[]}
              winStreak={arena.run.win_streak ?? 0}
            />

            <AnimatePresence>
              {arena.run.status === "choosing" && !endedThisTurn && arena.run.pending_choices && (
                <BattleChoiceModal
                  key="choice"
                  choices={arena.run.pending_choices as RunChoiceCard[]}
                  wave={arena.run.wave}
                  loading={arena.loading}
                  onPick={(id) => arena.choose(id).catch(() => {})}
                />
              )}

              {endedThisTurn && (
                <BattleResultModal
                  key="result"
                  run={arena.run}
                  won={arena.lastResult?.winner === "attacker"}
                  onClose={() => { arena.reset(); setPicking(true); }}
                />
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

        <AnimatePresence>
          {pendingRewards && (
            <ArenaSeasonRewardModal
              key="season-rewards"
              rewards={pendingRewards}
              onClose={() => setPendingRewards(null)}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}