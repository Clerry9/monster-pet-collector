import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, User } from "lucide-react";
import { Footer } from "@/components/Footer";
import { reportAuthError } from "@/lib/authErrors";

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email" }).max(255),
  password: z.string().min(1, { message: "Password is required" }).max(72),
});

const signupSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email" }).max(255),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(72, { message: "Password is too long" })
    .regex(/[A-Za-z]/, { message: "Password must contain a letter" })
    .regex(/[0-9]/, { message: "Password must contain a number" }),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";
  const successRedirect = fromPath && fromPath !== "/auth" ? fromPath : "/";

  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const schema = isLogin ? loginSchema : signupSchema;
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as "email" | "password";
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate(successRedirect, { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Account created! You're logged in.");
        navigate(successRedirect, { replace: true });
      }
    } catch (err) {
      reportAuthError(isLogin ? "sign-in" : "sign-up", err, () => handleEmailAuth(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}${successRedirect}`,
      });

      if (result.error) {
        reportAuthError("google-sign-in", result.error, handleGoogleAuth);
        return;
      }

      if (result.redirected) {
        return; // Browser will redirect
      }

      toast.success("Welcome!");
      navigate(successRedirect, { replace: true });
    } catch (err) {
      reportAuthError("google-sign-in", err, handleGoogleAuth);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    const emailParse = z.string().trim().email().max(255).safeParse(email);
    if (!emailParse.success) {
      setFieldErrors({ email: "Enter a valid email" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailParse.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      reportAuthError("password-reset-request", err, () => handleForgotPassword(e));
    } finally {
      setLoading(false);
    }
  };

  // --- Forgot password subview ---
  if (showForgot) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm space-y-5"
          >
            <div className="text-center">
              <h1 className="font-display text-3xl text-foreground text-glow-purple mb-2">
                Reset your password
              </h1>
              <p className="text-muted-foreground font-body text-sm">
                {resetSent
                  ? "Check your inbox for a password reset link."
                  : "We'll email you a link to set a new password."}
              </p>
            </div>

            {!resetSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    aria-invalid={!!fieldErrors.email}
                    className="pl-10 bg-card border-border text-foreground"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-destructive font-body">{fieldErrors.email}</p>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-bold box-glow-green"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            ) : (
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="text-sm font-body text-foreground">
                  If an account exists for <strong>{email}</strong>, a reset link is on its way.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setShowForgot(false); setResetSent(false); }}
              className="block w-full text-center text-xs text-primary underline cursor-pointer font-body"
            >
              Back to sign in
            </button>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <h1 className="font-display text-4xl text-foreground text-glow-purple mb-2">
            Monster Mash
          </h1>
          <p className="text-muted-foreground font-body text-sm">
            {isLogin ? "Welcome back, monster trainer!" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={!!fieldErrors.email}
              className="pl-10 bg-card border-border text-foreground"
            />
          </div>
          {fieldErrors.email && (
            <p className="text-xs text-destructive font-body">{fieldErrors.email}</p>
          )}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
              aria-invalid={!!fieldErrors.password}
              className="pl-10 bg-card border-border text-foreground"
            />
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-destructive font-body">{fieldErrors.password}</p>
          )}
          {!isLogin && !fieldErrors.password && (
            <p className="text-xs text-muted-foreground font-body">
              At least 8 characters, with a letter and a number.
            </p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold box-glow-green"
          >
            {loading ? "..." : isLogin ? "Log In" : "Sign Up"}
          </Button>
        </form>

        {isLogin && (
          <div className="text-center -mt-2">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-xs text-muted-foreground hover:text-primary underline font-body"
            >
              Forgot password?
            </button>
          </div>
        )}

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-body">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button
          onClick={async () => {
            try {
              const { error } = await supabase.auth.signInAnonymously();
              if (error) throw error;
              toast.success("Playing as guest!");
            } catch (err) {
              reportAuthError("guest-sign-in", err);
            }
          }}
          variant="outline"
          className="w-full border-border text-foreground hover:bg-card"
        >
          <User className="w-4 h-4 mr-2" />
          Play as Guest
        </Button>

        <Button
          onClick={handleGoogleAuth}
          variant="outline"
          className="w-full border-border text-foreground hover:bg-card"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </Button>

        <p className="text-center text-xs text-muted-foreground font-body">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setFieldErrors({});
            }}
            className="text-primary underline cursor-pointer"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </motion.div>
      </div>
      <Footer />
    </div>
  );
}
