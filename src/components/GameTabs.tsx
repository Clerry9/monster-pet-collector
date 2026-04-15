import { motion } from "framer-motion";

type Tab = "monster" | "collection" | "spin";

interface GameTabsProps {
  active: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; emoji: string }[] = [
  { id: "monster", label: "Pet", emoji: "👾" },
  { id: "collection", label: "Collection", emoji: "📦" },
  { id: "spin", label: "Spin", emoji: "🎰" },
];

export function GameTabs({ active, onTabChange }: GameTabsProps) {
  return (
    <div className="flex gap-1 rounded-full bg-card p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative px-4 py-2 rounded-full text-sm font-bold font-body transition-colors cursor-pointer ${
            active === tab.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {active === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-full bg-primary box-glow-green"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">
            {tab.emoji} {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
