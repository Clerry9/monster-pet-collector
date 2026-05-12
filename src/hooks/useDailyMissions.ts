import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface DailyMission {
  id: string;
  code: string;
  target: number;
  progress: number;
  completed_at: string | null;
  claimed_at: string | null;
  mission_date: string;
  // hydrated from missions_def
  title?: string;
  description?: string;
  reward_kind?: string;
  reward_amount?: number;
}

export interface MissionDef {
  code: string;
  title: string;
  description: string;
  target: number;
  reward_kind: string;
  reward_amount: number;
}

export function useDailyMissions() {
  const { user } = useAuth();
  const [defs, setDefs] = useState<Record<string, MissionDef>>({});
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [loading, setLoading] = useState(true);

  // Load catalog
  useEffect(() => {
    void (async () => {
      const { data } = await (supabase as any)
        .from("missions_def")
        .select("code,title,description,target,reward_kind,reward_amount")
        .eq("enabled", true);
      const map: Record<string, MissionDef> = {};
      for (const d of (data ?? []) as MissionDef[]) map[d.code] = d;
      setDefs(map);
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).rpc("get_or_roll_daily_missions");
    if (error) {
      console.warn("[missions] rpc failed", error);
      setLoading(false);
      return;
    }
    setMissions((data ?? []) as DailyMission[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Auto-bump the "login" mission once on first load each day
  useEffect(() => {
    if (!user || missions.length === 0) return;
    const login = missions.find((m) => m.code === "login");
    if (login && login.progress < login.target) {
      void bump("login", 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, missions.length]);

  const bump = useCallback(
    async (code: string, delta = 1) => {
      if (!user) return;
      // Optimistic local update
      setMissions((prev) =>
        prev.map((m) =>
          m.code === code && !m.claimed_at
            ? { ...m, progress: Math.min(m.progress + delta, m.target) }
            : m,
        ),
      );
      await (supabase as any).rpc("bump_mission_progress", { p_code: code, p_delta: delta });
    },
    [user],
  );

  const claim = useCallback(
    async (code: string) => {
      if (!user) return;
      const { error } = await (supabase as any).rpc("claim_mission", { p_code: code });
      if (error) {
        toast.error(error.message ?? "Could not claim");
        return;
      }
      const def = defs[code];
      if (def) {
        toast.success("Mission claimed!", {
          description: `+${def.reward_amount} ${def.reward_kind}`,
        });
      }
      await refresh();
    },
    [user, defs, refresh],
  );

  const list: DailyMission[] = missions
    .map((m) => ({ ...m, ...(defs[m.code] ?? {}) }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const unclaimedCount = list.filter(
    (m) => m.progress >= m.target && !m.claimed_at,
  ).length;

  return { list, loading, claim, bump, refresh, unclaimedCount };
}
