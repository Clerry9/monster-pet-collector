import { Trophy, Coins, Dice5, Zap, ArrowLeft, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useGameState } from "@/hooks/useGameState";
import { useAchievements } from "@/hooks/useAchievements";
import { useDailyStreak } from "@/hooks/useDailyStreak";

function rewardIcon(kind: string) {
  if (kind === "coins") return <Coins size={14} className="text-amber-400" />;
  if (kind === "rolls") return <Dice5 size={14} className="text-blue-400" />;
  if (kind === "energy") return <Zap size={14} className="text-yellow-400" />;
  return null;
}

const Achievements = () => {
  const { state, totalSteps, level, cardsCollected, coins } = useGameStateForStats();
  const { row: streak } = useDailyStreak();
  const { list, claim, unclaimedCount } = useAchievements({
    totalRolls: totalSteps,
    level,
    uniqueCards: cardsCollected,
    bestStreak: streak?.best_streak ?? 0,
    lifetimeCoins: coins, // approximation; could be replaced with a true lifetime counter
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-card p-4 max-w-3xl mx-auto">
      <header className="flex items-center gap-3 mb-6 pt-4">
        <Link
          to="/"
          className="p-2 rounded-lg bg-card border border-border hover:bg-card/80"
          aria-label="Back to game"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Trophy className="text-amber-400" size={24} /> Achievements
          </h1>
          <p className="text-sm text-muted-foreground">
            {unclaimedCount > 0
              ? `${unclaimedCount} ready to claim!`
              : `${list.filter((a) => a.claimed).length} / ${list.length} unlocked`}
          </p>
        </div>
      </header>

      <div className="grid gap-3">
        {list.map((a) => {
          const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
          return (
            <div
              key={a.code}
              className={`p-4 rounded-xl border ${
                a.claimed
                  ? "bg-card/40 border-border/50 opacity-70"
                  : a.completed
                  ? "bg-gradient-to-r from-primary/10 to-accent/10 border-primary/40 shadow-glow"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    a.claimed
                      ? "bg-primary/20"
                      : a.completed
                      ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {a.completed ? <Trophy size={18} /> : <Lock size={16} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold font-display truncate">{a.title}</h3>
                    <div className="flex items-center gap-1 text-xs whitespace-nowrap">
                      {rewardIcon(a.reward_kind)}
                      <span className="font-bold">+{a.reward_amount}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{a.description}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums whitespace-nowrap">
                      {Math.min(a.progress, a.target).toLocaleString()} / {a.target.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              {a.completed && !a.claimed && (
                <button
                  onClick={() => claim(a.code)}
                  className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-sm hover:scale-[1.01] active:scale-[0.99] transition-transform"
                >
                  Claim reward
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Read just the bits of game state we need without breaking encapsulation.
function useGameStateForStats() {
  const gs = useGameState();
  return {
    state: gs,
    totalSteps: gs.totalSteps ?? 0,
    level: gs.level,
    cardsCollected: gs.collectedCards?.length ?? 0,
    coins: gs.coins,
  };
}

export default Achievements;