import { useEffect, useState } from "react";

interface Props {
  tileType: string | null;
  steps: number | null;
  isRolling: boolean;
  showResult: boolean;
  absoluteStep: number;
  spinningProp: boolean;
}

/**
 * Temporary diagnostic HUD for the lottery wheel. Enable with
 *   localStorage.setItem("lov_lottery_debug", "1")
 * or by appending `?lotteryDebug=1` to the URL.
 */
export function LotteryDebugOverlay({ tileType, steps, isRolling, showResult, absoluteStep, spinningProp }: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("lotteryDebug") === "1") localStorage.setItem("lov_lottery_debug", "1");
      setEnabled(localStorage.getItem("lov_lottery_debug") === "1");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line no-console
    console.debug("[lottery]", { tileType, steps, isRolling, showResult, absoluteStep, spinningProp });
  }, [enabled, tileType, steps, isRolling, showResult, absoluteStep, spinningProp]);

  if (!enabled) return null;
  return (
    <div className="pointer-events-none absolute top-2 right-2 z-50 rounded bg-black/70 px-2 py-1 font-mono text-[10px] leading-tight text-green-300">
      <div>tile: {tileType ?? "—"}</div>
      <div>steps: {steps ?? "—"}</div>
      <div>isRolling: {String(isRolling)}</div>
      <div>showResult: {String(showResult)}</div>
      <div>spinning: {String(spinningProp)}</div>
      <div>key/absStep: {absoluteStep}</div>
    </div>
  );
}