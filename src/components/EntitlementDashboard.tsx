import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Crown, Check, X as XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptions, isSubscriptionActive, type SubscriptionRow } from "@/hooks/useSubscription";
import { useSeason } from "@/hooks/useSeason";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { MONSTERS } from "@/data/monsters";
import { DICE_TIERS } from "@/hooks/useGameState";

interface DashProps {
  coins: number;
  rolls: number;
  energy: number;
  energyCap: number;
  islandStars: number;
  pendingCardFlips: number;
  level: number;
  xp: number;
  unlockedDiceTiers: string[];
  activeDiceTier: string;
  unlockedMonsters: string[];
}

const SUB_TIERS: Record<string, { name: string; perks: string }> = {
  collector_club_monthly: { name: "Collector Club", perks: "+50 rolls, +500 coins, +1 card flip every month" },
  monster_elite_monthly:  { name: "Monster Elite",  perks: "+200 rolls, +2,500 coins, +5 flips, +10 stars, gold dice + exclusive monsters" },
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function EntitlementDashboard(props: DashProps) {
  const { user } = useAuth();
  const { subscriptions, loading } = useSubscriptions();
  const season = useSeason();
  const { openCheckout, loading: coLoading } = usePaddleCheckout();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("purchases")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setPurchases(data ?? []));
  }, [user, subscriptions.length]);

  const handleSubAction = async (sub: SubscriptionRow, action: "cancel" | "resume") => {
    setBusyId(sub.paddle_subscription_id);
    try {
      const { error } = await supabase.functions.invoke("cancel-subscription", {
        body: { subscriptionId: sub.paddle_subscription_id, action },
      });
      if (error) throw error;
      toast.success(action === "cancel" ? "Cancellation scheduled" : "Subscription resumed", {
        description: action === "cancel" ? "You'll keep access until the period ends." : "Your membership will keep renewing.",
      });
    } catch (e: any) {
      toast.error("Action failed", { description: e?.message ?? "Try again later" });
    } finally {
      setBusyId(null);
    }
  };

  const handleSubscribe = (priceId: string) => {
    if (!user) return;
    void openCheckout({
      priceId,
      customerEmail: user.email ?? undefined,
      customData: { userId: user.id },
    });
  };

  const seasonDaysLeft = Math.max(0, Math.ceil(season.msRemaining / (24 * 60 * 60 * 1000)));

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      <div className="panel-wood p-4 space-y-2">
        <h2 className="font-display text-cream-light text-lg">My Account</h2>
        <p className="text-cream/70 text-xs">Live entitlement summary — credits, unlocks, and memberships.</p>
      </div>

      {/* Credits */}
      <div className="panel-wood p-4">
        <h3 className="font-display text-cream-light text-base mb-3">💰 Wallet & Credits</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <Stat label="Coins" value={props.coins.toLocaleString()} />
          <Stat label="Rolls" value={props.rolls.toLocaleString()} />
          <Stat label="Energy" value={`${props.energy} / ${props.energyCap}`} />
          <Stat label="Island Stars" value={`⭐ ${props.islandStars}`} />
          <Stat label="Card Flips" value={`🃏 ${props.pendingCardFlips}`} />
          <Stat label="Level" value={`L${props.level} · ${props.xp.toLocaleString()} XP`} />
        </div>
      </div>

      {/* Dice tiers */}
      <div className="panel-wood p-4">
        <h3 className="font-display text-cream-light text-base mb-3">🎲 Unlocked Dice Tiers</h3>
        <div className="flex flex-wrap gap-2">
          {DICE_TIERS.map((t) => {
            const owned = props.unlockedDiceTiers.includes(t.id);
            const active = props.activeDiceTier === t.id;
            return (
              <span key={t.id} className={`px-3 py-1 rounded-full text-xs font-display border-2 ${
                active ? "bg-gold text-wood-dark border-wood-dark" :
                owned ? "bg-cream/90 text-wood-dark border-wood-dark/50" :
                "bg-wood-dark/40 text-cream/40 border-wood-dark/40 line-through"
              }`}>
                {t.label}{active && " · ACTIVE"}
              </span>
            );
          })}
        </div>
      </div>

      {/* Monsters */}
      <div className="panel-wood p-4">
        <h3 className="font-display text-cream-light text-base mb-3">
          👾 Monsters Unlocked ({props.unlockedMonsters.length} / {MONSTERS.length})
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {MONSTERS.map((m) => {
            const owned = props.unlockedMonsters.includes(m.id);
            return (
              <div key={m.id} className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${owned ? "bg-cream/10 border-cream/30" : "bg-wood-dark/30 border-wood-dark opacity-40"}`}>
                <img src={m.image} alt={m.name} className="w-12 h-12 object-contain" />
                <span className="text-[10px] font-display text-cream text-center truncate w-full">{m.name}</span>
                {owned ? <Check size={12} className="text-emerald-400" /> : <XIcon size={12} className="text-cream/40" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Season pass */}
      <div className="panel-wood p-4">
        <h3 className="font-display text-cream-light text-base mb-3">🌟 Season Pass</h3>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-cream">
            <div className="font-display">{season.season.name}</div>
            <div className="text-xs text-cream/70">
              {season.progress.passPurchased ? <span className="text-gold">✓ Active</span> : <span>Free track only</span>} · ends in {seasonDaysLeft}d
            </div>
          </div>
          <span className="text-xs text-cream/60">One-time per season</span>
        </div>
      </div>

      {/* Subscriptions */}
      <div className="panel-wood p-4 space-y-3">
        <h3 className="font-display text-cream-light text-base flex items-center gap-2">
          <Crown size={16} /> Memberships
        </h3>

        {loading && <div className="text-cream/60 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={14}/> Loading…</div>}

        {!loading && subscriptions.length === 0 && (
          <div className="text-sm text-cream/70">No active membership yet.</div>
        )}

        {!loading && subscriptions.map((sub) => {
          const meta = SUB_TIERS[sub.price_id] ?? { name: sub.price_id, perks: "" };
          const active = isSubscriptionActive(sub);
          const canCancel = active && !sub.cancel_at_period_end && sub.status !== "canceled";
          const canResume = sub.cancel_at_period_end && sub.status !== "canceled";
          const busy = busyId === sub.paddle_subscription_id;
          return (
            <div key={sub.id} className="rounded-lg border-2 border-wood-dark bg-cream/10 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-cream-light">{meta.name}</div>
                  <div className="text-[11px] text-cream/70">{meta.perks}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-display ${
                  active ? (sub.cancel_at_period_end ? "bg-amber-400 text-wood-dark" : "bg-emerald-500 text-cream-light") : "bg-red-500 text-cream-light"
                }`}>
                  {sub.cancel_at_period_end ? "Cancels soon" : sub.status.toUpperCase()}
                </span>
              </div>
              <div className="text-[11px] text-cream/70">
                {sub.cancel_at_period_end
                  ? <>Access ends <strong>{fmtDate(sub.current_period_end)}</strong></>
                  : <>Renews <strong>{fmtDate(sub.current_period_end)}</strong></>}
              </div>
              <div className="flex gap-2 pt-1">
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => handleSubAction(sub, "cancel")}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-md bg-wood-dark text-cream-light text-xs font-display border-2 border-wood-dark hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? "…" : "Cancel at period end"}
                  </button>
                )}
                {canResume && (
                  <button
                    type="button"
                    onClick={() => handleSubAction(sub, "resume")}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-md bg-emerald-500 text-cream-light text-xs font-display border-2 border-wood-dark hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? "…" : "Resume membership"}
                  </button>
                )}
                {!active && (
                  <button
                    type="button"
                    onClick={() => handleSubscribe(sub.price_id)}
                    disabled={coLoading}
                    className="px-3 py-1.5 rounded-md bg-gold text-wood-dark text-xs font-display border-2 border-wood-dark hover:opacity-90 disabled:opacity-50"
                  >
                    Renew
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Available tiers */}
        <div className="pt-2 border-t border-wood-dark/40 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-cream/60 font-display">Available memberships</div>
          {Object.entries(SUB_TIERS).map(([priceId, meta]) => {
            const owned = subscriptions.some((s) => s.price_id === priceId && isSubscriptionActive(s));
            return (
              <div key={priceId} className="flex items-center justify-between gap-2 rounded-md bg-cream/5 p-2">
                <div className="min-w-0">
                  <div className="text-sm font-display text-cream-light">{meta.name}</div>
                  <div className="text-[11px] text-cream/70 truncate">{meta.perks}</div>
                </div>
                <button
                  type="button"
                  disabled={owned || coLoading}
                  onClick={() => handleSubscribe(priceId)}
                  className="px-3 py-1.5 rounded-md bg-gold text-wood-dark text-xs font-display border-2 border-wood-dark hover:opacity-90 disabled:opacity-50"
                >
                  {owned ? "Active" : "Subscribe"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Purchase history */}
      <div className="panel-wood p-4">
        <h3 className="font-display text-cream-light text-base mb-3">📜 Recent Purchases</h3>
        {purchases.length === 0 ? (
          <div className="text-cream/60 text-sm">No purchases yet.</div>
        ) : (
          <ul className="space-y-1 text-xs text-cream">
            {purchases.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 border-b border-wood-dark/30 pb-1">
                <span className="truncate">{p.pack_id ?? p.price_id}</span>
                <span className="text-cream/60 whitespace-nowrap">{fmtDate(p.created_at)} · {p.environment}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-cream/10 border border-wood-dark/40 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-cream/60 font-display">{label}</div>
      <div className="font-display text-cream-light tabular-nums">{value}</div>
    </div>
  );
}