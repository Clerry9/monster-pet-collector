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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Defer side-effects (DB write) so we don't deadlock the auth state listener.
        if (session?.user) setTimeout(() => ensureGuestProfile(session.user), 0);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) setTimeout(() => ensureGuestProfile(session.user), 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

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
    // Use the cached name from user_metadata if present so it survives across sessions for the same anon user.
    const metaName = (user.user_metadata as Record<string, unknown> | null)?.guest_name as string | undefined;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.display_name) {
      if (!metaName) await supabase.auth.updateUser({ data: { guest_name: profile.display_name } });
      return;
    }
    const name = metaName || generateGuestName();
    await supabase.from("profiles").upsert(
      { user_id: user.id, display_name: name },
      { onConflict: "user_id" }
    );
    if (!metaName) await supabase.auth.updateUser({ data: { guest_name: name } });
  } catch {
    // Non-fatal — guest can still play without a display name.
  }
}
