import { motion } from "framer-motion";
import { Monster } from "@/data/monsters";

interface MonsterDisplayProps {
  monster: Monster;
  onTap: () => void;
}

export function MonsterDisplay({ monster, onTap }: MonsterDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.h2
        key={monster.id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-4xl text-primary text-glow-green"
      >
        {monster.name}
      </motion.h2>
      <motion.button
        whileTap={{ scale: 0.9 }}
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
          alt={monster.name}
          width={280}
          height={280}
          className="relative z-10 drop-shadow-2xl"
          draggable={false}
        />
      </motion.button>
      <p className="text-muted-foreground text-sm font-body max-w-[260px] text-center">
        {monster.description}
      </p>
      <span className="text-xs font-bold text-primary font-body">
        +{monster.coinsPerTap} coins per tap
      </span>
    </div>
  );
}
