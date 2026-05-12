import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { MONSTERS } from "@/data/monsters";

const KEY = "lov_friend_search_enabled";
const CHANGED_EVENT = "friend-search:changed";

export function getFriendSearchEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEY) !== "0";
}

export function setFriendSearchEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
    window.dispatchEvent(new Event(CHANGED_EVENT));
  } catch { /* ignore */ }
}

interface FriendSearchProps {
  /** Active monster id — excluded from the friend pool. */
  activeMonsterId: string;
  /** Pause the loop while rolling, hopping, or a card reveal is open. */
  paused?: boolean;
  className?: string;
}

/**
 * Idle "looking for a friend" loop: every 8–14 s the active monster emits
 * a 🔍 thought bubble plus a tiny silhouette of a random other monster.
 * Purely decorative — does not affect gameplay.
 */
export function FriendSearch({ activeMonsterId, paused = false, className = "" }: FriendSearchProps) {
  const [visible, setVisible] = useState<{ id: string; emoji: string } | null>(null);
  const [enabledTick, setEnabledTick] = useState(0);

  // Re-run the schedule effect whenever the toggle flips.
  useEffect(() => {
    const onChange = () => setEnabledTick((n) => n + 1);
    window.addEventListener(CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (paused) { setVisible(null); return; }
    if (!getFriendSearchEnabled()) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const wait = 8000 + Math.random() * 6000;
      timer = setTimeout(() => {
        if (cancelled) return;
        // Re-check toggle on each tick so disabling without remount takes effect.
        if (!getFriendSearchEnabled()) return;
        const friends = MONSTERS.filter((m) => m.id !== activeMonsterId);
        if (friends.length === 0) { schedule(); return; }
        const friend = friends[Math.floor(Math.random() * friends.length)];
        setVisible({ id: friend.id, emoji: friend.image });
        hideTimer = setTimeout(() => { if (!cancelled) setVisible(null); schedule(); }, 1600);
      }, wait);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [activeMonsterId, paused, enabledTick]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={visible.id}
          initial={{ opacity: 0, y: 6, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className={`pointer-events-none flex items-center gap-1 rounded-full bg-card/90 border border-wood-dark/50 px-2 py-0.5 text-xs shadow ${className}`}
          aria-hidden="true"
        >
          <span>🔍</span>
          <img
            src={visible.emoji}
            alt=""
            className="w-5 h-5 object-contain"
            style={{ filter: "grayscale(0.4)" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}