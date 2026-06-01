import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MONSTERS } from "@/data/monsters";
import { Monster3D } from "./Monster3D";
import {
  STAT_META,
  StatKey,
  getMonsterStats,
  upgradeCost,
  useMonsterUpgrades,
} from "@/lib/monsterStats";
import { toast } from "sonner";

interface Props {
  unlockedMonsters: string[];
  activeMonster: string;
  coins: number;
  monsterTaps: Record<string, number>;
  /** Pass a negative number to spend coins. */
  addCoins: (amount: number) => void;
}

const STATS: StatKey[] = ["hp", "atk", "def", "spd"];

export function MonsterStatsShop({ unlockedMonsters, activeMonster, coins, monsterTaps, addCoins }: Props) {
  const upgrades = useMonsterUpgrades();
  const ownedMonsters = useMemo(
    () => MONSTERS.filter((m) => unlockedMonsters.includes(m.id)),
    [unlockedMonsters],
  );

  const [selectedId, setSelectedId] = useState<string>(
    ownedMonsters.find((m) => m.id === activeMonster)?.id ?? ownedMonsters[0]?.id ?? "gobby",
  );

  const monster = MONSTERS.find((m) => m.id === selectedId) ?? MONSTERS[0];
  const upg = upgrades.get(monster.id);
  const xp = monsterTaps[monster.id] ?? 0;
  const stats = getMonsterStats(monster, xp, upg);
  const [pendingStat, setPendingStat] = useState<StatKey | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const monsterHistory = upgrades.historyFor(monster.id);
  const lastEntry = upgrades.history[upgrades.history.length - 1];

  const confirmBuy = (stat: StatKey) => {
    const cost = upgradeCost(stat, upg[stat]);
    if (!Number.isFinite(coins) || coins == null) {
      toast.error("Coin balance unavailable", {
        description: "We couldn't read your current balance. Refresh and try again.",
      });
      setPendingStat(null);
      return;
    }
    if (coins < cost) {
      toast.error("Not enough coins", {
        description: `Need 🪙 ${cost.toLocaleString()}, but balance is 🪙 ${coins.toLocaleString()}. Earn more on the islands.`,
      });
      setPendingStat(null);
      return;
    }
    addCoins(-cost);
    upgrades.apply(monster.id, stat, cost);
    setPendingStat(null);
    toast.success(`${monster.name} ${STAT_META[stat].label} +${STAT_META[stat].perLevel}!`, {
      description: `Spent 🪙 ${cost.toLocaleString()} · undo available below.`,
    });
  };

  const handleUndo = () => {
    const last = upgrades.undoLast();
    if (!last) {
      toast.error("Nothing to undo");
      return;
    }
    addCoins(last.cost);
    const name = MONSTERS.find((m) => m.id === last.monsterId)?.name ?? "Monster";
    toast.success(`Undid ${name} ${STAT_META[last.stat].label}`, {
      description: `Refunded 🪙 ${last.cost.toLocaleString()}.`,
    });
  };

  const handleExport = () => {
    const data = upgrades.exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stat-forge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = upgrades.importData(String(reader.result ?? ""));
      if (res.ok) {
        toast.success("Backup restored");
      } else {
        toast.error("Import failed", { description: res.error });
      }
    };
    reader.readAsText(file);
  };

  if (ownedMonsters.length === 0) {
    return (
      <div className="rounded-lg border-2 border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
        Unlock a monster first to start upgrading stats.
      </div>
    );
  }

  return (
    <div className="space-y-4" role="region" aria-label="Monster stats shop">
      <header className="flex items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-2xl text-foreground text-glow-purple">Stat Forge</h3>
          <p className="text-[11px] text-muted-foreground">
            Spend 🪙 coins earned from island progress to permanently boost your monsters.
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-lg text-accent leading-none">🪙 {coins.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">your coins</div>
        </div>
      </header>

      {/* Backup + Undo bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-border bg-background/40 p-2">
        <button
          onClick={handleUndo}
          disabled={!lastEntry}
          className="px-2.5 py-1 rounded-full font-display text-[11px] bg-secondary text-secondary-foreground disabled:opacity-40 hover:brightness-110"
          aria-label="Undo last Stat Forge upgrade"
          title={lastEntry ? `Undo ${STAT_META[lastEntry.stat].label} on ${MONSTERS.find((m) => m.id === lastEntry.monsterId)?.name}` : "No upgrades to undo"}
        >
          ↶ Undo last{lastEntry ? ` (+🪙 ${lastEntry.cost.toLocaleString()})` : ""}
        </button>
        <button
          onClick={handleExport}
          className="px-2.5 py-1 rounded-full font-display text-[11px] bg-card border-2 border-border text-foreground hover:bg-muted"
        >
          ⬇ Export backup
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="px-2.5 py-1 rounded-full font-display text-[11px] bg-card border-2 border-border text-foreground hover:bg-muted"
        >
          ⬆ Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Monster picker */}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Pick a monster">
        {ownedMonsters.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={m.id === selectedId}
            onClick={() => setSelectedId(m.id)}
            className={`shrink-0 flex flex-col items-center gap-0.5 rounded-xl border-2 p-2 transition-all focus-visible:outline-2 focus-visible:outline-primary ${
              m.id === selectedId
                ? "border-primary bg-primary/15 scale-105"
                : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <div className="w-12 h-12">
              <Monster3D src={m.image} size={48} compact />
            </div>
            <span className="text-[10px] font-body text-foreground truncate max-w-[56px]">{m.name}</span>
          </button>
        ))}
      </div>

      {/* Selected monster panel */}
      <motion.div
        key={monster.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-primary/50 bg-card/70 p-4"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-20 h-20 shrink-0">
            <Monster3D src={monster.image} size={80} compact />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg text-foreground truncate">{monster.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {monster.rarity}
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1 text-[11px] font-body">
              {STATS.map((s) => (
                <div key={s} className="flex flex-col items-center rounded-md bg-background/40 px-1 py-0.5">
                  <span aria-hidden="true">{STAT_META[s].emoji}</span>
                  <span className="tabular-nums font-bold text-foreground">{stats[s]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STATS.map((s) => {
            const cost = upgradeCost(s, upg[s]);
            const can = coins >= cost;
            const meta = STAT_META[s];
            const isPending = pendingStat === s;
            const nextValue = stats[s] + meta.perLevel;
            return (
              <div
                key={s}
                className={`rounded-lg border-2 p-2 transition-colors ${
                  isPending ? "border-primary bg-primary/10" : "border-border bg-background/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xs text-foreground">
                      {meta.label} <span className="text-muted-foreground">Lv. {upg[s]}</span>
                    </div>
                    <div className="text-[10px] tabular-nums">
                      <span className="text-foreground font-bold">{stats[s]}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="text-primary font-bold">{nextValue}</span>
                      <span className="text-accent ml-1">(+{meta.perLevel})</span>
                    </div>
                  </div>
                  {!isPending ? (
                    <button
                      onClick={() => setPendingStat(s)}
                      disabled={!can}
                      className="shrink-0 px-2.5 py-1 rounded-full font-display text-[11px] bg-accent text-accent-foreground disabled:opacity-40 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-primary"
                      aria-label={`Preview ${meta.label} upgrade for ${cost} coins`}
                    >
                      🪙 {cost}
                    </button>
                  ) : null}
                </div>
                {isPending && (
                  <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
                    <div className="flex-1 text-[10px] text-muted-foreground">
                      Confirm: spend 🪙 {cost.toLocaleString()} → balance 🪙 {(coins - cost).toLocaleString()}
                    </div>
                    <button
                      onClick={() => setPendingStat(null)}
                      className="px-2 py-1 rounded-full font-display text-[10px] bg-muted text-muted-foreground hover:brightness-110"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => confirmBuy(s)}
                      disabled={!can}
                      className="px-2.5 py-1 rounded-full font-display text-[10px] bg-primary text-primary-foreground disabled:opacity-40 hover:brightness-110"
                    >
                      Confirm
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}