import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptions, isSubscriptionActive, type SubscriptionRow } from "@/hooks/useSubscription";
import { Footer } from "@/components/Footer";

type PurchaseRow = {
  id: string;
  created_at: string;
  paddle_transaction_id: string;
  product_id: string;
  price_id: string;
  pack_id: string | null;
  rolls_granted: number;
  status: string;
  environment: string;
};

type Row =
  | { kind: "purchase"; date: string; row: PurchaseRow }
  | { kind: "subscription"; date: string; row: SubscriptionRow };

const PAGE_SIZE = 15;
type Filter = "all" | "one_time" | "subscription" | "active" | "canceled";

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PurchaseHistoryPage = () => {
  const { user } = useAuth();
  const { subscriptions, loading: subsLoading } = useSubscriptions();
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void supabase
      .from("purchases")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setPurchases((data as PurchaseRow[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  const merged: Row[] = useMemo(() => {
    const a: Row[] = purchases.map((p) => ({ kind: "purchase", date: p.created_at, row: p }));
    const b: Row[] = subscriptions.map((s) => ({ kind: "subscription", date: s.created_at, row: s }));
    return [...a, ...b].sort((x, y) => Date.parse(y.date) - Date.parse(x.date));
  }, [purchases, subscriptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return merged.filter((r) => {
      if (filter === "one_time" && r.kind !== "purchase") return false;
      if (filter === "subscription" && r.kind !== "subscription") return false;
      if (filter === "active" && r.kind === "subscription" && !isSubscriptionActive(r.row)) return false;
      if (filter === "active" && r.kind === "purchase" && r.row.status !== "completed") return false;
      if (filter === "canceled") {
        if (r.kind !== "subscription") return false;
        if (r.row.status !== "canceled" && !r.row.cancel_at_period_end) return false;
      }
      if (q) {
        const hay = r.kind === "purchase"
          ? `${r.row.pack_id ?? ""} ${r.row.price_id} ${r.row.product_id} ${r.row.paddle_transaction_id}`
          : `${r.row.price_id} ${r.row.product_id} ${r.row.paddle_subscription_id} ${r.row.status}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [merged, filter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filter, query]);

  if (!user) {
    return (
      <main className="min-h-screen bg-background text-foreground p-6">
        <Link to="/" className="text-primary underline text-sm">← Back to game</Link>
        <p className="mt-4">Please sign in to view your purchase history.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8">
      <article className="mx-auto max-w-3xl space-y-4">
        <Link to="/" className="text-primary underline text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> Back to game
        </Link>
        <h1 className="font-display text-3xl text-primary">Purchase History</h1>
        <p className="text-muted-foreground text-sm">
          Every one-time purchase and subscription event tied to your account.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            aria-label="Filter purchases"
          >
            <option value="all">All transactions</option>
            <option value="one_time">One-time purchases</option>
            <option value="subscription">Subscriptions</option>
            <option value="active">Active only</option>
            <option value="canceled">Canceled / ending</option>
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pack, product, or transaction id…"
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm"
            aria-label="Search purchases"
          />
        </div>

        {(loading || subsLoading) && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="animate-spin" size={14} /> Loading transactions…
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground text-sm">
            No transactions match your filters.
          </div>
        )}

        <ul className="space-y-2">
          {pageRows.map((r) => (
            <li key={`${r.kind}-${r.kind === "purchase" ? r.row.id : r.row.id}`}
                className="rounded-lg border border-border bg-card p-3 text-sm">
              {r.kind === "purchase" ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-base">
                      {r.row.pack_id ?? r.row.price_id}
                      <span className="ml-2 text-[10px] uppercase rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
                        one-time
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.row.product_id} · {r.row.paddle_transaction_id}
                    </div>
                    {r.row.rolls_granted > 0 && (
                      <div className="text-xs text-primary">+{r.row.rolls_granted} rolls granted</div>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    <div>{fmtDate(r.row.created_at)}</div>
                    <div className="opacity-70">{r.row.status} · {r.row.environment}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-base">
                      {r.row.price_id}
                      <span className="ml-2 text-[10px] uppercase rounded px-1.5 py-0.5 bg-muted text-muted-foreground">
                        subscription
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.row.product_id} · {r.row.paddle_subscription_id}
                    </div>
                    <div className="text-xs">
                      Status: <strong>{r.row.status}</strong>
                      {r.row.cancel_at_period_end && <span className="ml-2 text-amber-500">cancels at period end</span>}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    <div>Started {fmtDate(r.row.created_at)}</div>
                    {r.row.current_period_end && <div>Renews {fmtDate(r.row.current_period_end)}</div>}
                    <div className="opacity-70">{r.row.environment}</div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
            >
              ← Previous
            </button>
            <span className="text-muted-foreground">Page {safePage} of {totalPages} · {filtered.length} total</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
      </article>
      <Footer />
    </main>
  );
};

export default PurchaseHistoryPage;