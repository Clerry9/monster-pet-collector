import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AnalyticsRow {
  id: string;
  user_id: string;
  pack_id: string;
  price_id: string | null;
  paddle_transaction_id: string | null;
  event: string;
  rolls_granted: number;
  coins_granted: number;
  stars_granted: number;
  cards_granted: number;
  dice_tier: string | null;
  monsters_granted: string[];
  environment: string;
  created_at: string;
}

const PAGE_SIZE = 50;

export default function AdminPackAnalytics() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [packIds, setPackIds] = useState<string[]>([]);

  // Filters
  const [userFilter, setUserFilter] = useState("");
  const [packFilter, setPackFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();

  // Load distinct pack ids once for the filter dropdown.
  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("pack_analytics")
      .select("pack_id")
      .limit(1000)
      .then(({ data }) => {
        const ids = Array.from(new Set((data ?? []).map((r: any) => r.pack_id))).sort();
        setPackIds(ids);
      });
  }, [isAdmin]);

  const fetchPage = async (reset: boolean) => {
    setLoading(true);
    let q = supabase
      .from("pack_analytics")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1);
    const trimmedUser = userFilter.trim();
    if (trimmedUser) q = q.eq("user_id", trimmedUser);
    if (packFilter !== "all") q = q.eq("pack_id", packFilter);
    if (eventFilter !== "all") q = q.eq("event", eventFilter);
    if (from) q = q.gte("created_at", from.toISOString());
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    if (!reset && rows.length > 0) {
      q = q.lt("created_at", rows[rows.length - 1].created_at);
    }
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast.error("Failed to load analytics", { description: error.message });
      return;
    }
    const list = (data ?? []) as AnalyticsRow[];
    const more = list.length > PAGE_SIZE;
    const trimmed = more ? list.slice(0, PAGE_SIZE) : list;
    setHasMore(more);
    setRows(reset ? trimmed : [...rows, ...trimmed]);
  };

  // Initial load + reload when filters change.
  useEffect(() => {
    if (!isAdmin) return;
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, userFilter, packFilter, eventFilter, from, to]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.cards += r.cards_granted ?? 0;
        acc.rolls += r.rolls_granted ?? 0;
        acc.coins += r.coins_granted ?? 0;
        acc.stars += r.stars_granted ?? 0;
        return acc;
      },
      { cards: 0, rolls: 0, coins: 0, stars: 0 },
    );
  }, [rows]);

  if (roleLoading) return <div className="p-8 font-display text-foreground">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-2xl text-primary">Pack Analytics</h1>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/admin/rewards" className="underline">Rewards</Link>
            <Link to="/" className="underline">← Back</Link>
          </div>
        </div>

        {/* Filters */}
        <section className="grid gap-3 md:grid-cols-5 mb-4">
          <div>
            <Label className="text-xs">User ID</Label>
            <Input
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="UUID"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Pack</Label>
            <Select value={packFilter} onValueChange={setPackFilter}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All packs</SelectItem>
                {packIds.map((id) => (
                  <SelectItem key={id} value={id}>{id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Event</Label>
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="pack_fulfilled">pack_fulfilled</SelectItem>
                <SelectItem value="purchase_initiated">purchase_initiated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("mt-1 w-full justify-start text-left font-normal", !from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {from ? format(from, "PPP") : "Any"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={from} onSelect={setFrom} className={cn("p-3 pointer-events-auto")} />
                {from && <div className="p-2 border-t"><Button size="sm" variant="ghost" onClick={() => setFrom(undefined)}>Clear</Button></div>}
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("mt-1 w-full justify-start text-left font-normal", !to && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {to ? format(to, "PPP") : "Any"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={to} onSelect={setTo} className={cn("p-3 pointer-events-auto")} />
                {to && <div className="p-2 border-t"><Button size="sm" variant="ghost" onClick={() => setTo(undefined)}>Clear</Button></div>}
              </PopoverContent>
            </Popover>
          </div>
        </section>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4 text-sm">
          <div className="rounded border border-border p-2"><div className="text-muted-foreground text-xs">Rows</div><div className="font-display text-lg">{rows.length}{hasMore ? "+" : ""}</div></div>
          <div className="rounded border border-border p-2"><div className="text-muted-foreground text-xs">Cards granted</div><div className="font-display text-lg">{summary.cards}</div></div>
          <div className="rounded border border-border p-2"><div className="text-muted-foreground text-xs">Rolls/Spins granted</div><div className="font-display text-lg">{summary.rolls}</div></div>
          <div className="rounded border border-border p-2"><div className="text-muted-foreground text-xs">Coins granted</div><div className="font-display text-lg">{summary.coins.toLocaleString()}</div></div>
          <div className="rounded border border-border p-2"><div className="text-muted-foreground text-xs">Stars granted</div><div className="font-display text-lg">{summary.stars}</div></div>
        </div>

        <div className="rounded border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Cards</TableHead>
                <TableHead className="text-right">Rolls</TableHead>
                <TableHead className="text-right">Coins</TableHead>
                <TableHead className="text-right">Stars</TableHead>
                <TableHead>Dice</TableHead>
                <TableHead>Env</TableHead>
                <TableHead>Tx</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                  <TableCell className="text-xs">{r.event}</TableCell>
                  <TableCell className="font-mono text-xs">{r.pack_id}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(r.user_id); toast.success("User ID copied"); }}
                      className="underline-offset-2 hover:underline"
                      title={r.user_id}
                    >
                      {r.user_id.slice(0, 8)}…
                    </button>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.cards_granted}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.rolls_granted}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.coins_granted}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.stars_granted}</TableCell>
                  <TableCell className="text-xs">{r.dice_tier ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.environment}</TableCell>
                  <TableCell className="font-mono text-[10px] truncate max-w-[120px]" title={r.paddle_transaction_id ?? ""}>
                    {r.paddle_transaction_id ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !loading && (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No rows match.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          {hasMore && (
            <Button onClick={() => fetchPage(false)} disabled={loading} variant="outline">
              {loading ? "Loading…" : "Load more"}
            </Button>
          )}
          {loading && rows.length === 0 && <span className="text-sm text-muted-foreground">Loading…</span>}
        </div>
      </div>
    </main>
  );
}