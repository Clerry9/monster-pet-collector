import { motion } from "framer-motion";
import { Button } from "./ui/button";
import type { RunChoiceCard } from "@/lib/combat";

interface Props {
  choices: RunChoiceCard[];
  wave: number;
  onPick: (id: string) => void;
  loading?: boolean;
}

const RARITY_BORDER: Record<RunChoiceCard["kind"], string> = {
  heal: "border-emerald-400",
  atk_buff: "border-candy-red",
  def_buff: "border-sky-400",
  potion: "border-emerald-300",
  bomb: "border-orange-400",
  shield: "border-amber-300",
  card: "border-gold",
};

export function BattleChoiceModal({ choices, wave, onPick, loading }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ y: 30, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        className="w-full max-w-md rounded-3xl border-4 border-gold bg-gradient-to-b from-wood-dark to-[#1a0f2e] p-5 shadow-chunky"
      >
        <h3 className="font-display text-lg text-gold text-center mb-1">
          Wave {wave} Cleared!
        </h3>
        <p className="text-xs text-center text-cream/70 mb-4">Pick a boon to carry into the next wave</p>

        <div className="grid grid-cols-3 gap-2">
          {choices.map((c, i) => (
            <motion.button
              key={c.id}
              onClick={() => onPick(c.id)}
              disabled={loading}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
              whileHover={{ y: -4, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={`relative flex flex-col items-center rounded-2xl border-4 ${RARITY_BORDER[c.kind]} bg-black/40 p-3 text-center hover:bg-black/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="text-4xl mb-1" aria-hidden>{c.emoji}</div>
              <div className="font-display text-[11px] text-cream leading-tight mb-1">{c.label}</div>
              <div className="text-[9px] text-cream/60 leading-snug">{c.description}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}