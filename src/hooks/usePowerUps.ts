import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PowerUpRow {
  power_up_id: string;
  quantity: number;
}

export function usePowerUps() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || user.is_anonymous) { setInventory({}); return; }
    const { data } = await supabase
      .from("user_power_ups")
      .select("power_up_id, quantity")
      .eq("user_id", user.id);
    const map: Record<string, number> = {};
    (data ?? []).forEach((r: PowerUpRow) => { map[r.power_up_id] = r.quantity; });
    setInventory(map);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const buy = useCallback(async (id: string, qty = 1) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("purchase_power_up", { p_power_up_id: id, p_quantity: qty });
      if (error) throw error;
      await refresh();
      toast.success("Boost purchased!");
    } catch (e) {
      toast.error((e as Error).message || "Purchase failed");
    } finally { setLoading(false); }
  }, [refresh]);

  const useEnergyTonic = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("use_energy_tonic");
      if (error) throw error;
      await refresh();
      toast.success("Energy refilled!");
    } catch (e) {
      toast.error((e as Error).message || "Could not use tonic");
    } finally { setLoading(false); }
  }, [refresh]);

  const qty = (id: string) => inventory[id] ?? 0;

  return { inventory, qty, loading, refresh, buy, useEnergyTonic };
}