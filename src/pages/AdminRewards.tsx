import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { SHARED_POOL } from "@/data/rewardPool";
import { toast } from "sonner";

interface OverrideRow {
  static_label: string;
  weight: number;
  min_amount: number | null;
  max_amount: number | null;
  emoji: string | null;
  enabled: boolean;
}

export default function AdminRewards() {
  const { isAdmin, loading } = useUserRole();
  const [rows, setRows] = useState<Record<string, OverrideRow>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("reward_pool_overrides").select("*").then(({ data }) => {
      const m: Record<string, OverrideRow> = {};
      (data ?? []).forEach((r: any) => { m[r.static_label] = r; });
      // Seed missing entries from defaults so admins see all rows.
      SHARED_POOL.forEach((t) => {
        if (!m[t.staticLabel]) {
          m[t.staticLabel] = {
            static_label: t.staticLabel,
            weight: t.weight,
            min_amount: null,
            max_amount: null,
            emoji: t.emoji,
            enabled: true,
          };
        }
      });
      setRows(m);
    });
  }, [isAdmin]);

  if (loading) return <div className="p-8 font-display text-foreground">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const totalWeight = Object.values(rows).reduce((s, r) => s + (r.enabled ? r.weight : 0), 0) || 1;

  const update = (label: string, patch: Partial<OverrideRow>) => {
    setRows((cur) => ({ ...cur, [label]: { ...cur[label], ...patch } }));
  };

  const save = async () => {
    setSaving(true);
    const payload = Object.values(rows).map((r) => ({
      static_label: r.static_label,
      weight: r.weight,
      min_amount: r.min_amount,
      max_amount: r.max_amount,
      emoji: r.emoji,
      enabled: r.enabled,
    }));
    const { error } = await supabase
      .from("reward_pool_overrides")
      .upsert(payload, { onConflict: "static_label" });
    setSaving(false);
    if (error) toast.error("Failed to save", { description: error.message });
    else toast.success("Reward pool updated");
  };

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl text-primary">Reward Pool Admin</h1>
          <Link to="/" className="text-sm underline">← Back</Link>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Edit shared reward weights and amount ranges. Changes apply to both the Lucky Roulette and Island Reward roulettes everywhere.
        </p>
        <table className="w-full text-sm border border-border">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left">Reward</th>
              <th className="p-2">Enabled</th>
              <th className="p-2">Weight</th>
              <th className="p-2">Odds</th>
              <th className="p-2">Min amount</th>
              <th className="p-2">Max amount</th>
              <th className="p-2">Emoji</th>
            </tr>
          </thead>
          <tbody>
            {SHARED_POOL.map((t) => {
              const r = rows[t.staticLabel];
              if (!r) return null;
              const odds = r.enabled ? ((r.weight / totalWeight) * 100).toFixed(1) : "0.0";
              return (
                <tr key={t.staticLabel} className="border-t border-border">
                  <td className="p-2 font-display">{t.staticLabel}</td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      onChange={(e) => update(t.staticLabel, { enabled: e.target.checked })}
                      aria-label={`${t.staticLabel} enabled`}
                    />
                  </td>
                  <td className="p-2"><input type="number" min={0} value={r.weight} onChange={(e) => update(t.staticLabel, { weight: Math.max(0, parseInt(e.target.value) || 0) })} className="w-20 border border-border rounded px-1 bg-background" /></td>
                  <td className="p-2 tabular-nums">{odds}%</td>
                  <td className="p-2"><input type="number" value={r.min_amount ?? ""} placeholder="default" onChange={(e) => update(t.staticLabel, { min_amount: e.target.value === "" ? null : parseInt(e.target.value) })} className="w-24 border border-border rounded px-1 bg-background" /></td>
                  <td className="p-2"><input type="number" value={r.max_amount ?? ""} placeholder="default" onChange={(e) => update(t.staticLabel, { max_amount: e.target.value === "" ? null : parseInt(e.target.value) })} className="w-24 border border-border rounded px-1 bg-background" /></td>
                  <td className="p-2"><input value={r.emoji ?? ""} onChange={(e) => update(t.staticLabel, { emoji: e.target.value })} className="w-14 border border-border rounded px-1 bg-background text-center" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button onClick={save} disabled={saving} className="mt-4 px-4 py-2 rounded bg-primary text-primary-foreground font-display disabled:opacity-50">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </main>
  );
}
