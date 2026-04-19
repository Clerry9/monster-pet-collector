import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronUp, BookOpen, Trophy, Dice5, Sparkles } from "lucide-react";

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
  onReplayTutorial: () => void;
}

/**
 * Statistical odds reference. Keep in sync with:
 * - useGameState.ts -> generateBoard tile weights
 * - cards.ts -> drawRandomCard rarity weights
 * - MiniGame.tsx -> 8% special-symbol drop on cleared tiles, +1 symbol per 200 score
 */
const BOARD_TILE_ODDS = [
  { emoji: "🪙", label: "Coins", chance: "40%", payout: "5–30" },
  { emoji: "💰", label: "Bonus mult", chance: "15%", payout: "×2 to ×5" },
  { emoji: "🍖", label: "Food (pet XP)", chance: "15%", payout: "10–50" },
  { emoji: "📦", label: "Chest (draws card!)", chance: "10%", payout: "20–100" },
  { emoji: "💀", label: "Skull (penalty)", chance: "10%", payout: "−5 to −10" },
  { emoji: "⭐", label: "Star (draws card!)", chance: "10%", payout: "50–200" },
];

const CARD_RARITY_ODDS = [
  { rarity: "Common", chance: "50%", color: "text-wood-dark" },
  { rarity: "Rare", chance: "30%", color: "text-blue-700" },
  { rarity: "Epic", chance: "15%", color: "text-purple-700" },
  { rarity: "Legendary", chance: "5%", color: "text-gold-deep" },
];

export function HelpDialog({ open, onClose, onReplayTutorial }: HelpDialogProps) {
  const [advanced, setAdvanced] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
          role="dialog"
          aria-label="How to play"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 18 }}
            onClick={(e) => e.stopPropagation()}
            className="panel-wood w-full max-w-md p-4 max-h-[88vh] overflow-y-auto relative"
          >
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 icon-tile-gold w-8 h-8 flex items-center justify-center"
              aria-label="Close help"
            >
              <X size={16} />
            </button>

            <div className="text-center mb-3">
              <BookOpen className="mx-auto text-gold mb-1" size={28} />
              <h2 className="font-display text-lg text-cream-light tracking-wider">
                HOW TO PLAY
              </h2>
              <p className="text-[11px] font-display text-cream/80 italic">
                Roll, collect, evolve, win
              </p>
            </div>

            {/* Simple summary */}
            <div className="space-y-2">
              <Section icon={<Dice5 size={14} />} title="THE GOAL">
                Collect cards and evolve monsters to climb the levels. Each level
                unlocks new tile bonuses and bigger payouts.
              </Section>

              <Section icon={<Trophy size={14} />} title="HOW TO WIN">
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Land on <b>chest</b> 📦 or <b>star</b> ⭐ tiles to draw cards</li>
                  <li>Complete card sets for big bonuses + new monsters</li>
                  <li>Feed your pet 🍖 to evolve it (more coin %)</li>
                  <li>Reach Level 8 (Celestial Plane) — all rewards doubled!</li>
                </ul>
              </Section>

              <Section icon={<Sparkles size={14} />} title="EVENTS & MINI-GAME">
                Every 2.5 days a new season starts. Play the match-3 mini-game
                (1 roll per play) to earn special symbols and unlock seasonal
                rare/ultra-rare cards from the battle pass.
              </Section>

              {/* Quick odds */}
              <div className="bg-cream/95 rounded-lg border-2 border-wood-dark p-2.5 text-wood-dark">
                <div className="font-display text-[11px] mb-1.5">QUICK ODDS</div>
                <div className="grid grid-cols-2 gap-1 text-[11px] font-body">
                  <div>📦/⭐ tile (draws card): <b>20%</b></div>
                  <div>Card is Legendary: <b>5%</b></div>
                  <div>Mini-game symbol drop: <b>~8% per clear</b></div>
                  <div>Tier 4 rare card: <b>25 symbols</b></div>
                </div>
              </div>
            </div>

            {/* Advanced toggle */}
            <button
              onClick={() => setAdvanced((v) => !v)}
              className="mt-3 w-full bg-wood-dark/40 rounded-lg border-2 border-wood-dark px-3 py-2 flex items-center justify-between font-display text-[11px] text-cream-light"
            >
              <span>ADVANCED — full odds breakdown</span>
              {advanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <AnimatePresence>
              {advanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 mt-2">
                    <OddsTable
                      title="BOARD TILE WEIGHTS (per roll)"
                      headers={["Tile", "Chance", "Payout"]}
                      rows={BOARD_TILE_ODDS.map((t) => [
                        `${t.emoji} ${t.label}`,
                        t.chance,
                        t.payout,
                      ])}
                    />
                    <OddsTable
                      title="CARD RARITY (when card drawn)"
                      headers={["Rarity", "Chance", ""]}
                      rows={CARD_RARITY_ODDS.map((r) => [r.rarity, r.chance, ""])}
                    />
                    <div className="bg-cream/95 rounded-lg border-2 border-wood-dark p-2.5 text-wood-dark text-[11px] font-body space-y-1">
                      <div className="font-display text-[11px] mb-1">EXPECTED VALUE</div>
                      <p>• Drawing a Legendary on a single roll: <b>0.20 × 0.05 = 1%</b></p>
                      <p>• Avg coins per roll (basic dice, no bet): <b>~16</b></p>
                      <p>• Mini-game avg symbols per play (~600 score): <b>3–6</b></p>
                      <p>• Rolls to reach 75 symbols (no pass): <b>~15–25 plays</b></p>
                      <p>• Pass 2× multiplier halves that to <b>~8–12 plays</b></p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => {
                onClose();
                onReplayTutorial();
              }}
              className="btn-press w-full mt-3 py-2 rounded-full font-display text-sm"
            >
              REPLAY TUTORIAL
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-cream/95 rounded-lg border-2 border-wood-dark p-2.5 text-wood-dark">
      <div className="font-display text-[11px] mb-1 flex items-center gap-1.5">
        {icon} {title}
      </div>
      <div className="text-[12px] font-body leading-snug">{children}</div>
    </div>
  );
}

function OddsTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="bg-cream/95 rounded-lg border-2 border-wood-dark p-2.5">
      <div className="font-display text-[11px] text-wood-dark mb-1">{title}</div>
      <table className="w-full text-[11px] font-body text-wood-dark">
        <thead>
          <tr className="text-left border-b border-wood-dark/30">
            {headers.map((h) => (
              <th key={h} className="py-0.5 font-display font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-wood-dark/10 last:border-0">
              {r.map((cell, j) => (
                <td key={j} className="py-0.5 pr-1">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
