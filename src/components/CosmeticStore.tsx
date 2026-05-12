import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CosmeticKind = "island_theme" | "monster_glow" | "dice_skin";

interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  name: string;
  description: string | null;
  price_coins: number;
  rarity: string;
  preview_color: string | null;
}

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
};

export function CosmeticStore({ coins, onCoinsChanged }: CosmeticStoreProps) {
  const [defs, setDefs] = useState<CosmeticDef[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [equipped, setEquipped] = useState<Partial<Record<CosmeticKind, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);

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
    const isEquipped = equipped[def.kind] === def.id;
    const { error } = isEquipped
      ? await supabase.rpc("unequip_cosmetic", { p_kind: def.kind })
      : await supabase.rpc("equip_cosmetic", { p_cosmetic_id: def.id });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isEquipped ? "Unequipped" : `Equipped ${def.name}`);
    refresh();
  };

  const grouped = (["island_theme", "monster_glow", "dice_skin"] as CosmeticKind[]).map((kind) => ({
    kind,
    items: defs.filter((d) => d.kind === kind),
  }));

  return (
    <div className="panel-wood p-3 space-y-4">
      <div className="font-display text-sm text-cream-light text-center">✨ Cosmetic Store</div>
      {grouped.map(({ kind, items }) => (
        <div key={kind} className="space-y-2">
          <div className="text-[11px] font-display text-gold tracking-wide">{KIND_LABEL[kind]}</div>
          <div className="grid grid-cols-3 gap-2">
            {items.map((def) => {
              const isOwned = owned.has(def.id);
              const isEquipped = equipped[def.kind] === def.id;
              const ring = RARITY_RING[def.rarity] || RARITY_RING.common;
              return (
                <motion.div
                  key={def.id}
                  whileHover={{ scale: 1.02 }}
                  className={`rounded-lg p-2 bg-wood-dark/40 border-2 border-wood-dark ring-2 ${ring} flex flex-col items-center gap-1`}
                >
                  <div
                    className="w-12 h-12 rounded-full border-2 border-cream/40"
                    style={{ background: def.preview_color ?? "#888" }}
                    aria-hidden
                  />
                  <div className="text-[10px] font-display text-cream text-center leading-tight">{def.name}</div>
                  <div className="text-[9px] text-cream/70 uppercase">{def.rarity}</div>
                  {isOwned ? (
                    <button
                      onClick={() => handleEquip(def)}
                      disabled={busy === def.id}
                      className={`w-full text-[10px] font-display py-1 rounded ${
                        isEquipped
                          ? "bg-candy-red text-cream"
                          : "bg-gold text-wood-dark"
                      } disabled:opacity-50`}
                    >
                      {isEquipped ? "Equipped" : "Equip"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuy(def)}
                      disabled={busy === def.id || coins < def.price_coins}
                      className="w-full text-[10px] font-display py-1 rounded bg-cream text-wood-dark disabled:opacity-50"
                    >
                      🪙 {def.price_coins}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}