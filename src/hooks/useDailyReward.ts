import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "monster-mash-daily";
// Grows each consecutive day, big jump on day 7. Resets if a day is missed.
const DAILY_REWARDS = [25, 50, 100, 175, 275, 400, 750];

interface DailyState {
  lastClaim: string | null; // ISO date string (date only)
  streak: number;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function loadDaily(): DailyState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { lastClaim: null, streak: 0 };
}

function saveDaily(state: DailyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useDailyReward(addCoins: (n: number) => void) {
  const [daily, setDaily] = useState<DailyState>(loadDaily);
  const [showModal, setShowModal] = useState(false);

  const today = getToday();
  const alreadyClaimed = daily.lastClaim === today;

  // Compute current streak considering today
  const currentStreak = (() => {
    if (daily.lastClaim === today) return daily.streak;
    if (daily.lastClaim === getYesterday()) return daily.streak + 1;
    return 1; // streak reset
  })();

  const reward = DAILY_REWARDS[((currentStreak - 1) % 7)];

  // Show modal on mount if not claimed today
  useEffect(() => {
    if (!alreadyClaimed) {
      const t = setTimeout(() => setShowModal(true), 800);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const claim = useCallback(() => {
    if (alreadyClaimed) return;
    const newState: DailyState = { lastClaim: today, streak: currentStreak };
    setDaily(newState);
    saveDaily(newState);
    addCoins(reward);
    setShowModal(false);
  }, [alreadyClaimed, today, currentStreak, reward, addCoins]);

  const dismiss = useCallback(() => setShowModal(false), []);
  const openModal = useCallback(() => setShowModal(true), []);

  return { showModal, streak: currentStreak, reward, alreadyClaimed, claim, dismiss, openModal };
}
