import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
function getEnv(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

export interface SubscriptionRow {
  id: string;
  paddle_subscription_id: string;
  paddle_customer_id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
  created_at: string;
}

export function useSubscriptions() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setSubs([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("environment", getEnv())
      .order("created_at", { ascending: false });
    setSubs((data as SubscriptionRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`subs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => { void refetch(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refetch]);

  return { subscriptions: subs, loading, refetch, environment: getEnv() };
}

export function isSubscriptionActive(s: SubscriptionRow): boolean {
  const end = s.current_period_end ? Date.parse(s.current_period_end) : null;
  const inPeriod = end == null || end > Date.now();
  if (s.status === "active" || s.status === "trialing" || s.status === "past_due") return inPeriod;
  if (s.status === "canceled") return end != null && end > Date.now();
  return false;
}