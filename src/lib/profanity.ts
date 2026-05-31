// Lightweight profanity / explicit name filter for player display names.
// This is intentionally a small, conservative list — server-side moderation
// should still apply for production. Matches whole words, substrings, and
// common leet-speak substitutions.
const BANNED = [
  "fuck", "shit", "bitch", "cunt", "dick", "cock", "pussy", "asshole",
  "bastard", "slut", "whore", "fag", "faggot", "nigger", "nigga", "kike",
  "spic", "chink", "retard", "rape", "rapist", "nazi", "hitler", "porn",
  "sex", "anal", "boob", "tits", "titties", "penis", "vagina", "jerkoff",
  "cum", "cumshot", "milf", "horny", "kkk",
];

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s_\-.]/g, "")
    // simple leetspeak collapse
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/!/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/@/g, "a")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b");
}

export function isProfane(name: string): boolean {
  const n = normalize(name);
  return BANNED.some((w) => n.includes(w));
}

/**
 * Validate a player display name.
 * Returns null if valid, or a human-readable error string if not.
 */
export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 3) return "Name must be at least 3 characters.";
  if (trimmed.length > 20) return "Name must be 20 characters or fewer.";
  if (!/^[A-Za-z0-9 _-]+$/.test(trimmed)) {
    return "Letters, numbers, spaces, _ and - only.";
  }
  if (isProfane(trimmed)) return "That name isn't allowed. Try another.";
  return null;
}