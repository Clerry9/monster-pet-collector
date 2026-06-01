import { AnimatePresence, motion } from "framer-motion";
import { MONSTERS, Monster, getMonsterEvolution, BIOMES } from "@/data/monsters";
import { Lock, Sparkles, Check, Combine } from "lucide-react";
import { useState } from "react";
import { Monster3D } from "./Monster3D";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoinRewardGallery } from "./CoinRewardGallery";
import { useBonusInventory } from "@/hooks/useBonusInventory";
import { SUMMON_COST, MERGE_COPIES_REQUIRED, type SummonRarity } from "@/lib/summon";
import { toast } from "sonner";
import { MonsterStatsShop } from "./MonsterStatsShop";
import { MonsterStatsCard } from "./MonsterStatsCard";
import { getMonsterStats, useMonsterUpgrades } from "@/lib/monsterStats";

interface Props {
  unlockedMonsters: string[];
  activeMonster: string;
  coins: number;
  monsterTaps: Record<string, number>;
  onSelect: (id: string) => void;
  onUnlock: (id: string) => void;
  /** Free unlock used by the summon flow when a brand-new monster is summoned. */
  onGrantMonster?: (id: string) => void;
  /** Spend or grant coins (negative to spend). Required for the Upgrades tab. */
  addCoins?: (amount: number) => void;
}

const rarityColors: Record<string, string> = {
  common: "border-muted-foreground/30",
  rare: "border-primary box-glow-green",
  epic: "border-secondary box-glow-purple",
  legendary: "border-accent box-glow-orange",
};

const rarityBadge: Record<string, string> = {
  common: "bg-muted text-muted-foreground",
  rare: "bg-primary/20 text-primary",
  epic: "bg-secondary/20 text-secondary",
  legendary: "bg-accent/20 text-accent",
};

export function MonsterCollection({ unlockedMonsters, activeMonster, coins, monsterTaps, onSelect, onUnlock, onGrantMonster, addCoins }: Props) {
  const isUnlocked = (m: Monster) => unlockedMonsters.includes(m.id);
  const inv = useBonusInventory();
  const upgrades = useMonsterUpgrades();
  const [summoned, setSummoned] = useState<Monster | null>(null);

  const handleSummon = (rarity: SummonRarity) => {
    const cost = SUMMON_COST[rarity];
    if (inv.shards < cost) {
      toast.error("NOT ENOUGH SHARDS", {
        description: `${rarity.toUpperCase()} summon needs ${cost}💠. You have ${inv.shards}.`,
      });
      return;
    }
    const monster = inv.summon(rarity);
    if (!monster) return;
    if (!unlockedMonsters.includes(monster.id) && onGrantMonster) {
      onGrantMonster(monster.id);
      toast.success(`✨ Summoned ${monster.name}!`, {
        description: `New ${monster.rarity} monster added to your collection.`,
      });
    } else {
      toast.success(`+1 ${monster.name}`, {
        description: "Spare copy — merge 3 to level up!",
      });
    }
    setSummoned(monster);
    setTimeout(() => setSummoned(null), 2200);
  };

  const handleMerge = (monsterId: string, monsterName: string) => {
    const newLevel = inv.merge(monsterId);
    if (newLevel == null) return;
    toast.success(`🌟 ${monsterName} → Lv. ${newLevel}!`, {
      description: "Evolution complete.",
    });
  };

  const totalOwned = MONSTERS.filter(isUnlocked).length;
  const overallPct = Math.round((totalOwned / MONSTERS.length) * 100);
  const [showChecklist, setShowChecklist] = useState(false);

  const RARITIES: Array<Monster["rarity"]> = ["common", "rare", "epic", "legendary"];
  const rarityCounts = RARITIES.map((r) => {
    const list = MONSTERS.filter((m) => m.rarity === r);
    return { rarity: r, owned: list.filter(isUnlocked).length, total: list.length };
  }).filter((x) => x.total > 0);

  return (
    <div className="w-full" role="region" aria-label="Collection">
      <Tabs defaultValue="monsters" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="monsters">Monsters</TabsTrigger>
          <TabsTrigger value="upgrades">Upgrades</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>
        <TabsContent value="monsters">
      {/* Phase 2 — Summon altar */}
      <section className="mb-4 rounded-xl border-2 border-primary/50 bg-gradient-to-b from-card to-card/40 p-3" aria-label="Summon altar">
        <header className="mb-2 flex items-center justify-between">
          <h4 className="font-display text-base text-foreground flex items-center gap-1.5">
            <Sparkles size={16} className="text-cyan-400" />
            Summon Altar
          </h4>
          <span className="text-[11px] font-body text-muted-foreground">
            💠 {inv.shards.toLocaleString()} shards
          </span>
        </header>
        <div className="grid grid-cols-4 gap-1.5">
          {(["common", "rare", "epic", "legendary"] as SummonRarity[]).map((r) => {
            const cost = SUMMON_COST[r];
            const can = inv.shards >= cost;
            return (
              <button
                key={r}
                onClick={() => handleSummon(r)}
                disabled={!can}
                className={`flex flex-col items-center gap-0.5 rounded-lg border-2 p-2 text-[10px] font-bold uppercase transition-all focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40 disabled:cursor-not-allowed ${rarityColors[r] ?? "border-border"} ${can ? "hover:scale-105 active:scale-95 bg-card" : "bg-card/50"}`}
                aria-label={`Summon a random ${r} monster for ${cost} shards`}
              >
                <span className={`px-1.5 py-0.5 rounded-full ${rarityBadge[r]}`}>{r}</span>
                <span className="text-foreground tabular-nums">💠 {cost}</span>
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {summoned && (
            <motion.div
              key={summoned.id + Date.now()}
              initial={{ opacity: 0, scale: 0.4, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: -20 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="mt-3 flex items-center gap-3 rounded-lg border-2 border-primary bg-primary/10 p-2"
            >
              <div className="w-14 h-14">
                <Monster3D src={summoned.image} size={56} compact />
              </div>
              <div className="flex-1">
                <div className="font-display text-sm text-foreground">You summoned {summoned.name}!</div>
                <div className="text-[10px] text-muted-foreground">{summoned.rarity} · starts at Level 0</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="mb-3 flex items-end justify-between gap-2">
        <h3 className="font-display text-2xl text-foreground text-glow-purple">
          Monster Album
        </h3>
        <div className="text-right">
          <div className="font-display text-lg text-accent leading-none">{overallPct}%</div>
          <div className="text-[10px] text-muted-foreground font-body">
            {totalOwned} / {MONSTERS.length} owned
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-lg border-2 border-border bg-card/50 p-3">
        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${overallPct}%` }} aria-hidden />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-body text-muted-foreground">
          {rarityCounts.map((rc) => (
            <span key={rc.rarity} className="capitalize">
              <span className={`mr-1 inline-block h-2 w-2 rounded-full ${rarityBadge[rc.rarity].split(" ")[0]}`} aria-hidden />
              {rc.rarity} {rc.owned}/{rc.total}
            </span>
          ))}
          <button
            type="button"
            onClick={() => setShowChecklist((v) => !v)}
            className="ml-auto text-[11px] underline text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-expanded={showChecklist}
          >
            {showChecklist ? "Hide checklist" : "Show checklist"}
          </button>
        </div>
      </div>

      {BIOMES.map((biome) => {
        const inBiome = MONSTERS.filter((m) => m.biome === biome.id);
        if (inBiome.length === 0) return null;
        const owned = inBiome.filter(isUnlocked).length;
        const pct = Math.round((owned / inBiome.length) * 100);
        const cheapest = Math.min(...inBiome.map((m) => m.cost));
        return (
          <section key={biome.id} className="mb-5" aria-label={`${biome.name} biome`}>
            <header className="mb-2 flex items-center justify-between">
              <h4 className="font-display text-base text-foreground flex items-center gap-1.5">
                <span aria-hidden="true">{biome.emoji}</span>
                {biome.name}
              </h4>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="text-[11px] font-bold text-accent tabular-nums">
                  {pct}%
                </span>
              </div>
            </header>
            {owned === 0 && (
              <p className="mb-2 text-[11px] text-muted-foreground italic">
                No {biome.name} monsters yet — save up {cheapest} 🪙 to unlock your first.
              </p>
            )}
            <div className="grid grid-cols-3 gap-3" role="list">
              {inBiome.map((m) => {
          const unlocked = isUnlocked(m);
          const active = m.id === activeMonster;
          const canAfford = coins >= m.cost;
          const taps = monsterTaps[m.id] ?? 0;
          const evo = getMonsterEvolution(m, taps);
          const progressPct = m.cost > 0 ? Math.min(100, Math.round((coins / m.cost) * 100)) : 100;
          const entry = inv.collection[m.id];
          const copies = entry?.copies ?? 0;
          const mergeLevel = entry?.level ?? 0;
          const canMerge = copies >= MERGE_COPIES_REQUIRED && mergeLevel < 4;

          return (
            <motion.button
              key={m.id}
              role="listitem"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => (unlocked ? onSelect(m.id) : canAfford ? onUnlock(m.id) : undefined)}
              aria-label={
                unlocked
                  ? `${evo.name}, Level ${evo.level}, ${m.rarity} rarity${active ? " (active)" : ". Click to select"}`
                  : canAfford
                  ? `Unlock ${m.name} for ${m.cost} coins, ${m.rarity} rarity`
                  : `${m.name}, ${m.rarity} rarity, costs ${m.cost} coins (not enough coins)`
              }
              aria-current={active ? "true" : undefined}
              className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                active ? "border-primary bg-primary/10" : unlocked ? rarityColors[m.rarity] + " bg-card" : "border-border bg-card/50 opacity-70"
              } ${!unlocked && !canAfford ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60 z-10" aria-hidden="true">
                  <div className="flex flex-col items-center gap-1 w-full px-2">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs font-bold text-accent">🪙 {m.cost}</span>
                    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground tabular-nums">
                      {Math.min(coins, m.cost)}/{m.cost}
                    </span>
                  </div>
                </div>
              )}
              {unlocked ? (
                <div className="w-16 h-16">
                  <Monster3D src={m.image} size={64} compact />
                </div>
              ) : (
                <img
                  src={m.image}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                  className="w-16 h-16 object-contain grayscale brightness-0 opacity-30"
                />
              )}
              <span className="text-xs font-bold font-body text-foreground">
                {unlocked ? evo.name : "???"}
              </span>
              {unlocked && (
                <div className="flex items-center gap-0.5 text-[9px] text-secondary">
                  <Sparkles size={9} aria-hidden="true" />
                  <span>Lv.{evo.level}</span>
                </div>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rarityBadge[m.rarity]}`}>
                {m.rarity}
              </span>
              {unlocked && (
                <MonsterStatsCard
                  stats={getMonsterStats(m, taps, upgrades.get(m.id))}
                  compact
                  className="mt-1 w-full"
                />
              )}
              {unlocked && (copies > 0 || mergeLevel > 0) && (
                <div className="flex flex-col items-center gap-0.5 mt-0.5 w-full">
                  <span className="text-[9px] font-body text-cyan-400 tabular-nums">
                    +{mergeLevel} · ×{copies}
                  </span>
                  {canMerge && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handleMerge(m.id, m.name); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          handleMerge(m.id, m.name);
                        }
                      }}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold cursor-pointer hover:brightness-110"
                      aria-label={`Merge 3 ${m.name} copies to level up`}
                    >
                      <Combine size={9} /> Merge
                    </span>
                  )}
                </div>
              )}
            </motion.button>
          );
              })}
            </div>
          </section>
        );
      })}

      {showChecklist && (
        <section className="mt-4 rounded-lg border-2 border-border bg-card/50 p-3" aria-label="Collection checklist">
          <h4 className="mb-2 font-display text-base text-foreground">Checklist</h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {MONSTERS.map((m) => {
              const unlocked = isUnlocked(m);
              return (
                <li key={m.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-sm border ${unlocked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"}`}
                    aria-hidden
                  >
                    {unlocked && <Check className="h-3 w-3" />}
                  </span>
                  <span className={`font-body ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                    {unlocked ? m.name : "???"}
                  </span>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${rarityBadge[m.rarity]}`}>
                    {m.rarity}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
        </TabsContent>
        <TabsContent value="upgrades">
          {addCoins ? (
            <MonsterStatsShop
              unlockedMonsters={unlockedMonsters}
              activeMonster={activeMonster}
              coins={coins}
              monsterTaps={monsterTaps}
              addCoins={addCoins}
            />
          ) : (
            <div className="rounded-lg border-2 border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
              Upgrades unavailable here.
            </div>
          )}
        </TabsContent>
        <TabsContent value="rewards">
          <CoinRewardGallery />
        </TabsContent>
      </Tabs>
    </div>
  );
}
