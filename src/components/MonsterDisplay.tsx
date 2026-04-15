import { motion } from "framer-motion";
import { Monster, MonsterEvolution, getMonsterEvolution, getNextEvolution } from "@/data/monsters";
import { Sparkles } from "lucide-react";

interface MonsterDisplayProps {
  monster: Monster;
  taps: number;
  onTap: () => void;
}

export function MonsterDisplay({ monster, taps, onTap }: MonsterDisplayProps) {
  const currentEvo = getMonsterEvolution(monster, taps);
  const nextEvo = getNextEvolution(monster, taps);
  const progress = nextEvo
    ? ((taps - (currentEvo.tapsRequired)) / (nextEvo.tapsRequired - currentEvo.tapsRequired)) * 100
    : 100;

  return (
    <div className="flex flex-col items-center gap-3">
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
          <Sparkles size={12} />
          <span>Lv.{currentEvo.level}</span>
          <span className="text-muted-foreground">• +{currentEvo.coinsPerTap}/tap</span>
        </div>
      </motion.div>

      {/* Monster image - tappable */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.05 }}
        onClick={onTap}
        className="relative cursor-pointer focus:outline-none"
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <motion.img
          key={monster.id}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          src={monster.image}
          alt={currentEvo.name}
          width={220}
          height={220}
          className="relative z-10 drop-shadow-2xl"
          draggable={false}
        />
      </motion.button>

      {/* Evolution progress */}
      <div className="w-56 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-body text-muted-foreground">
          <span>{taps} taps</span>
          {nextEvo ? (
            <span className="text-secondary">
              Next: {nextEvo.name} ({nextEvo.tapsRequired} taps)
            </span>
          ) : (
            <span className="text-accent">MAX LEVEL ⭐</span>
          )}
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
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

      {/* Evolution stages preview */}
      <div className="flex gap-1 mt-1">
        {monster.evolutions.map((evo) => (
          <div
            key={evo.level}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${
              taps >= evo.tapsRequired
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
