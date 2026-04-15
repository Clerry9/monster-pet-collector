import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function usePurchaseSync(addRolls: (n: number) => void) {
  const { user } = useAuth();
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const checkForNewPurchases = useCallback(async () => {
    if (!user) return;

    const query = supabase
      .from("purchases")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5);

    if (lastCheck) {
      query.gt("created_at", lastCheck);
    }

    const { data } = await query;

    if (data && data.length > 0) {
      setLastCheck(data[0].created_at);
    }
  }, [user, lastCheck]);

  // Poll for new purchases every 5 seconds after checkout
  useEffect(() => {
    if (!user) return;

    // Initial check
    checkForNewPurchases();

    // Poll periodically to catch webhook-fulfilled purchases
    const interval = setInterval(checkForNewPurchases, 5000);
    return () => clearInterval(interval);
  }, [user, checkForNewPurchases]);
}
