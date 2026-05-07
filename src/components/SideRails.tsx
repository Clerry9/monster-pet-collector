import { motion } from "framer-motion";
import { Sparkles, Gift, RefreshCw, Trophy, Gamepad2, Star } from "lucide-react";
import { formatTimeRemaining } from "@/data/seasons";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface RailItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  countdownMs?: number;
  onClick: () => void;
  hot?: boolean;
  tip?: string;
}

interface Props {
  msRemaining: number;
  newEvent: boolean;
  onOpenSeason: () => void;
  onOpenSpin: () => void;
  onOpenDaily: () => void;
  onOpenSpecials: () => void;
  onOpenCollection: () => void;
  onOpenCards: () => void;
  onLearnMore?: (railId: string) => void;
}

export function SideRails({
  msRemaining, newEvent,
  onOpenSeason, onOpenSpin, onOpenDaily, onOpenSpecials, onOpenCollection, onOpenCards,
  onLearnMore,
}: Props) {
  const left: RailItem[] = [
    { id: "season", icon: <Star size={18} />, label: "EVENT", countdownMs: msRemaining, onClick: onOpenSeason, hot: newEvent, tip: "Limited-time event with a battle pass and exclusive monsters. Countdown shows when a new season starts." },
    { id: "specials", icon: <Sparkles size={18} />, label: "SHOP", onClick: onOpenSpecials, tip: "Buy dice bundles, special packs, and the Season Pass. Best deals live here." },
    { id: "cards", icon: <Gamepad2 size={18} />, label: "CARDS", onClick: onOpenCards, tip: "Browse every card you've drawn and see how close each set is to completion." },
  ];
  const right: RailItem[] = [
    { id: "daily", icon: <Gift size={18} />, label: "DAILY", onClick: onOpenDaily, tip: "Claim a free reward every 24 hours. Streaks pay more — don't miss a day!" },
    { id: "spin", icon: <RefreshCw size={18} />, label: "SPIN", onClick: onOpenSpin, tip: "Spin the prize wheel for free dice, coins, and rare cards. Refills on a timer." },
    { id: "collection", icon: <Trophy size={18} />, label: "MONST", onClick: onOpenCollection, tip: "Your monster album — see who you own, who's evolving, and who's still hiding." },
  ];

  return (
    <>
      <Rail items={left} side="left" onLearnMore={onLearnMore} />
      <Rail items={right} side="right" onLearnMore={onLearnMore} />
    </>
  );
}

function Rail({ items, side, onLearnMore }: { items: RailItem[]; side: "left" | "right"; onLearnMore?: (id: string) => void }) {
  return (
    <div
      className={`flex flex-col gap-2.5 fixed ${side === "left" ? "left-1" : "right-1"} z-10`}
      style={{
        // Sit between the top HUD (~96px) and the bottom dock (~150px) so rails never
        // overlap either chrome on small landscape phones.
        top: "calc(env(safe-area-inset-top, 0px) + 110px)",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 160px)",
        justifyContent: "space-around",
      }}
    >
      {items.map((it) => (
        <HoverCard key={it.id} openDelay={150} closeDelay={80}>
          <HoverCardTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.06 }}
              onClick={it.onClick}
              className="icon-tile-gold w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center relative"
              aria-label={`${it.label}${it.tip ? ` — ${it.tip}` : ""}`}
              title={it.tip ?? it.label}
              data-rail={it.id}
            >
              {it.icon}
              <span className="text-[7px] sm:text-[8px] font-display leading-none mt-0.5">{it.label}</span>
              {it.hot && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-candy-red text-cream-light text-[8px] font-display px-1 rounded-full border border-wood-dark"
                >
                  NEW
                </motion.span>
              )}
              {it.countdownMs !== undefined && (
                <span
                  key={Math.floor(it.countdownMs / 1000)}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-wood-dark text-cream-light text-[7px] sm:text-[8px] font-display px-1 rounded-full border border-gold whitespace-nowrap"
                >
                  {formatTimeRemaining(it.countdownMs)}
                </span>
              )}
            </motion.button>
          </HoverCardTrigger>
          {it.tip && (
            <HoverCardContent
              side={side === "left" ? "right" : "left"}
              align="center"
              className="w-56 panel-wood text-cream-light border-wood-dark p-3"
            >
              <div className="font-display text-xs tracking-wide mb-1">{it.label}</div>
              <p className="font-body text-[11px] text-cream/90 leading-snug">{it.tip}</p>
              {onLearnMore && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onLearnMore(it.id); }}
                  className="mt-2 text-[11px] font-display text-gold hover:underline"
                >
                  Show me in tutorial →
                </button>
              )}
            </HoverCardContent>
          )}
        </HoverCard>
      ))}
    </div>
  );
}
