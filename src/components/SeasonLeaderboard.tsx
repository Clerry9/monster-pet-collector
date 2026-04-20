import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Trophy, Medal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Season } from "@/data/seasons";
import { getPrestigeTier } from "@/data/levels";

interface LeaderboardEntry {
  user_id: string;
  symbols: number;
  display_name: string | null;
  level: number;
  prestige: number;
}

interface Props {
  season: Season;
  seasonInstanceId: string;
}

const fallbackName = (uid: string) => `Player ${uid.slice(0, 4).toUpperCase()}`;

function PrestigeRibbon({ tier }: { tier: number }) {
  if (tier <= 0) return null;
  return (
    <span
      title={`Prestige ${tier}: +${tier * 5}% coin bonus`}
      className="inline-flex items-center gap-0.5 rounded-sm bg-gradient-to-r from-amber-400 to-yellow-600 border border-amber-700 px-1 py-[1px] text-[8px] font-display text-wood-dark shadow-sm shrink-0"
    >
      <Crown size={8} strokeWidth={3} />
      P{tier}
    </span>
  );
}

export function SeasonLeaderboard({ season, seasonInstanceId }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: progress } = await supabase
        .from("season_progress")
        .select("user_id,symbols")
        .eq("season_id", seasonInstanceId)
        .order("symbols", { ascending: false })
        .limit(20);

      if (cancelled) return;
      const userIds = (progress ?? []).map((p) => p.user_id);
      let names: Record<string, string | null> = {};
      let levels: Record<string, number> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id,display_name,level")
          .in("user_id", userIds);
        names = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.display_name]));
        levels = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.level ?? 1]));
      }
      setRows(
        (progress ?? []).map((p) => {
          const lvl = levels[p.user_id] ?? 1;
          return {
            user_id: p.user_id,
            symbols: p.symbols,
            display_name: names[p.user_id] ?? null,
            level: lvl,
            prestige: getPrestigeTier(lvl),
          };
        })
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [seasonInstanceId]);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const myRow = rows.find((r) => r.user_id === user?.id);
  const myRank = myRow ? rows.findIndex((r) => r.user_id === user?.id) + 1 : null;

  return (
    <div className="panel-wood p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-display text-cream-light text-sm">
          <Trophy className="text-gold" size={16} />
          LEADERBOARD
        </div>
        <span className="text-[10px] font-display text-cream/70">{season.name.toUpperCase()}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-cream-light" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-cream/95 rounded-lg border-2 border-wood-dark p-3 text-wood-dark text-xs text-center font-display">
          Be the first to claim {season.symbol} this season!
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="flex items-end justify-center gap-2 h-32">
            {[1, 0, 2].map((i) => {
              const entry = top3[i];
              if (!entry) return <div key={i} className="w-1/3" />;
              const heights = ["h-20", "h-28", "h-16"];
              const colors = [
                "from-zinc-200 to-zinc-400",
                "from-yellow-200 to-yellow-500",
                "from-orange-300 to-orange-600",
              ];
              const place = i + 1;
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.15, type: "spring" }}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  {place === 1 && <Crown className="text-gold drop-shadow" size={20} />}
                  {place === 2 && <Medal className="text-zinc-300" size={16} />}
                  {place === 3 && <Medal className="text-orange-400" size={16} />}
                  <div className="text-[10px] font-display text-cream-light w-full px-0.5 flex items-center justify-center gap-1 min-w-0">
                    <span className="truncate">{entry.display_name || fallbackName(entry.user_id)}</span>
                    <PrestigeRibbon tier={entry.prestige} />
                  </div>
                  <div
                    className={`w-full rounded-t-lg border-2 border-wood-dark bg-gradient-to-b ${colors[i]} ${heights[i]} flex flex-col items-center justify-center font-display text-wood-dark`}
                  >
                    <span className="text-base">{place}</span>
                    <span className="text-[10px]">{entry.symbols} {season.symbol}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Rest */}
          {rest.length > 0 && (
            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {rest.map((entry, idx) => {
                const isMe = entry.user_id === user?.id;
                return (
                  <div
                    key={entry.user_id}
                    className={`rounded-md border-2 px-2 py-1.5 flex items-center justify-between text-[11px] font-display ${
                      isMe ? "border-gold bg-gradient-to-r from-gold/30 to-gold/10 text-wood-dark" : "border-wood-dark/40 bg-cream/95 text-wood-dark"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="opacity-60 shrink-0">#{idx + 4}</span>
                      <span className="truncate max-w-[100px]">{entry.display_name || fallbackName(entry.user_id)}</span>
                      <PrestigeRibbon tier={entry.prestige} />
                      {isMe && <span className="text-[9px] text-candy-red shrink-0">YOU</span>}
                    </span>
                    <span className="shrink-0">{entry.symbols} {season.symbol}</span>
                  </div>
                );
              })}
            </div>
          )}

          {!myRow && user && (
            <div className="rounded-md border-2 border-dashed border-cream/40 bg-cream/10 p-2 text-[11px] font-display text-cream-light text-center">
              Earn {season.symbol} symbols to appear on the board!
            </div>
          )}
          {!user && (
            <div className="rounded-md border-2 border-dashed border-cream/40 bg-cream/10 p-2 text-[11px] font-display text-cream-light text-center">
              Sign in to compete on the leaderboard
            </div>
          )}
          {myRow && myRank && myRank > 20 && (
            <div className="rounded-md border-2 border-gold bg-gradient-to-r from-gold/30 to-gold/10 px-2 py-1.5 flex items-center justify-between text-[11px] font-display text-wood-dark">
              <span className="flex items-center gap-1.5">#{myRank} YOU <PrestigeRibbon tier={myRow.prestige} /></span>
              <span>{myRow.symbols} {season.symbol}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
