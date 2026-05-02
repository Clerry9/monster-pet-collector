import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Footer } from "@/components/Footer";
import { reportAuthError } from "@/lib/authErrors";

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password is too long" })
  .regex(/[A-Za-z]/, { message: "Password must contain a letter" })
  .regex(/[0-9]/, { message: "Password must contain a number" });

/**
 * Dedicated /reset-password page. Supabase recovery emails redirect here,
 * which automatically establishes a temporary session that lets the user
 * call updateUser({ password }) without re-authenticating.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Wait for the recovery session to be established. Supabase fires a
  // PASSWORD_RECOVERY event after parsing the URL hash.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      toast.success("Password updated");
    } catch (err) {
      reportAuthError("password-reset", err, () => handleSubmit(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <section className="w-full max-w-sm space-y-5 rounded-lg border border-border bg-card p-6 text-center shadow-lg">
            <h1 className="font-display text-3xl text-primary text-glow-green">All set!</h1>
            <p className="font-body text-sm text-muted-foreground">
              Your password was updated. You can now continue playing with your new password.
            </p>
            <Button
              onClick={() => navigate("/", { replace: true })}
              className="w-full bg-primary text-primary-foreground font-bold"
            >
              Continue
            </Button>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <motion.section
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm space-y-5"
        >
          <header className="text-center space-y-1">
            <h1 className="font-display text-3xl text-foreground text-glow-purple">Set a new password</h1>
            <p className="font-body text-sm text-muted-foreground">
              Choose a strong password you'll remember.
            </p>
          </header>

          {!ready && (
            <p className="text-xs text-center text-muted-foreground font-body">
              Verifying your recovery link…
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={!ready}
                className="pl-10 bg-card border-border text-foreground"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={!ready}
                className="pl-10 bg-card border-border text-foreground"
              />
            </div>
            {error && <p className="text-xs text-destructive font-body">{error}</p>}
            <Button
              type="submit"
              disabled={!ready || submitting}
              className="w-full bg-primary text-primary-foreground font-bold box-glow-green"
            >
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}