/**
 * Single source of truth for "should the lottery debug overlay + console
 * logs be active?". Production builds default to OFF and can only be
 * force-enabled by setting `VITE_LOTTERY_DEBUG=1` at build time.
 *
 * Dev builds remain enabled via the existing `?lotteryDebug=1` query
 * param or `localStorage.lov_lottery_debug=1`, unless `VITE_LOTTERY_DEBUG=0`
 * explicitly disables them.
 */
const ENV_FLAG = (import.meta as any).env?.VITE_LOTTERY_DEBUG as string | undefined;
const IS_DEV = !!(import.meta as any).env?.DEV;

export function isLotteryDebugEnabled(): boolean {
  if (ENV_FLAG === "1") return true;
  if (ENV_FLAG === "0") return false;
  if (!IS_DEV) return false;
  if (typeof window === "undefined") return false;
  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("lotteryDebug") === "1") {
      localStorage.setItem("lov_lottery_debug", "1");
      return true;
    }
    return localStorage.getItem("lov_lottery_debug") === "1";
  } catch {
    return false;
  }
}

export function lotteryDebugLog(...args: unknown[]): void {
  if (!isLotteryDebugEnabled()) return;
  // eslint-disable-next-line no-console
  console.debug("[lottery]", ...args);
}