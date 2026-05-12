import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

type CosmeticKind = "island_theme" | "monster_glow" | "dice_skin";

interface Row {
  id: string;
  kind: CosmeticKind;
  name: string;
  description: string | null;
  price_coins: number;
  rarity: string;
  preview_color: string | null;
  asset_key: string | null;
  sort_order: number;
  enabled: boolean;
}

const KINDS: CosmeticKind[] = ["island_theme", "monster_glow", "dice_skin"];
const RARITIES = ["common", "rare", "epic", "legendary"];

const blankRow: Omit<Row, never> = {
  id: "",
  kind: "island_theme",
  name: "",
  description: "",
  price_coins: 100,
  rarity: "common",
  preview_color: "#888888",
  asset_key: "",
  sort_order: 0,
  enabled: true,
};

export default function AdminCosmetics() {
  const { isAdmin, loading } = useUserRole();
  const [rows, setRows] = useState<Row[]>([]);
  const [owners, setOwners] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Row>({ ...blankRow });
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = async () => {
    const { data } = await supabase
      .from("cosmetics_def")
      .select("*")
      .order("kind")
      .order("sort_order");
    setRows((data as Row[]) || []);
    const { data: oc } = await supabase.from("user_cosmetics").select("cosmetic_id");
    const counts: Record<string, number> = {};
    (oc || []).forEach((r: { cosmetic_id: string }) => {
      counts[r.cosmetic_id] = (counts[r.cosmetic_id] || 0) + 1;
    });
    setOwners(counts);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  if (loading) return <div className="p-8 font-display text-foreground">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const updateField = (id: string, patch: Partial<Row>) => {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const saveRow = async (r: Row) => {
    setSavingId(r.id);
    const { error } = await supabase.from("cosmetics_def").update({
      kind: r.kind,
      name: r.name,
      description: r.description,
      price_coins: r.price_coins,
      rarity: r.rarity,
      preview_color: r.preview_color,
      asset_key: r.asset_key,
      sort_order: r.sort_order,
      enabled: r.enabled,
    }).eq("id", r.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${r.name}`);
  };

  const toggleEnabled = async (r: Row) => {
    const next = !r.enabled;
    const { error } = await supabase.from("cosmetics_def").update({ enabled: next }).eq("id", r.id);
    if (error) return toast.error(error.message);
    updateField(r.id, { enabled: next });
    toast.success(next ? "Enabled" : "Disabled");
  };

  const deleteRow = async (r: Row) => {
    const count = owners[r.id] || 0;
    if (count > 0) {
      toast.error(`Can't delete — ${count} player(s) own this`);
      return;
    }
    if (!confirm(`Delete ${r.name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("cosmetics_def").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  const createRow = async () => {
    if (!draft.id || !draft.name) {
      toast.error("ID and name are required");
      return;
    }
    const { error } = await supabase.from("cosmetics_def").insert({
      id: draft.id,
      kind: draft.kind,
      name: draft.name,
      description: draft.description,
      price_coins: draft.price_coins,
      rarity: draft.rarity,
      preview_color: draft.preview_color,
      asset_key: draft.asset_key,
      sort_order: draft.sort_order,
      enabled: draft.enabled,
    });
    if (error) return toast.error(error.message);
    toast.success(`Created ${draft.name}`);
    setDraft({ ...blankRow });
    refresh();
  };

  const grouped = KINDS.map((k) => ({ kind: k, items: rows.filter((r) => r.kind === k) }));

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Admin · Cosmetics</h1>
        <Link to="/" className="text-sm text-primary hover:underline">← Back</Link>
      </div>

      {/* Add new */}
      <section className="rounded-xl border border-border p-4 bg-card space-y-2">
        <div className="font-display text-sm">Add cosmetic</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Input label="ID (slug)" value={draft.id} onChange={(v) => setDraft({ ...draft, id: v })} />
          <Select label="Kind" value={draft.kind} options={KINDS} onChange={(v) => setDraft({ ...draft, kind: v as CosmeticKind })} />
          <Input label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <Select label="Rarity" value={draft.rarity} options={RARITIES} onChange={(v) => setDraft({ ...draft, rarity: v })} />
          <Input label="Price (coins)" type="number" value={String(draft.price_coins)} onChange={(v) => setDraft({ ...draft, price_coins: Number(v) || 0 })} />
          <Input label="Sort order" type="number" value={String(draft.sort_order)} onChange={(v) => setDraft({ ...draft, sort_order: Number(v) || 0 })} />
          <Input label="Preview color" value={draft.preview_color || ""} onChange={(v) => setDraft({ ...draft, preview_color: v })} />
          <Input label="Asset key" value={draft.asset_key || ""} onChange={(v) => setDraft({ ...draft, asset_key: v })} />
          <div className="col-span-2 md:col-span-4">
            <Input label="Description" value={draft.description || ""} onChange={(v) => setDraft({ ...draft, description: v })} />
          </div>
        </div>
        <button onClick={createRow} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-display text-sm hover:opacity-90">
          Create
        </button>
      </section>

      {grouped.map(({ kind, items }) => (
        <section key={kind} className="space-y-2">
          <h2 className="font-display text-lg text-primary">{kind}</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr className="text-left">
                  <th className="p-2">ID</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">Rarity</th>
                  <th className="p-2">Color</th>
                  <th className="p-2">Asset</th>
                  <th className="p-2">Sort</th>
                  <th className="p-2">Owners</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-2 font-mono text-[11px]">{r.id}</td>
                    <td className="p-2">
                      <input
                        className="w-32 bg-background border border-border rounded px-1 py-0.5"
                        value={r.name}
                        onChange={(e) => updateField(r.id, { name: e.target.value })}
                      />
                      <input
                        className="w-32 mt-1 bg-background border border-border rounded px-1 py-0.5 text-[10px]"
                        value={r.description || ""}
                        placeholder="description"
                        onChange={(e) => updateField(r.id, { description: e.target.value })}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        className="w-20 bg-background border border-border rounded px-1 py-0.5"
                        value={r.price_coins}
                        onChange={(e) => updateField(r.id, { price_coins: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="p-2">
                      <select
                        className="bg-background border border-border rounded px-1 py-0.5"
                        value={r.rarity}
                        onChange={(e) => updateField(r.id, { rarity: e.target.value })}
                      >
                        {RARITIES.map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        className="w-24 bg-background border border-border rounded px-1 py-0.5 font-mono text-[10px]"
                        value={r.preview_color || ""}
                        onChange={(e) => updateField(r.id, { preview_color: e.target.value })}
                      />
                      <div className="w-6 h-6 mt-1 rounded border border-border" style={{ background: r.preview_color || "#888" }} />
                    </td>
                    <td className="p-2">
                      <input
                        className="w-28 bg-background border border-border rounded px-1 py-0.5 font-mono text-[10px]"
                        value={r.asset_key || ""}
                        onChange={(e) => updateField(r.id, { asset_key: e.target.value })}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        className="w-14 bg-background border border-border rounded px-1 py-0.5"
                        value={r.sort_order}
                        onChange={(e) => updateField(r.id, { sort_order: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="p-2">{owners[r.id] || 0}</td>
                    <td className="p-2">
                      <button
                        onClick={() => toggleEnabled(r)}
                        className={`px-2 py-0.5 rounded text-[10px] ${r.enabled ? "bg-green-600/30 text-green-200" : "bg-muted text-muted-foreground"}`}
                      >
                        {r.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                    <td className="p-2 space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => saveRow(r)}
                        disabled={savingId === r.id}
                        className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => deleteRow(r)}
                        className="px-2 py-0.5 rounded bg-destructive text-destructive-foreground text-[10px]"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={10} className="p-4 text-center text-muted-foreground">No items.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background border border-border rounded px-2 py-1"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background border border-border rounded px-2 py-1"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
