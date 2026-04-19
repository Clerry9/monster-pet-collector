import { useCallback, useEffect, useState } from "react";
import { AD_COOLDOWN_MS, AD_DAILY_CAP, getAdReward, initAds, showRewardedAd } from "@/lib/ads";

const KEY_DATE = "lov_ad_date";
const KEY_COUNT = "lov_ad_count";
const KEY_LAST = "lov_ad_last";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function readState() {
  const date = localStorage.getItem(KEY_DATE);
  if (date !== todayStr()) {
    localStorage.setItem(KEY_DATE, todayStr());
    localStorage.setItem(KEY_COUNT, "0");
  }
  return {
    count: parseInt(localStorage.getItem(KEY_COUNT) || "0", 10),
    last: parseInt(localStorage.getItem(KEY_LAST) || "0", 10),
  };
}

export function useRewardedAd(playerLevel: number, onReward: (coins: number) => void) {
  const [count, setCount] = useState(0);
  const [last, setLast] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = readState();
    setCount(s.count);
    setLast(s.last);
    // Initialize ad provider (web/native auto-detected)
    initAds().catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const cooldownLeft = Math.max(0, AD_COOLDOWN_MS - (now - last));
  const dailyLeft = Math.max(0, AD_DAILY_CAP - count);
  const canWatch = !loading && cooldownLeft === 0 && dailyLeft > 0;
  const reward = getAdReward(playerLevel);

  const watch = useCallback(async (): Promise<boolean> => {
    if (!canWatch) return false;
    setLoading(true);
    try {
      const ok = await showRewardedAd();
      if (ok) {
        const s = readState();
        const newCount = s.count + 1;
        const newLast = Date.now();
        localStorage.setItem(KEY_COUNT, String(newCount));
        localStorage.setItem(KEY_LAST, String(newLast));
        setCount(newCount);
        setLast(newLast);
        onReward(reward);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [canWatch, onReward, reward]);

  return { canWatch, loading, cooldownLeft, dailyLeft, reward, watch };
}
