import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const result = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Defer side-effects (DB write) so we don't deadlock the auth state listener.
        if (session?.user) setTimeout(() => ensureGuestProfile(session.user), 0);
      });
      subscription = result.data.subscription;

      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          if (session?.user) setTimeout(() => ensureGuestProfile(session.user), 0);
        })
        .catch((err) => {
          console.error("Auth initialization failed:", err);
          setInitError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        });
    } catch (err) {
      console.error("Auth subscription failed:", err);
      setInitError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }

    return () => {
      try {
        subscription?.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="font-display text-2xl text-primary text-glow-green animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
        <section className="w-full max-w-md space-y-5 rounded-lg border border-border bg-card p-6 text-center shadow-lg">
          <div className="space-y-2">
            <h1 className="font-display text-3xl text-primary">Authentication unavailable</h1>
            <p className="font-body text-sm text-muted-foreground">
              We couldn't initialize your session. Please reload the page to try again.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 font-body text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reload page
          </button>
        </section>
      </main>
    );
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// --- Guest helpers ---

const GUEST_ADJECTIVES = ["Fuzzy", "Sneaky", "Mighty", "Wobbly", "Spooky", "Glitter", "Cosmic", "Plucky", "Crispy", "Zappy", "Furious", "Doodle", "Snazzy"];
const GUEST_CREATURES = ["Goblin", "Slime", "Yeti", "Imp", "Drake", "Wisp", "Beast", "Gremlin", "Sprite", "Critter", "Mog", "Bogle"];

function generateGuestName(): string {
  const a = GUEST_ADJECTIVES[Math.floor(Math.random() * GUEST_ADJECTIVES.length)];
  const c = GUEST_CREATURES[Math.floor(Math.random() * GUEST_CREATURES.length)];
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `${a}${c}${n}`;
}

async function ensureGuestProfile(user: User) {
  if (!user.is_anonymous) return;
  try {
    // Source of truth precedence: profiles.display_name (server) → user_metadata.guest_name → newly generated.
    // We always reconcile so re-auth events for the same anon user end up with the SAME name in
    // both profiles.display_name AND user_metadata.guest_name.
    const metaName = (user.user_metadata as Record<string, unknown> | null)?.guest_name as string | undefined;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const finalName = profile?.display_name || metaName || generateGuestName();

    if (!profile?.display_name) {
      await supabase.from("profiles").upsert(
        { user_id: user.id, display_name: finalName },
        { onConflict: "user_id" }
      );
    }
    if (metaName !== finalName) {
      await supabase.auth.updateUser({ data: { guest_name: finalName } });
    }
  } catch {
    // Non-fatal — guest can still play without a display name.
  }
}
