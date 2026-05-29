import { Link } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuestAccountGateProps {
  feature: string;
  description?: string;
}

/**
 * Full-screen gate shown when a guest (anonymous) account tries to enter
 * a feature that requires a real account — PvP, Arena, etc.
 *
 * The underlying tables (game_state, achievements, daily_missions, …) have
 * RLS policies that explicitly reject anonymous JWTs, so a guest literally
 * has no roster to play with. Sending them to /auth to create or link an
 * account is the only path forward without weakening DB security.
 */
export function GuestAccountGate({ feature, description }: GuestAccountGateProps) {
  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-primary underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to game
        </Link>

        <div className="rounded-2xl border border-primary/30 bg-card/50 p-8 space-y-4 shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>

          <h1 className="font-display text-3xl text-primary">
            Create an account to play {feature}
          </h1>

          <p className="text-sm text-muted-foreground">
            {description ??
              `${feature} needs a saved roster, ranking, and rewards — guests don't have one. Sign up (it's free) or link your guest progress to keep playing.`}
          </p>

          <div className="space-y-2 pt-2">
            <Button asChild className="w-full" size="lg">
              <Link to="/auth">Create account / Sign in</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full" size="sm">
              <Link to="/">Keep playing as guest</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}