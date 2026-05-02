import { motion } from "framer-motion";
import { Monster, getMonsterEvolution, getNextEvolution } from "@/data/monsters";
import { Sparkles, TrendingUp } from "lucide-react";
import { Monster3D } from "./Monster3D";

interface MonsterDisplayProps {
  monster: Monster;
  monsterXp: number;
}

export function MonsterDisplay({ monster, monsterXp }: MonsterDisplayProps) {
  const currentEvo = getMonsterEvolution(monster, monsterXp);
  const nextEvo = getNextEvolution(monster, monsterXp);
  const progress = nextEvo
    ? ((monsterXp - currentEvo.xpRequired) / (nextEvo.xpRequired - currentEvo.xpRequired)) * 100
    : 100;

  return (
    <div className="flex flex-col items-center gap-3" role="region" aria-label={`${currentEvo.name} - Level ${currentEvo.level}`}>
      {/* Evolution name + level */}
      <motion.div
        key={currentEvo.name}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        <h2 className="font-display text-3xl text-primary text-glow-green">
          {currentEvo.name}
        </h2>
        <div className="flex items-center gap-1 text-xs font-body text-secondary">
          <Sparkles size={12} aria-hidden="true" />
          <span>Lv.{currentEvo.level}</span>
          <span className="text-muted-foreground">•</span>
          <TrendingUp size={12} />
          <span className="text-accent">+{currentEvo.coinBonus}% coins</span>
        </div>
      </motion.div>

      {/* Monster image */}
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/15 blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          aria-hidden="true"
        />
        <motion.div
          key={monster.id}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 drop-shadow-2xl"
        >
          <Monster3D
            src={monster.image}
            size={240}
            glow="radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 70%)"
          />
          <span className="sr-only">{`${currentEvo.name}, Level ${currentEvo.level} monster`}</span>
        </motion.div>
      </div>

      {/* XP progress */}
      <div className="w-56 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-body text-muted-foreground">
          <span>🍖 {monsterXp} XP</span>
          {nextEvo ? (
            <span className="text-secondary">
              Next: {nextEvo.name} ({nextEvo.xpRequired} XP)
            </span>
          ) : (
            <span className="text-accent">MAX LEVEL ⭐</span>
          )}
        </div>
        <div
          className="h-2 w-full rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.min(progress, 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Monster XP progress: ${Math.round(Math.min(progress, 100))}%`}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <p className="text-muted-foreground text-xs font-body max-w-[240px] text-center">
        {currentEvo.description}
      </p>

      <p className="text-[10px] text-muted-foreground/70 font-body text-center">
        Land on 🍖 Food tiles to feed your monster and gain XP!
      </p>

      {/* Evolution stages preview */}
      <div className="flex gap-1 mt-1" role="list" aria-label="Evolution stages">
        {monster.evolutions.map((evo) => (
          <div
            key={evo.level}
            role="listitem"
            aria-label={`Level ${evo.level}${monsterXp >= evo.xpRequired ? " (unlocked)" : " (locked)"}`}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
              monsterXp >= evo.xpRequired
                ? "border-primary bg-primary/20 text-primary"
                : "border-border bg-muted/30 text-muted-foreground"
            }`}
          >
            {evo.level}
          </div>
        ))}
      </div>
    </div>
  );
}
