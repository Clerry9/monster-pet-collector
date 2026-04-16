import { motion } from "framer-motion";

type Tab = "board" | "monster" | "cards" | "collection" | "shop" | "spin";

interface GameTabsProps {
  active: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; emoji: string }[] = [
  { id: "board", label: "Play", emoji: "🎲" },
  { id: "monster", label: "Pet", emoji: "👾" },
  { id: "cards", label: "Cards", emoji: "🃏" },
  { id: "shop", label: "Shop", emoji: "🛒" },
  { id: "collection", label: "Team", emoji: "📦" },
  { id: "spin", label: "Spin", emoji: "🎰" },
];

export function GameTabs({ active, onTabChange }: GameTabsProps) {
  return (
    <div className="flex gap-0.5 rounded-full bg-card p-1" role="tablist" aria-label="Game sections">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={`panel-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          className={`relative px-2.5 py-2 rounded-full text-[11px] font-bold font-body transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            active === tab.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {active === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-full bg-primary box-glow-green"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              aria-hidden="true"
            />
          )}
          <span className="relative z-10">
            <span aria-hidden="true">{tab.emoji} </span>{tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
