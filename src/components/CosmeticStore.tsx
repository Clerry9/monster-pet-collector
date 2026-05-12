import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CosmeticPreviewModal, type CosmeticDef, type CosmeticKind } from "./CosmeticPreviewModal";

interface CosmeticStoreProps {
  coins: number;
  onCoinsChanged: (next: number) => void;
}

const KIND_LABEL: Record<CosmeticKind, string> = {
  island_theme: "Island Themes",
  monster_glow: "Monster Glows",
  dice_skin: "Dice Skins",
};

const RARITY_RING: Record<string, string> = {
  common: "ring-cream/40",
  rare: "ring-sky-400/70",
  epic: "ring-fuchsia-400/80",
  legendary: "ring-amber-300/80",
};

type Filter = "all" | "owned" | "equipped";

export function CosmeticStore({ coins, onCoinsChanged }: CosmeticStoreProps) {
  const [defs, setDefs] = useState<CosmeticDef[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [equipped, setEquipped] = useState<Partial<Record<CosmeticKind, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const refresh = async () => {
    const { data: d } = await supabase
      .from("cosmetics_def")
      .select("*")
      .eq("enabled", true)
      .order("kind")
      .order("sort_order");
    setDefs((d as CosmeticDef[]) || []);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: uc }, { data: gs }] = await Promise.all([
      supabase.from("user_cosmetics").select("cosmetic_id").eq("user_id", u.user.id),
      supabase.from("game_state").select("equipped_cosmetics").eq("user_id", u.user.id).maybeSingle(),
    ]);
    setOwned(new Set((uc || []).map((r: { cosmetic_id: string }) => r.cosmetic_id)));
    setEquipped(((gs?.equipped_cosmetics as Partial<Record<CosmeticKind, string>>) || {}));
  };

  useEffect(() => {
    refresh();
  }, []);

  const previewDef = useMemo(
    () => defs.find((d) => d.id === previewId) || null,
    [defs, previewId],
  );

  const handleBuy = async (def: CosmeticDef) => {
    if (coins < def.price_coins) {
      toast.error("Not enough coins");
      return;
    }
    setBusy(def.id);
    const { error } = await supabase.rpc("buy_cosmetic", { p_cosmetic_id: def.id });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Unlocked ${def.name}`);
    onCoinsChanged(coins - def.price_coins);
    refresh();
  };

  const handleEquip = async (def: CosmeticDef) => {
    setBusy(def.id);
    const { error } = await supabase.rpc("equip_cosmetic", { p_cosmetic_id: def.id });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Equipped ${def.name}`);
    refresh();
  };

  const handleUnequip = async (def: CosmeticDef) => {
    setBusy(def.id);
    const { error } = await supabase.rpc("unequip_cosmetic", { p_kind: def.kind });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Unequipped");
    refresh();
  };

  const equippedSet = useMemo(
    () => new Set(Object.values(equipped).filter(Boolean) as string[]),
    [equipped],
  );

  const visibleDefs = useMemo(() => {
    if (filter === "owned") return defs.filter((d) => owned.has(d.id));
    if (filter === "equipped") return defs.filter((d) => equippedSet.has(d.id));
    return defs;
  }, [defs, filter, owned, equippedSet]);

  const grouped = (["island_theme", "monster_glow", "dice_skin"] as CosmeticKind[])
    .map((kind) => ({ kind, items: visibleDefs.filter((d) => d.kind === kind) }))
    .filter((g) => g.items.length > 0);

  const counts = {
    all: defs.length,
    owned: defs.filter((d) => owned.has(d.id)).length,
    equipped: defs.filter((d) => equippedSet.has(d.id)).length,
  };

  const FilterPill = ({ id, label }: { id: Filter; label: string }) => {
    const active = filter === id;
    return (
      <button
        type="button"
        onClick={() => setFilter(id)}
        className={`px-3 py-1 rounded-full text-[11px] font-display border-2 transition ${
          active
            ? "bg-gold text-wood-dark border-wood"
            : "bg-wood-dark/60 text-cream-light border-wood-dark hover:bg-wood-dark/80"
        }`}
      >
        {label} · {counts[id]}
      </button>
    );
  };

  return (
    <div className="panel-wood p-3 space-y-4">
      <div className="font-display text-sm text-cream-light text-center">✨ Cosmetic Store</div>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <FilterPill id="all" label="All" />
        <FilterPill id="owned" label="Owned" />
        <FilterPill id="equipped" label="Equipped" />
      </div>

      {grouped.length === 0 && (
        <div className="text-center text-cream/60 text-xs py-6">
          {filter === "owned"
            ? "You don't own any cosmetics yet."
            : filter === "equipped"
            ? "Nothing is equipped."
            : "No cosmetics available."}
        </div>
      )}

      {grouped.map(({ kind, items }) => (
        <div key={kind} className="space-y-2">
          <div className="text-[11px] font-display text-gold tracking-wide">{KIND_LABEL[kind]}</div>
          <div className="grid grid-cols-3 gap-2">
            {items.map((def) => {
              const isOwned = owned.has(def.id);
              const isEquipped = equipped[def.kind] === def.id;
              const ring = RARITY_RING[def.rarity] || RARITY_RING.common;
              return (
                <motion.button
                  key={def.id}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setPreviewId(def.id)}
                  className={`rounded-lg p-2 bg-wood-dark/40 border-2 border-wood-dark ring-2 ${ring} flex flex-col items-center gap-1 text-left ${
                    isEquipped ? "outline outline-2 outline-gold" : ""
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-full border-2 border-cream/40"
                    style={{ background: def.preview_color ?? "#888" }}
                    aria-hidden
                  />
                  <div className="text-[10px] font-display text-cream text-center leading-tight">{def.name}</div>
                  <div className="text-[9px] text-cream/70 uppercase">
                    {isEquipped ? "Equipped" : isOwned ? "Owned" : `🪙 ${def.price_coins}`}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}

      <CosmeticPreviewModal
        open={!!previewDef}
        onOpenChange={(v) => !v && setPreviewId(null)}
        def={previewDef}
        isOwned={previewDef ? owned.has(previewDef.id) : false}
        isEquipped={previewDef ? equipped[previewDef.kind] === previewDef.id : false}
        coins={coins}
        busy={!!busy && busy === previewDef?.id}
        onBuy={() => previewDef && handleBuy(previewDef)}
        onEquip={() => previewDef && handleEquip(previewDef)}
        onUnequip={() => previewDef && handleUnequip(previewDef)}
      />
    </div>
  );
}
