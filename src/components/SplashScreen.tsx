import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Full-screen startup splash shown once per page load. Displays the app
 * logo/wordmark, auto-dismisses after ~1.8s, and can be tapped to skip.
 * Uses a sessionStorage flag so it only appears on the first visit per tab
 * session (avoids flashing every time the user navigates back to "/").
 */
const SESSION_KEY = "lov_splash_shown_v1";

export function SplashScreen() {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return sessionStorage.getItem(SESSION_KEY) !== "1"; } catch { return true; }
  });

  useEffect(() => {
    if (!visible) return;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    const t = window.setTimeout(() => setVisible(false), 1800);
    return () => window.clearTimeout(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-label="Loading Monster Pet Collection"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => setVisible(false)}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer"
          style={{ background: "radial-gradient(ellipse at center, hsl(var(--wood)) 0%, hsl(var(--background)) 100%)" }}
        >
          <motion.img
            src="/app-icon.png"
            alt="Monster Pet Collection"
            initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 140 }}
            className="w-32 h-32 rounded-3xl shadow-chunky-sm border-4 border-gold"
          />
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-6 font-display text-3xl tracking-wider text-gold drop-shadow-[0_2px_0_hsl(var(--wood-dark))]"
          >
            MONSTER PET
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="font-display text-xs uppercase tracking-[0.3em] text-cream-light/80 mt-1"
          >
            Collection
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ delay: 0.9, duration: 1.4, repeat: Infinity }}
            className="mt-10 text-[10px] uppercase tracking-widest text-cream/60"
          >
            Tap to continue
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
