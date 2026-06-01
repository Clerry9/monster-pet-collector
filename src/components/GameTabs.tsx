import { motion } from "framer-motion";

type Tab = "board" | "monster" | "cards" | "collection" | "shop" | "spin" | "specials" | "season" | "account";

interface GameTabsProps {
  active: Tab;
  onTabChange: (tab: Tab) => void;
  variant?: "bar" | "rail";
  /** Set of tab ids that should display a "NEW" badge. */
  newTabs?: Partial<Record<Tab, boolean>>;
  /** Optional countdown labels shown next to the NEW badge per tab. */
  countdowns?: Partial<Record<Tab, string>>;
}

const tabs: { id: Tab; label: string; emoji: string; tip: string }[] = [
  { id: "board",      label: "Play",    emoji: "🎲", tip: "Roll dice and move across the island board." },
  { id: "season",     label: "Event",   emoji: "🌟", tip: "Current limited-time event, battle pass, and mini-games." },
  { id: "monster",    label: "Pet",     emoji: "👾", tip: "View, feed, and level up your active monster." },
  { id: "cards",      label: "Cards",   emoji: "🃏", tip: "Your card album — complete sets to earn rewards." },
  { id: "shop",       label: "Shop",    emoji: "🛒", tip: "Buy coins, gems, dice bundles, and the Season Pass." },
  { id: "specials",   label: "Deals",   emoji: "🎁", tip: "Daily deals, limited bundles, and starter packs." },
  { id: "collection", label: "Team",    emoji: "📦", tip: "Pick your battle team and manage unlocked monsters." },
  { id: "spin",       label: "Spin",    emoji: "🎰", tip: "Spin the prize wheel for free coins, dice, and cards." },
  { id: "account",    label: "Account", emoji: "👤", tip: "Account, settings, sign in / out, and progress." },
];

export function GameTabs({ active, onTabChange, variant = "bar", newTabs, countdowns }: GameTabsProps) {
  if (variant === "rail") {
    return (
      <div className="flex flex-col gap-2" role="tablist" aria-label="Game sections">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const isNew = !!newTabs?.[tab.id];
          const countdown = countdowns?.[tab.id];
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.tip}
              aria-label={`${tab.label} — ${tab.tip}`}
              className={`relative icon-tile-gold w-12 h-12 flex flex-col items-center justify-center text-xs font-display leading-none transition-transform active:translate-y-0.5 ${
                isActive ? "ring-4 ring-candy-red/70 scale-105" : ""
              }`}
            >
              <span className="text-xl leading-none" aria-hidden="true">{tab.emoji}</span>
              <span className="mt-0.5">{tab.label}</span>
              {isNew && <NewBadge />}
              {countdown && <CountdownPill label={countdown} />}
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
      {tabs.map((tab) => {
        const isNew = !!newTabs?.[tab.id];
        const countdown = countdowns?.[tab.id];
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            title={tab.tip}
            aria-label={`${tab.label} — ${tab.tip}`}
            className={`relative px-2.5 py-1.5 rounded-full text-sm font-display tracking-wide transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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
            {isNew && <NewBadge />}
            {countdown && <CountdownPill label={countdown} />}
          </button>
        );
      })}
    </div>
  );
}

function NewBadge() {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.2, 1] }}
      transition={{ duration: 0.4 }}
      className="absolute -top-1.5 -right-1.5 z-20 px-1.5 py-[1px] rounded-full bg-candy-red text-cream text-[11px] font-display tracking-wider border border-cream shadow-md pointer-events-none"
      aria-label="New"
    >
      NEW
    </motion.span>
  );
}

function CountdownPill({ label }: { label: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 px-1.5 py-[1px] rounded-full bg-wood-dark text-gold text-[11px] font-display tracking-wider border border-gold/60 shadow-md pointer-events-none whitespace-nowrap"
      aria-label={`Time remaining: ${label}`}
    >
      ⏱ {label}
    </motion.span>
  );
}
