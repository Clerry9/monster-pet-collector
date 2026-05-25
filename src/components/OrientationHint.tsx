import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X as XIcon } from "lucide-react";

const LS_KEY = "lov_orient_hint_dismissed_v1";

/**
 * Non-blocking banner that suggests rotating the device when the user is on
 * a small portrait phone where the board controls would clip. Dismissal is
 * persisted to localStorage so it only nags once.
 */
export function OrientationHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { if (localStorage.getItem(LS_KEY) === "1") return; } catch { /* ignore */ }
    const mq = window.matchMedia("(orientation: portrait) and (max-width: 480px)");
    const sync = () => setShow(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(LS_KEY, "1"); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 rounded-full border border-amber-500/70 bg-amber-100/95 text-amber-900 px-3 py-1.5 shadow-chunky-sm text-xs font-display"
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">🔄</span>
          <span>Rotate your device for the best view</span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss rotate hint"
            className="ml-1 w-5 h-5 inline-flex items-center justify-center rounded-full hover:bg-amber-900/15"
          >
            <XIcon size={12} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}