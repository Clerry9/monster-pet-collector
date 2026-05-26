import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Action, ArenaRun, BattleState, TurnEvent } from "@/lib/combat";

export interface ArenaResponse {
  run: ArenaRun;
  battle: BattleState;
  events?: TurnEvent[];
  winner?: "attacker" | "defender" | "draw" | null;
  ended?: boolean;
}

async function callArena(body: Record<string, unknown>): Promise<ArenaResponse> {
  const { data, error } = await supabase.functions.invoke("arena-action", { body });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as ArenaResponse;
}

export function useArena() {
  const [run, setRun] = useState<ArenaRun | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvents, setLastEvents] = useState<TurnEvent[]>([]);
  const [lastResult, setLastResult] = useState<{ winner: string | null; ended: boolean } | null>(null);

  // Hydrate any in-progress run on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const { data: r } = await supabase
        .from("arena_runs").select("*").eq("user_id", uid)
        .in("status", ["active", "choosing"])
        .order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (cancelled) return;
      if (r) {
        setRun(r as ArenaRun);
        const { data: b } = await supabase.from("battles")
          .select("*").eq("arena_run_id", r.id).eq("status", "active")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (b && !cancelled) setBattle(b as unknown as BattleState);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handle = useCallback(async (body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await callArena(body);
      setRun(res.run);
      setBattle(res.battle);
      if (res.events) setLastEvents(res.events);
      if (res.winner !== undefined) {
        setLastResult({ winner: res.winner ?? null, ended: !!res.ended });
      } else {
        setLastResult(null);
      }
      return res;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const start = useCallback((monster_id: string, level: number) =>
    handle({ op: "start", monster_id, level }), [handle]);
  const turn = useCallback((action: Action) =>
    handle({ op: "turn", action }), [handle]);
  const choose = useCallback((choice: "heal" | "buff" | "skip") =>
    handle({ op: "choose", choice }), [handle]);
  const abandon = useCallback(async () => {
    const res = await handle({ op: "abandon" });
    setRun(null); setBattle(null);
    return res;
  }, [handle]);
  const reset = useCallback(() => {
    setRun(null); setBattle(null); setLastEvents([]); setLastResult(null);
  }, []);

  return { run, battle, loading, error, lastEvents, lastResult, start, turn, choose, abandon, reset };
}