import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Gift, RefreshCw, Trophy, Gamepad2, Star, Dices } from "lucide-react";
import { formatTimeRemaining } from "@/data/seasons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

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
  onOpenRoulette: () => void;
  /** ms until the next free lucky-roulette spin. 0 / undefined = available now. */
  rouletteCooldownMs?: number;
  onLearnMore?: (railId: string) => void;
}

export function SideRails({
  msRemaining, newEvent,
  onOpenSeason, onOpenSpin, onOpenDaily, onOpenSpecials, onOpenCollection, onOpenCards,
  onOpenRoulette,
  rouletteCooldownMs,
  onLearnMore,
}: Props) {
  const luckyReady = !rouletteCooldownMs || rouletteCooldownMs <= 0;
  const left: RailItem[] = [
    { id: "season", icon: <Star size={18} />, label: "EVENT", countdownMs: msRemaining, onClick: onOpenSeason, hot: newEvent, tip: "Limited-time event with a battle pass and exclusive monsters. Countdown shows when a new season starts." },
    { id: "specials", icon: <Sparkles size={18} />, label: "SHOP", onClick: onOpenSpecials, tip: "Buy dice bundles, special packs, and the Season Pass. Best deals live here." },
    { id: "cards", icon: <Gamepad2 size={18} />, label: "CARDS", onClick: onOpenCards, tip: "Browse every card you've drawn and see how close each set is to completion." },
    {
      id: "roulette",
      icon: <Dices size={18} />,
      label: "LUCK",
      onClick: onOpenRoulette,
      hot: luckyReady,
      countdownMs: luckyReady ? undefined : rouletteCooldownMs,
      tip: luckyReady
        ? "Lucky Roulette! Free spin ready — pick a wedge and win coins, rolls, cards, season XP, or island prizes."
        : "Lucky Roulette. Next free spin in the timer below; or pay 100 🪙 for an extra spin anytime.",
    },
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
  const isMobile = useIsMobile();
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div
      className={`flex flex-col gap-2.5 fixed ${side === "left" ? "left-1" : "right-1"} z-10`}
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 110px)",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 160px)",
        justifyContent: "space-around",
      }}
      role="toolbar"
      aria-label={`${side === "left" ? "Left" : "Right"} side navigation`}
      aria-orientation="vertical"
    >
      {items.map((it) => {
        const isOpen = openId === it.id;
        const handleClick = () => {
          // On mobile, the first tap reveals the tooltip; the in-popover "Open" button
          // performs the navigation. On desktop, hover reveals the tooltip and click
          // navigates immediately.
          if (isMobile) {
            if (isOpen) { setOpenId(null); it.onClick(); }
            else setOpenId(it.id);
          } else {
            it.onClick();
          }
        };
        return (
          <Popover
            key={it.id}
            open={isOpen}
            onOpenChange={(o) => setOpenId(o ? it.id : null)}
          >
            <PopoverTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.06 }}
                onClick={handleClick}
                onMouseEnter={() => { if (!isMobile) setOpenId(it.id); }}
                onMouseLeave={() => { if (!isMobile) setOpenId((cur) => (cur === it.id ? null : cur)); }}
                onFocus={() => setOpenId(it.id)}
                onBlur={() => setOpenId((cur) => (cur === it.id ? null : cur))}
                className="icon-tile-gold w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                aria-label={`${it.label}${it.tip ? ` — ${it.tip}` : ""}`}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
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
            </PopoverTrigger>
            {it.tip && (
              <PopoverContent
                side={side === "left" ? "right" : "left"}
                align="center"
                className="w-56 panel-wood text-cream-light border-wood-dark p-3"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="font-display text-xs tracking-wide mb-1">{it.label}</div>
                <p className="font-body text-[11px] text-cream/90 leading-snug">{it.tip}</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {isMobile && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpenId(null); it.onClick(); }}
                      className="btn-press px-3 py-1.5 rounded-full font-display text-[11px]"
                    >
                      Open {it.label}
                    </button>
                  )}
                  {onLearnMore && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOpenId(null); onLearnMore(it.id); }}
                      className="text-[11px] font-display text-gold hover:underline focus-visible:outline-2 focus-visible:outline-gold rounded"
                    >
                      Show me in tutorial →
                    </button>
                  )}
                </div>
              </PopoverContent>
            )}
          </Popover>
        );
      })}
    </div>
  );
}
