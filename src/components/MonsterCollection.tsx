import { motion } from "framer-motion";
import { MONSTERS, Monster, getMonsterEvolution } from "@/data/monsters";
import { Lock, Sparkles } from "lucide-react";
import { Monster3D } from "./Monster3D";

interface Props {
  unlockedMonsters: string[];
  activeMonster: string;
  coins: number;
  monsterTaps: Record<string, number>;
  onSelect: (id: string) => void;
  onUnlock: (id: string) => void;
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

export function MonsterCollection({ unlockedMonsters, activeMonster, coins, monsterTaps, onSelect, onUnlock }: Props) {
  const isUnlocked = (m: Monster) => unlockedMonsters.includes(m.id);

  return (
    <div className="w-full" role="region" aria-label="Monster collection">
      <h3 className="font-display text-2xl text-foreground mb-4 text-glow-purple">
        Monster Collection
      </h3>
      <div className="grid grid-cols-3 gap-3" role="list">
        {MONSTERS.map((m) => {
          const unlocked = isUnlocked(m);
          const active = m.id === activeMonster;
          const canAfford = coins >= m.cost;
          const taps = monsterTaps[m.id] ?? 0;
          const evo = getMonsterEvolution(m, taps);

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
                  <div className="flex flex-col items-center gap-1">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs font-bold text-accent">🪙 {m.cost}</span>
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
                  className="w-16 h-16 object-contain grayscale opacity-70"
                />
              )}
              <span className="text-xs font-bold font-body text-foreground">{unlocked ? evo.name : m.name}</span>
              {unlocked && (
                <div className="flex items-center gap-0.5 text-[9px] text-secondary">
                  <Sparkles size={9} aria-hidden="true" />
                  <span>Lv.{evo.level}</span>
                </div>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rarityBadge[m.rarity]}`}>
                {m.rarity}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
