import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameCard, CardRarity } from "@/data/cards";
import { Sparkles } from "lucide-react";

const RARITY_COLORS: Record<CardRarity, { bg: string; border: string; glow: string; text: string; nameText: string; subText: string }> = {
  common:    { bg: "bg-muted",         border: "border-muted-foreground/30", glow: "shadow-muted/20",        text: "text-muted-foreground", nameText: "text-foreground",   subText: "text-muted-foreground" },
  rare:      { bg: "bg-blue-900/70",   border: "border-blue-400",            glow: "shadow-blue-400/40",     text: "text-blue-200",         nameText: "text-white",        subText: "text-blue-100/90" },
  epic:      { bg: "bg-purple-900/80", border: "border-purple-400",          glow: "shadow-purple-400/40",   text: "text-purple-200",       nameText: "text-white",        subText: "text-purple-100/90" },
  legendary: { bg: "bg-amber-900/70",  border: "border-amber-400",           glow: "shadow-amber-400/50",    text: "text-amber-200",        nameText: "text-white",        subText: "text-amber-100/90" },
};

interface CardRevealProps {
  card: GameCard | null;
  onComplete: () => void;
}

export const CardReveal = ({ card, onComplete }: CardRevealProps) => {
  const [phase, setPhase] = useState<"pack" | "glow" | "reveal">("pack");

  // Auto-advance pack → glow → reveal so the award feedback feels as snappy
  // as the monster hop. Tap still skips ahead / dismisses.
  useEffect(() => {
    if (phase !== "pack") return;
    const t1 = window.setTimeout(() => setPhase("glow"), 550);
    const t2 = window.setTimeout(() => setPhase("reveal"), 1150);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [phase]);

  // Reset phase when a new card appears so the sequence replays.
  useEffect(() => { if (card) setPhase("pack"); }, [card?.id]);

  if (!card) return null;
  const colors = RARITY_COLORS[card.rarity];

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (phase === "reveal") onComplete();
          }}
        >
          {/* Particle burst background */}
          {phase === "reveal" && (
            <>
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full ${card.rarity === "legendary" ? "bg-amber-400" : card.rarity === "epic" ? "bg-purple-400" : card.rarity === "rare" ? "bg-blue-400" : "bg-muted-foreground"}`}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: Math.random() * 0.2 }}
                  style={{ left: "50%", top: "50%" }}
                />
              ))}
            </>
          )}

          {/* Card Pack */}
          {phase === "pack" && (
            <motion.div
              className="cursor-pointer relative"
              initial={{ scale: 0.3, rotateY: 0 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 120 }}
              onClick={(e) => {
                e.stopPropagation();
                setPhase("glow");
                setTimeout(() => setPhase("reveal"), 800);
              }}
            >
              {/* Pack shape */}
              <motion.div
                className="w-48 h-64 rounded-2xl bg-gradient-to-br from-primary/80 to-accent/60 border-2 border-primary/50 flex flex-col items-center justify-center gap-3 shadow-2xl"
                whileHover={{ scale: 1.05, rotateZ: [-1, 1, -1, 0] }}
                transition={{ rotateZ: { duration: 0.4 } }}
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <span className="text-6xl">🃏</span>
                </motion.div>
                <div className="text-sm font-bold text-primary-foreground/90 font-display">Card Pack</div>
                <motion.div
                  className="text-xs text-primary-foreground/60"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  Tap to open!
                </motion.div>
              </motion.div>

              {/* Sparkle accents */}
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ rotate: { repeat: Infinity, duration: 3 }, scale: { repeat: Infinity, duration: 1.5 } }}
              >
                <Sparkles className="text-accent" size={20} />
              </motion.div>
            </motion.div>
          )}

          {/* Glow phase - pack breaking open */}
          {phase === "glow" && (
            <motion.div className="relative">
              <motion.div
                className="w-48 h-64 rounded-2xl bg-gradient-to-br from-primary to-accent border-2 border-white/50"
                initial={{ scale: 1 }}
                animate={{
                  scale: [1, 1.1, 1.2, 0],
                  rotateZ: [0, -5, 5, 0],
                  opacity: [1, 1, 1, 0],
                }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ boxShadow: "0 0 0px white" }}
                animate={{ boxShadow: ["0 0 20px white", "0 0 80px white", "0 0 200px white"] }}
                transition={{ duration: 0.8 }}
              />
            </motion.div>
          )}

          {/* Revealed card */}
          {phase === "reveal" && (
            <motion.div
              className="relative cursor-pointer"
              initial={{ scale: 0, rotateY: 180 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.1 }}
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
            >
              <div
                className={`w-56 h-80 rounded-2xl ${colors.bg} border-2 ${colors.border} flex flex-col items-center justify-center gap-3 p-6 shadow-2xl ${colors.glow}`}
                style={{ boxShadow: `0 0 40px 5px ${card.rarity === "legendary" ? "rgba(251,191,36,0.4)" : card.rarity === "epic" ? "rgba(168,85,247,0.4)" : card.rarity === "rare" ? "rgba(96,165,250,0.3)" : "rgba(128,128,128,0.15)"}` }}
              >
                {/* Rarity label */}
                <motion.div
                  className={`text-[10px] uppercase tracking-widest font-bold ${colors.text}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {card.rarity}
                </motion.div>

                {/* Card emoji */}
                <motion.div
                  className="text-7xl"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.3, damping: 10 }}
                >
                  {card.emoji}
                </motion.div>

                {/* Card name */}
                <motion.div
                  className={`text-lg font-bold font-display ${colors.nameText} text-center drop-shadow`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {card.name}
                </motion.div>

                {/* Theme */}
                <motion.div
                  className={`text-xs ${colors.subText} text-center`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {card.theme} Set
                </motion.div>

                {/* Description */}
                <motion.div
                  className={`text-[11px] ${colors.subText} text-center italic mt-1`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {card.description}
                </motion.div>

                {/* Reward info */}
                <motion.div
                  className={`text-xs font-bold ${colors.text} mt-2`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, type: "spring" }}
                >
                  {card.reward.type === "coins" ? `+${card.reward.amount} 🪙` : "🧩 Monster Piece"}
                </motion.div>
              </div>

              {/* Tap to dismiss */}
              <motion.div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.5, 1] }}
                transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
              >
                Tap to continue
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
