/* Lovable background notifications service worker.
 * Receives schedule/cancel messages from the page and fires
 * showNotification() via setTimeout even when the tab is closed.
 * Timers are persisted to IndexedDB and re-armed on activate so
 * reminders survive SW restarts. */

const DB_NAME = "lov-notify";
const STORE = "scheduled";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "key" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putRecord(rec) {
  const db = await openDB();
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(rec);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}
async function deleteRecord(key) {
  const db = await openDB();
  await new Promise((res) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
  db.close();
}
async function allRecords() {
  const db = await openDB();
  const list = await new Promise((res) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => res([]);
  });
  db.close();
  return list;
}

const TIMERS = new Map();

function arm(rec) {
  const existing = TIMERS.get(rec.key);
  if (existing) clearTimeout(existing);
  const delay = Math.max(0, rec.atMs - Date.now());
  // Cap at 24h so absurd timers don't pin the SW.
  if (delay > 24 * 60 * 60 * 1000) return;
  const id = setTimeout(() => {
    self.registration.showNotification(rec.title, {
      body: rec.body,
      tag: rec.key,
      icon: "/placeholder.svg",
      badge: "/placeholder.svg",
    });
    TIMERS.delete(rec.key);
    deleteRecord(rec.key);
  }, delay);
  TIMERS.set(rec.key, id);
}

self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    await self.clients.claim();
    const recs = await allRecords();
    recs.forEach(arm);
  })());
});

self.addEventListener("message", (e) => {
  const data = e.data || {};
  if (data.type === "schedule") {
    const rec = { key: data.key, atMs: data.atMs, title: data.title, body: data.body };
    e.waitUntil(putRecord(rec).then(() => arm(rec)));
  } else if (data.type === "cancel") {
    const t = TIMERS.get(data.key);
    if (t) { clearTimeout(t); TIMERS.delete(data.key); }
    e.waitUntil(deleteRecord(data.key));
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((cs) => {
    if (cs.length) return cs[0].focus();
    return self.clients.openWindow("/");
  }));
});