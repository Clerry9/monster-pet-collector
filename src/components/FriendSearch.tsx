import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { MONSTERS } from "@/data/monsters";

const KEY = "lov_friend_search_enabled";
const CHANGED_EVENT = "friend-search:changed";
const NEXT_EVENT = "friend-search:next";
const FORCE_EVENT = "friend-search:force";

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

/** Force the next friend-search bubble to fire on the next tick. */
export function forceFriendBubble() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(FORCE_EVENT));
}

/**
 * Subscribe to next-bubble timestamp updates. Listener receives an epoch ms
 * value (or null when the loop is paused/disabled).
 */
export function subscribeFriendSearchNext(cb: (nextAt: number | null) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<number | null>;
    cb(ce.detail ?? null);
  };
  window.addEventListener(NEXT_EVENT, handler);
  return () => window.removeEventListener(NEXT_EVENT, handler);
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
    if (paused) {
      setVisible(null);
      window.dispatchEvent(new CustomEvent(NEXT_EVENT, { detail: null }));
      return;
    }
    if (!getFriendSearchEnabled()) {
      window.dispatchEvent(new CustomEvent(NEXT_EVENT, { detail: null }));
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    const fire = () => {
        if (cancelled) return;
        // Re-check toggle on each tick so disabling without remount takes effect.
        if (!getFriendSearchEnabled()) return;
        const friends = MONSTERS.filter((m) => m.id !== activeMonsterId);
        if (friends.length === 0) { schedule(); return; }
        const friend = friends[Math.floor(Math.random() * friends.length)];
        setVisible({ id: friend.id, emoji: friend.image });
        hideTimer = setTimeout(() => { if (!cancelled) setVisible(null); schedule(); }, 1600);
    };
    const schedule = (forced = false) => {
      const wait = forced ? 0 : 8000 + Math.random() * 6000;
      const nextAt = Date.now() + wait;
      window.dispatchEvent(new CustomEvent(NEXT_EVENT, { detail: nextAt }));
      timer = setTimeout(fire, wait);
    };
    const onForce = () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
      schedule(true);
    };
    window.addEventListener(FORCE_EVENT, onForce);
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(hideTimer);
      window.removeEventListener(FORCE_EVENT, onForce);
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