import { toast } from "sonner";

/**
 * Map raw Supabase / network auth errors to user-friendly messages.
 * Logged errors are forwarded to the console so they remain debuggable.
 */
export function friendlyAuthMessage(err: unknown): string {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const m = raw.toLowerCase();

  if (!raw) return "Something went wrong. Please try again.";
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials"))
    return "Email or password is incorrect.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email before signing in.";
  if (m.includes("user already registered") || m.includes("already registered"))
    return "An account with that email already exists. Try signing in instead.";
  if (m.includes("password") && m.includes("weak"))
    return "That password is too weak. Try a longer one with letters and numbers.";
  if (m.includes("rate") || m.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Network problem. Check your connection and retry.";
  if (m.includes("for security purposes"))
    return raw; // Supabase rate-limit message is already friendly enough
  return raw;
}

/**
 * Show a toast for an auth error. If a retry callback is provided, the toast
 * exposes a "Retry" action button. All errors are logged to the console with
 * a stable prefix so they're easy to grep in production logs.
 */
export function reportAuthError(
  context: string,
  err: unknown,
  retry?: () => void | Promise<void>
) {
  // Structured client-side log — keeps stack traces intact.
  // eslint-disable-next-line no-console
  console.error(`[auth:${context}]`, err);
  const message = friendlyAuthMessage(err);
  toast.error(message, {
    description: `(${context})`,
    action: retry
      ? { label: "Retry", onClick: () => void retry() }
      : undefined,
    duration: 6000,
  });
}