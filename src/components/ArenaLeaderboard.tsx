import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MONSTERS } from "@/data/monsters";
import { Trophy, Crown } from "lucide-react";

interface Row {
  rank: number;
  user_id: string;
  display_name: string;
  level: number;
  best_wave: number;
  best_monster_id: string | null;
  runs_count: number;
}

interface MyRank {
  rank: number;
  best_wave: number;
  runs_count: number;
  season_id: string;
  ends_at: string;
}

function rewardFor(rank: number): { coins: number; shards: number } | null {
  if (rank === 1) return { coins: 5000, shards: 500 };
  if (rank <= 3) return { coins: 2500, shards: 250 };
  if (rank <= 10) return { coins: 1000, shards: 100 };
  if (rank <= 50) return { coins: 300, shards: 30 };
  if (rank <= 100) return { coins: 100, shards: 10 };
  return null;
}

function useCountdown(endsAt: string | undefined): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return "";
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "Resetting…";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ArenaLeaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [mine, setMine] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [lb, mr] = await Promise.all([
        supabase.rpc("get_arena_leaderboard", { _limit: 100 }),
        user ? supabase.rpc("get_my_arena_rank") : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      setRows((lb.data as Row[]) ?? []);
      const m = (mr as { data: MyRank[] | null }).data;
      setMine(m && m.length > 0 ? m[0] : null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const countdown = useCountdown(mine?.ends_at ?? rows[0] ? (mine?.ends_at ?? undefined) : undefined);
  const inTop100 = mine && rows.some((r) => r.user_id === user?.id);

  return (
    <section className="rounded-2xl border-4 border-wood-dark bg-wood/40 p-4 shadow-chunky">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg text-gold flex items-center gap-2">
          <Trophy size={18} /> Global Leaderboard
        </h2>
        {mine?.ends_at && (
          <span className="text-[11px] text-cream/70">Resets in <span className="text-gold font-display">{countdown}</span></span>
        )}
      </div>

      {loading ? (
        <div className="text-center text-xs text-cream/60 py-6">Loading rankings…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-xs text-cream/60 py-6">
          No scores yet this week. Be the first to climb!
        </div>
      ) : (
        <ol className="space-y-1 max-h-[440px] overflow-y-auto pr-1">
          {rows.map((r) => {
            const reward = rewardFor(r.rank);
            const isMe = r.user_id === user?.id;
            const monster = MONSTERS.find((m) => m.id === r.best_monster_id);
            return (
              <li
                key={r.user_id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md border ${
                  isMe ? "border-gold bg-gold/15" : "border-wood-dark/50 bg-black/20"
                }`}
              >
                <span className={`w-7 text-center font-display text-sm ${
                  r.rank === 1 ? "text-yellow-300" :
                  r.rank === 2 ? "text-slate-200" :
                  r.rank === 3 ? "text-amber-500" : "text-cream/60"
                }`}>
                  {r.rank <= 3 ? <Crown size={14} className="inline" /> : null} {r.rank}
                </span>
                {monster && (
                  <img src={monster.image} alt="" className="w-6 h-6 rounded" loading="lazy" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate font-display text-cream">
                    {r.display_name} {isMe && <span className="text-gold">(you)</span>}
                  </div>
                  <div className="text-[10px] text-cream/60">Lv {r.level} · {r.runs_count} runs</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm text-gold">W{r.best_wave}</div>
                  {reward && (
                    <div className="text-[9px] text-cream/60">
                      🪙{reward.coins} · ✨{reward.shards}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {mine && !inTop100 && (
        <div className="mt-3 pt-3 border-t border-wood-dark flex items-center gap-2 px-2 py-1.5 rounded-md border border-gold bg-gold/15">
          <span className="w-7 text-center font-display text-sm text-cream/80">#{mine.rank}</span>
          <div className="flex-1 text-xs font-display text-cream">You</div>
          <div className="font-display text-sm text-gold">W{mine.best_wave}</div>
        </div>
      )}
    </section>
  );
}