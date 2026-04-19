import { useCallback, useEffect, useState } from "react";

const KEY = "season.notice.seen.v1";

/**
 * Tracks whether the user has acknowledged the current season instance.
 * Stores the last-seen seasonInstanceId in localStorage. When the rotation
 * changes, `isNew` becomes true again until acknowledged.
 */
export function useSeasonNotice(seasonInstanceId: string) {
  const [seenId, setSeenId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });

  // Re-read on instance change (e.g. another tab acknowledged)
  useEffect(() => {
    try {
      setSeenId(localStorage.getItem(KEY));
    } catch {
      /* ignore */
    }
  }, [seasonInstanceId]);

  const acknowledge = useCallback(() => {
    try {
      localStorage.setItem(KEY, seasonInstanceId);
    } catch {
      /* ignore */
    }
    setSeenId(seasonInstanceId);
  }, [seasonInstanceId]);

  const isNew = !!seasonInstanceId && seenId !== seasonInstanceId;

  return { isNew, acknowledge };
}
