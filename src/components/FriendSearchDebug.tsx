import { useEffect, useState } from "react";
import {
  forceFriendBubble,
  getFriendSearchEnabled,
  setFriendSearchEnabled,
  subscribeFriendSearchNext,
} from "@/components/FriendSearch";

export type FriendSearchPauseReason = "idle" | "rolling" | "hopping" | "reveal";

function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("debug") === "friend") return true;
  return localStorage.getItem("lov_debug_friend") === "1";
}

/**
 * Floating QA panel — only mounts when `?debug=friend` is set or
 * `localStorage.lov_debug_friend === "1"`. Shows live FriendSearch state.
 */
export function FriendSearchDebug({ pausedReason }: { pausedReason: FriendSearchPauseReason }) {
  const [show, setShow] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setShow(isDebugEnabled());
    setEnabled(getFriendSearchEnabled());
    const onChange = () => setEnabled(getFriendSearchEnabled());
    window.addEventListener("friend-search:changed", onChange);
    const off = subscribeFriendSearchNext((ts) => setNextAt(ts));
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => {
      window.removeEventListener("friend-search:changed", onChange);
      off();
      clearInterval(t);
    };
  }, []);

  if (!show) return null;

  const remaining = nextAt ? Math.max(0, Math.round((nextAt - now) / 100) / 10) : null;

  return (
    <div
      className="fixed bottom-3 left-3 z-[200] rounded-md border border-wood-dark bg-card/95 px-3 py-2 text-xs shadow-chunky-sm font-mono"
      data-testid="friend-search-debug"
      aria-label="FriendSearch debug panel"
    >
      <div className="font-bold mb-1 text-foreground">FriendSearch QA</div>
      <div>enabled: <b>{enabled ? "ON" : "OFF"}</b></div>
      <div>paused:  <b>{pausedReason}</b></div>
      <div>next:    <b>{remaining === null ? "—" : `${remaining}s`}</b></div>
      <div className="mt-2 flex gap-1">
        <button
          className="rounded bg-primary text-primary-foreground px-2 py-0.5"
          onClick={() => forceFriendBubble()}
        >
          Force
        </button>
        <button
          className="rounded bg-secondary text-secondary-foreground px-2 py-0.5"
          onClick={() => setFriendSearchEnabled(!enabled)}
        >
          Toggle
        </button>
      </div>
    </div>
  );
}