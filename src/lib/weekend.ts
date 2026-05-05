// Weekend event: every Saturday & Sunday (player local time) coin payouts get
// a 2× multiplier and a bonus banner shows in the HUD. Pure helpers only —
// no React, no side effects, so this is safe to import from game logic.

export function isWeekend(now: Date = new Date()): boolean {
  const day = now.getDay();
  return day === 0 || day === 6; // Sun or Sat
}

export const WEEKEND_COIN_MULTIPLIER = 2;

export function getWeekendCoinMultiplier(now: Date = new Date()): number {
  return isWeekend(now) ? WEEKEND_COIN_MULTIPLIER : 1;
}

/** ms until weekend ends (end of Sunday local) or until next Saturday starts. */
export function msUntilWeekendBoundary(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(0, 0, 0, 0);
  if (isWeekend(now)) {
    // End of Sunday
    const daysToMonday = next.getDay() === 0 ? 1 : 2; // Sun→1, Sat→2
    next.setDate(next.getDate() + daysToMonday);
  } else {
    // Next Saturday
    const daysToSat = (6 - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + daysToSat);
  }
  return Math.max(0, next.getTime() - now.getTime());
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}