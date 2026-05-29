import { useState } from "react";
import { POWER_UPS_BY_KIND, type PowerUpKind } from "@/data/powerUps";
import { usePowerUps } from "@/hooks/usePowerUps";

interface Props {
  kind: PowerUpKind;
  /** Max number of boosts that can be selected per battle. */
  max?: number;
  onChange?: (selected: string[]) => void;
}

/**
 * Lets the player pick up to `max` owned boosts to apply to the next
 * battle. Selected ids are reported via onChange so the parent can pass
 * them to start-run RPC. Boosts are only consumed when the run begins.
 */
export function PreBattleBoostBar({ kind, max = 2, onChange }: Props) {
  const { qty } = usePowerUps();
  const [selected, setSelected] = useState<string[]>([]);
  const items = POWER_UPS_BY_KIND(kind);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < max ? [...prev, id] : prev;
      onChange?.(next);
      return next;
    });
  };

  const ownedAny = items.some((p) => qty(p.id) > 0);

  return (
    <div className="panel-wood rounded-lg p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="font-display text-cream-light text-[11px] tracking-wide">⚡ Boosts (pick up to {max})</div>
        <div className="text-[9px] text-cream/60">{selected.length}/{max} selected</div>
      </div>
      {!ownedAny && (
        <div className="text-[10px] text-cream/60 italic">
          No boosts owned. Buy some in the Shop tab → Boosts.
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((p) => {
          const owned = qty(p.id);
          const isSel = selected.includes(p.id);
          const disabled = owned <= 0 || p.preview || (!isSel && selected.length >= max);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => !disabled && toggle(p.id)}
              disabled={disabled}
              title={p.preview ? "Coming soon — buyable now, full effect in a later update." : p.description}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-left transition-colors ${
                isSel
                  ? "bg-gold/30 border-gold"
                  : "bg-wood-dark/50 border-wood-dark hover:border-gold/60"
              } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <span className="text-base">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-cream-light font-display truncate">{p.name}</div>
                <div className="text-[8px] text-cream/60">×{owned}{p.preview ? " · SOON" : ""}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}