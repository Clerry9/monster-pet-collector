import { MonsterStats, STAT_META } from "@/lib/monsterStats";

interface Props {
  stats: MonsterStats;
  compact?: boolean;
  className?: string;
}

/**
 * Compact stat-line display for monster cards & pre-battle screens.
 */
export function MonsterStatsCard({ stats, compact, className = "" }: Props) {
  const entries: Array<[keyof MonsterStats, number]> = [
    ["hp", stats.hp],
    ["atk", stats.atk],
    ["def", stats.def],
    ["spd", stats.spd],
  ];
  return (
    <div
      className={`grid grid-cols-4 gap-1 ${compact ? "text-xs" : "text-sm"} font-body ${className}`}
      role="list"
      aria-label="Monster stats"
    >
      {entries.map(([k, v]) => (
        <div
          key={k}
          role="listitem"
          className="flex flex-col items-center rounded-md bg-background/40 px-1 py-0.5"
          title={STAT_META[k].label}
        >
          <span aria-hidden="true">{STAT_META[k].emoji}</span>
          <span className="tabular-nums font-bold text-foreground">{v}</span>
        </div>
      ))}
    </div>
  );
}