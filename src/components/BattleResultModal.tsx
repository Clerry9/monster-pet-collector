import { motion } from "framer-motion";
import { Trophy, Skull } from "lucide-react";
import { Button } from "./ui/button";
import { Monster3D } from "./Monster3D";
import { MONSTERS } from "@/data/monsters";
import type { ArenaRun } from "@/lib/combat";

interface Props {
  run: ArenaRun;
  won: boolean;
  onClose: () => void;
  onReplay?: () => void;
}

export function BattleResultModal({ run, won, onClose, onReplay }: Props) {
  const monster = MONSTERS.find((m) => m.id === run.monster_id);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className={`relative w-full max-w-sm rounded-3xl border-4 ${
          won ? "border-gold" : "border-candy-red"
        } bg-gradient-to-b from-wood-dark to-[#1a0f2e] p-6 text-center shadow-chunky`}
      >
        <div className={`absolute -top-7 left-1/2 -translate-x-1/2 rounded-full p-3 border-4 ${
          won ? "bg-gold border-gold-dark text-wood-dark" : "bg-candy-red border-wood-dark text-cream"
        }`}>
          {won ? <Trophy size={28} /> : <Skull size={28} />}
        </div>

        <h2 className="font-display text-3xl tracking-wider mt-4 mb-1 text-cream">
          {won ? "VICTORY" : "DEFEAT"}
        </h2>
        <p className="text-xs text-cream/70 mb-4">
          Reached <span className="text-gold font-display">Wave {won ? run.wave : Math.max(1, run.wave - 1)}</span>
        </p>

        {monster && (
          <div className="flex justify-center mb-3">
            <Monster3D src={monster.image} size={110} compact />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-xs mb-4">
          <div className="rounded-xl bg-black/30 border border-wood-dark p-2">
            <div className="text-amber-300 font-display text-lg">+{run.coins_earned}</div>
            <div className="text-cream/60">💰 coins</div>
          </div>
          <div className="rounded-xl bg-black/30 border border-wood-dark p-2">
            <div className="text-purple-300 font-display text-lg">+{run.shards_earned}</div>
            <div className="text-cream/60">✨ shards</div>
          </div>
          <div className="rounded-xl bg-black/30 border border-wood-dark p-2">
            <div className="text-emerald-300 font-display text-lg">+{run.wave * 10}</div>
            <div className="text-cream/60">🍖 XP</div>
          </div>
        </div>

        {(run.win_streak ?? 0) > 1 && won && (
          <div className="mb-3 inline-block rounded-full bg-gold/20 border border-gold px-3 py-1 text-xs text-gold font-display">
            🔥 {run.win_streak}-win streak — ×{Math.min(5, 1 + run.win_streak * 0.2).toFixed(1)} payout
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={onClose} className="flex-1 font-display">
            Return to Lobby
          </Button>
          {onReplay && (
            <Button onClick={onReplay} variant="secondary" className="font-display">
              📜 Replay
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}