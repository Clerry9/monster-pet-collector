import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export type CosmeticKind = "island_theme" | "monster_glow" | "dice_skin";

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  name: string;
  description: string | null;
  price_coins: number;
  rarity: string;
  preview_color: string | null;
  asset_key?: string | null;
}

const RARITY_BADGE: Record<string, string> = {
  common: "bg-cream/30 text-cream",
  rare: "bg-sky-500/30 text-sky-100",
  epic: "bg-fuchsia-500/30 text-fuchsia-100",
  legendary: "bg-amber-400/40 text-amber-50",
};

function LargePreview({ def }: { def: CosmeticDef }) {
  const color = def.preview_color ?? "#888";
  if (def.kind === "monster_glow") {
    return (
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-80 animate-pulse"
          style={{ background: color }}
        />
        <div className="relative w-24 h-24 rounded-full bg-wood-dark border-4 border-cream/40 flex items-center justify-center text-5xl">
          🐲
        </div>
      </div>
    );
  }
  if (def.kind === "dice_skin") {
    return (
      <div
        className="w-32 h-32 rounded-2xl border-4 border-cream/40 shadow-lg flex items-center justify-center text-5xl font-display"
        style={{ background: color, color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}
      >
        ⚄
      </div>
    );
  }
  // island_theme
  return (
    <div
      className="w-40 h-32 rounded-xl border-4 border-cream/40 shadow-lg relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
    >
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-3xl">🏝️</div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  def: CosmeticDef | null;
  isOwned: boolean;
  isEquipped: boolean;
  coins: number;
  busy: boolean;
  onBuy: () => void;
  onEquip: () => void;
  onUnequip: () => void;
}

export function CosmeticPreviewModal({
  open, onOpenChange, def, isOwned, isEquipped, coins, busy, onBuy, onEquip, onUnequip,
}: Props) {
  if (!def) return null;
  const badge = RARITY_BADGE[def.rarity] || RARITY_BADGE.common;
  const canAfford = coins >= def.price_coins;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-wood-dark border-4 border-wood text-cream max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-cream-light text-lg">{def.name}</DialogTitle>
          <DialogDescription className="text-cream/70 text-xs">
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide ${badge}`}>
              {def.rarity}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <LargePreview def={def} />
          <p className="text-sm text-cream/90 text-center min-h-[2.5rem]">
            {def.description || "A unique cosmetic to personalize your journey."}
          </p>
          {def.asset_key && (
            <div className="text-[10px] text-cream/40 font-mono">{def.asset_key}</div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          {!isOwned && (
            <button
              onClick={onBuy}
              disabled={busy || !canAfford}
              className="flex-1 font-display py-2 rounded-lg bg-gold text-wood-dark border-2 border-wood disabled:opacity-50 hover:scale-105 transition"
            >
              {canAfford ? `Buy 🪙 ${def.price_coins}` : `Need 🪙 ${def.price_coins}`}
            </button>
          )}
          {isOwned && !isEquipped && (
            <button
              onClick={onEquip}
              disabled={busy}
              className="flex-1 font-display py-2 rounded-lg bg-gold text-wood-dark border-2 border-wood disabled:opacity-50 hover:scale-105 transition"
            >
              Equip
            </button>
          )}
          {isOwned && isEquipped && (
            <button
              onClick={onUnequip}
              disabled={busy}
              className="flex-1 font-display py-2 rounded-lg bg-candy-red text-cream border-2 border-wood disabled:opacity-50 hover:scale-105 transition"
            >
              Unequip
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
