/**
 * Notifications wrapper. Prefers the background service worker (sw.js) so
 * scheduled reminders fire even when the tab is closed. Falls back to an
 * in-tab setTimeout when SW is unavailable.
 */
const TIMERS = new Map<string, number>();

function swController(): ServiceWorker | null {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.controller;
}

async function swReady(): Promise<ServiceWorker | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg.active ?? swController();
  } catch { return null; }
}

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
  // Prefer the SW so the reminder fires while the tab is closed.
  swReady().then((sw) => {
    if (sw) {
      sw.postMessage({ type: "schedule", key, atMs, title, body });
      return;
    }
    // In-tab fallback.
    const existing = TIMERS.get(key);
    if (existing) window.clearTimeout(existing);
    const delay = Math.max(0, atMs - Date.now());
    if (delay > 24 * 60 * 60 * 1000) return;
    const id = window.setTimeout(() => { show(title, body, key); TIMERS.delete(key); }, delay);
    TIMERS.set(key, id);
  });
}

export function cancelScheduled(key: string) {
  const existing = TIMERS.get(key);
  if (existing) { window.clearTimeout(existing); TIMERS.delete(key); }
  swReady().then((sw) => { if (sw) sw.postMessage({ type: "cancel", key }); });
}
