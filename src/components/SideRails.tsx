import { motion } from "framer-motion";
import { Sparkles, Gift, RefreshCw, Trophy, Gamepad2, Star } from "lucide-react";
import { formatTimeRemaining } from "@/data/seasons";

interface RailItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  countdownMs?: number;
  onClick: () => void;
  hot?: boolean;
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
}

export function SideRails({
  msRemaining, newEvent,
  onOpenSeason, onOpenSpin, onOpenDaily, onOpenSpecials, onOpenCollection, onOpenCards,
}: Props) {
  const left: RailItem[] = [
    { id: "season", icon: <Star size={18} />, label: "EVENT", countdownMs: msRemaining, onClick: onOpenSeason, hot: newEvent },
    { id: "specials", icon: <Sparkles size={18} />, label: "SHOP", onClick: onOpenSpecials },
    { id: "cards", icon: <Gamepad2 size={18} />, label: "CARDS", onClick: onOpenCards },
  ];
  const right: RailItem[] = [
    { id: "daily", icon: <Gift size={18} />, label: "DAILY", onClick: onOpenDaily },
    { id: "spin", icon: <RefreshCw size={18} />, label: "SPIN", onClick: onOpenSpin },
    { id: "collection", icon: <Trophy size={18} />, label: "MONST", onClick: onOpenCollection },
  ];

  return (
    <>
      <Rail items={left} side="left" />
      <Rail items={right} side="right" />
    </>
  );
}

function Rail({ items, side }: { items: RailItem[]; side: "left" | "right" }) {
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
        <motion.button
          key={it.id}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.06 }}
          onClick={it.onClick}
          className="icon-tile-gold w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center relative"
          aria-label={it.label}
          title={it.label}
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
      ))}
    </div>
  );
}
