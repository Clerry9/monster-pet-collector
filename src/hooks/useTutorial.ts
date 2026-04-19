import { useCallback, useEffect, useState } from "react";

const KEYS = {
  main: "tutorial.main.completed.v1",
  minigame: "tutorial.minigame.completed.v1",
} as const;

type TutorialKey = keyof typeof KEYS;

function read(key: TutorialKey): boolean {
  try {
    return localStorage.getItem(KEYS[key]) === "1";
  } catch {
    return true;
  }
}

function write(key: TutorialKey, v: boolean) {
  try {
    localStorage.setItem(KEYS[key], v ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Tracks whether a given tutorial has been seen (persisted to localStorage). */
export function useTutorial(key: TutorialKey) {
  const [completed, setCompleted] = useState<boolean>(() => read(key));

  // Re-read on mount in case storage changed via another tab
  useEffect(() => {
    setCompleted(read(key));
  }, [key]);

  const markCompleted = useCallback(() => {
    write(key, true);
    setCompleted(true);
  }, [key]);

  const reset = useCallback(() => {
    write(key, false);
    setCompleted(false);
  }, [key]);

  return { completed, markCompleted, reset };
}
