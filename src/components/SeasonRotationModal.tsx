import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Season } from "@/data/seasons";
import { ALL_CARDS } from "@/data/cards";

interface SeasonRotationModalProps {
  open: boolean;
  season: Season;
  onClose: () => void;
  onGoToEvent: () => void;
}

/**
 * Celebratory modal shown the first time the user opens the app after the
 * season has rotated. Previews the rare + ultra-rare cards available this season.
 */
export function SeasonRotationModal({ open, season, onClose, onGoToEvent }: SeasonRotationModalProps) {
  const rare = ALL_CARDS.find((c) => c.id === season.rareCardId);
  const ultra = ALL_CARDS.find((c) => c.id === season.ultraCardId);

  const accent = `hsl(${season.palette.accent})`;
  const glow = `hsl(${season.palette.glow})`;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm border-4 border-wood-dark p-0 overflow-hidden">
        <div
          className="relative px-5 py-6 text-center"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${glow} 0%, hsl(${season.palette.bg}) 70%)`,
          }}
        >
          {/* Floating emojis */}
          <AnimatePresence>
            {open && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute text-2xl pointer-events-none"
                    initial={{ y: 0, x: `${10 + i * 10}%`, opacity: 0 }}
                    animate={{ y: -120, opacity: [0, 1, 0] }}
                    transition={{ duration: 3, delay: i * 0.15, repeat: Infinity, repeatDelay: 1 }}
                    style={{ top: "60%" }}
                    aria-hidden="true"
                  >
                    {season.symbol}
                  </motion.span>
                ))}
              </>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="relative z-10 inline-block text-6xl mb-2 drop-shadow-lg"
            aria-hidden="true"
          >
            {season.emoji}
          </motion.div>

          <div className="relative z-10">
            <div className="text-xs font-display uppercase tracking-widest text-wood-dark/70">
              New Season
            </div>
            <DialogTitle
              className="font-display text-3xl mt-1 drop-shadow-sm"
              style={{ color: accent }}
            >
              {season.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-wood-dark/80 mt-1 italic">
              {season.tagline}
            </DialogDescription>
          </div>
        </div>

        <div className="bg-cream px-5 py-4 space-y-3">
          <div className="text-center text-xs font-display uppercase tracking-wider text-wood-dark/70">
            Exclusive Cards This Season
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[rare, ultra].map((card, idx) => card && (
              <motion.div
                key={card.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="rounded-xl border-2 border-wood-dark p-3 text-center"
                style={{
                  background: idx === 1
                    ? `linear-gradient(135deg, ${glow}, ${accent})`
                    : `linear-gradient(135deg, hsl(${season.palette.bg}), ${glow})`,
                }}
              >
                <div className="text-4xl mb-1" aria-hidden="true">{card.emoji}</div>
                <div className="font-display text-xs leading-tight">{card.name}</div>
                <div className="text-[10px] uppercase tracking-wider mt-1 font-display"
                  style={{ color: idx === 1 ? "hsl(var(--wood-dark))" : "hsl(var(--wood-dark) / 0.7)" }}>
                  {idx === 1 ? "🌟 Ultra-Rare" : "🃏 Rare"}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center text-xs text-wood-dark/70">
            Earn <span className="font-bold">{season.symbolName}s</span> {season.symbol} from the mini-game to unlock them!
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Later
            </Button>
            <Button
              className="flex-1 font-display"
              style={{ background: accent, color: "white" }}
              onClick={onGoToEvent}
            >
              Play Now →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
