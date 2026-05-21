/**
 * Lightweight notifications wrapper. Uses the standard Web Notifications API.
 * Schedules in-tab timers — works while the app is open in any tab; for
 * background delivery in an installed PWA, a future service-worker push
 * subscription can hook into the same scheduleAt() entry point.
 */
const TIMERS = new Map<string, number>();

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsGranted(): boolean {
  return notificationsSupported() && Notification.permission === "granted";
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

function show(title: string, body: string, tag: string) {
  if (!notificationsGranted()) return;
  try { new Notification(title, { body, tag, icon: "/placeholder.svg" }); } catch { /* ignore */ }
}

/** Schedule a notification at most once per `key` — reschedules cancel the previous timer. */
export function scheduleAt(key: string, atMs: number, title: string, body: string) {
  if (!notificationsGranted()) return;
  const existing = TIMERS.get(key);
  if (existing) window.clearTimeout(existing);
  const delay = Math.max(0, atMs - Date.now());
  // Cap at 24 hours so we never schedule absurd timers.
  if (delay > 24 * 60 * 60 * 1000) return;
  const id = window.setTimeout(() => { show(title, body, key); TIMERS.delete(key); }, delay);
  TIMERS.set(key, id);
}

export function cancelScheduled(key: string) {
  const existing = TIMERS.get(key);
  if (existing) { window.clearTimeout(existing); TIMERS.delete(key); }
}
