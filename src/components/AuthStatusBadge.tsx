import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User as UserIcon, Loader2 } from "lucide-react";
import { reportAuthError } from "@/lib/authErrors";
import { toast } from "sonner";

/**
 * Compact header widget that mirrors the user's auth state:
 * - Loading: shows a spinner
 * - Signed in: shows email/guest tag + sign-out button
 * - Signed out (rare in protected views): shows nothing
 */
export function AuthStatusBadge({ compact = false }: { compact?: boolean }) {
  const { user, loading, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 border border-cream-light/20 text-cream-light text-[10px] font-display"
        aria-live="polite"
        aria-label="Authenticating"
      >
        <Loader2 size={12} className="animate-spin" />
        <span>Authenticating…</span>
      </div>
    );
  }

  if (!user) return null;

  const isGuest = user.is_anonymous === true;
  const label = isGuest
    ? ((user.user_metadata as Record<string, unknown> | null)?.guest_name as string | undefined) ?? "Guest"
    : user.email ?? "Signed in";

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      toast.success("Signed out");
    } catch (err) {
      reportAuthError("sign-out", err, handleSignOut);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/45 border border-cream-light/20 text-cream-light text-[10px] font-display max-w-[160px]"
        aria-label={isGuest ? `Signed in as guest ${label}` : `Signed in as ${label}`}
        title={label}
      >
        <UserIcon size={12} />
        <span className="truncate">{compact ? (isGuest ? "Guest" : label.split("@")[0]) : label}</span>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={busy}
        className="icon-tile-gold w-9 h-9 flex items-center justify-center disabled:opacity-50"
        title="Sign Out"
        aria-label="Sign Out"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={16} />}
      </button>
    </div>
  );
}