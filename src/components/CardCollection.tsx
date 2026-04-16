import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CARD_SETS, GameCard, RARITY_COLORS, RARITY_GLOW, CardRarity } from "@/data/cards";
import { CheckCircle, Lock, Gift, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  collectedCards: string[];
  coins: number;
}

const rarityLabel: Record<CardRarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export function CardCollection({ collectedCards, coins }: Props) {
  const [expandedSet, setExpandedSet] = useState<string | null>(null);

  return (
    <div className="w-full" role="region" aria-label="Card collection">
      <h3 className="font-display text-2xl text-foreground mb-1 text-glow-purple">
        Card Collection
      </h3>
      <p className="text-xs text-muted-foreground mb-4 font-body">
        Collect cards from 🎁 Chest and ⭐ Star tiles to earn rewards!
      </p>

      <div className="space-y-3">
        {CARD_SETS.map((set) => {
          const collected = set.cards.filter((c) => collectedCards.includes(c.id));
          const isComplete = collected.length === set.cards.length;
          const isExpanded = expandedSet === set.id;
          const progress = collected.length / set.cards.length;

          return (
            <div key={set.id} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Set header */}
              <button
                onClick={() => setExpandedSet(isExpanded ? null : set.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                aria-expanded={isExpanded}
              >
                <span className="text-2xl" aria-hidden="true">{set.emoji}</span>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-body text-sm text-foreground">{set.name}</span>
                    {isComplete && <CheckCircle className="w-4 h-4 text-primary" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{set.description}</span>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${isComplete ? "bg-primary" : "bg-secondary"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    {collected.length}/{set.cards.length} collected
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </button>

              {/* Set bonus */}
              <div className={`mx-3 mb-2 px-2.5 py-1.5 rounded-lg text-[10px] font-body flex items-center gap-1.5 ${
                isComplete ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
              }`}>
                <Gift size={12} />
                <span className="font-bold">Set Bonus:</span>
                <span>{set.setBonus.description}</span>
                {isComplete && <CheckCircle size={11} />}
              </div>

              {/* Expanded card list */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-2 p-3 pt-1">
                      {set.cards.map((card) => {
                        const owned = collectedCards.includes(card.id);
                        return (
                          <CardItem key={card.id} card={card} owned={owned} />
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardItem({ card, owned }: { card: GameCard; owned: boolean }) {
  return (
    <motion.div
      whileHover={owned ? { scale: 1.03 } : undefined}
      className={`relative rounded-lg border-2 p-2.5 transition-all ${
        owned
          ? `${RARITY_COLORS[card.rarity]} ${RARITY_GLOW[card.rarity]}`
          : "border-border/40 bg-muted/20 opacity-50"
      }`}
    >
      {!owned && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/50 z-10">
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-2xl">{card.emoji}</span>
        <span className="text-[11px] font-bold font-body text-foreground leading-tight">{card.name}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
          card.rarity === "legendary" ? "bg-accent/20 text-accent"
            : card.rarity === "epic" ? "bg-secondary/20 text-secondary"
            : card.rarity === "rare" ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        }`}>
          {rarityLabel[card.rarity]}
        </span>
        {owned && (
          <span className="text-[9px] text-muted-foreground leading-tight">{card.description}</span>
        )}
        {owned && card.reward.type === "coins" && (
          <span className="text-[9px] font-bold text-accent">+{card.reward.amount} 🪙</span>
        )}
        {owned && card.reward.type === "monster" && (
          <span className="text-[9px] font-bold text-secondary">🔓 Monster</span>
        )}
      </div>
    </motion.div>
  );
}
