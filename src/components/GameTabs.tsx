import { motion } from "framer-motion";

type Tab = "board" | "monster" | "cards" | "collection" | "shop" | "spin" | "specials";

interface GameTabsProps {
  active: Tab;
  onTabChange: (tab: Tab) => void;
  variant?: "bar" | "rail";
}

const tabs: { id: Tab; label: string; emoji: string }[] = [
  { id: "board", label: "Play", emoji: "🎲" },
  { id: "monster", label: "Pet", emoji: "👾" },
  { id: "cards", label: "Cards", emoji: "🃏" },
  { id: "shop", label: "Shop", emoji: "🛒" },
  { id: "specials", label: "Deals", emoji: "🎁" },
  { id: "collection", label: "Team", emoji: "📦" },
  { id: "spin", label: "Spin", emoji: "🎰" },
];

export function GameTabs({ active, onTabChange, variant = "bar" }: GameTabsProps) {
  if (variant === "rail") {
    return (
      <div className="flex flex-col gap-2" role="tablist" aria-label="Game sections">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`icon-tile-gold w-12 h-12 flex flex-col items-center justify-center text-[10px] font-display leading-none transition-transform active:translate-y-0.5 ${
                isActive ? "ring-4 ring-candy-red/70 scale-105" : ""
              }`}
            >
              <span className="text-xl leading-none" aria-hidden="true">{tab.emoji}</span>
              <span className="mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="flex gap-1 rounded-full p-1.5 bg-wood border-[3px] border-wood-dark shadow-chunky-sm"
      role="tablist"
      aria-label="Game sections"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={`panel-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
          className={`relative px-2.5 py-1.5 rounded-full text-[11px] font-display tracking-wide transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            active === tab.id ? "text-wood-dark" : "text-cream/80 hover:text-cream"
          }`}
        >
          {active === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-full bg-gradient-to-b from-[hsl(48_100%_72%)] to-gold-deep border-2 border-wood-dark"
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
