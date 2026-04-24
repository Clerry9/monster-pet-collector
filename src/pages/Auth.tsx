import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, User } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Account created! You're logged in.");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        toast.error("Google sign-in failed");
        return;
      }

      if (result.redirected) {
        return; // Browser will redirect
      }

      toast.success("Welcome!");
    } catch (err) {
      toast.error("Google sign-in failed");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
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
              required
              className="pl-10 bg-card border-border text-foreground"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="pl-10 bg-card border-border text-foreground"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold box-glow-green"
          >
            {loading ? "..." : isLogin ? "Log In" : "Sign Up"}
          </Button>
        </form>

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
            } catch (err: any) {
              toast.error(err.message || "Guest login failed");
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
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary underline cursor-pointer"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>

        <p className="text-center text-xs text-muted-foreground font-body">
          <Link to="/pricing" className="text-primary underline">Pricing</Link>
          {" · "}
          <Link to="/terms" className="text-primary underline">Terms</Link>
          {" · "}
          <Link to="/privacy" className="text-primary underline">Privacy</Link>
          {" · "}
          <Link to="/refund" className="text-primary underline">Refunds</Link>
        </p>
      </motion.div>
    </div>
  );
}
