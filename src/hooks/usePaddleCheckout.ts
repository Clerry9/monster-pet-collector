import { useState } from "react";
import { createCheckoutSession } from "@/lib/stripe";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const GUEST_WARNING_KEY = "lov_guest_purchase_warned";

/**
 * For anonymous (guest) users, show a one-time confirmation before the
 * first paid checkout. Purchases tied to an anonymous user_id can be lost
 * if the user clears browser data without linking an email/Google account.
 * Returns true if the caller should proceed, false to abort.
 */
export function confirmGuestCheckout(user: User | null): boolean {
  if (!user?.is_anonymous) return true;
  if (typeof window === "undefined") return true;
  if (localStorage.getItem(GUEST_WARNING_KEY) === "1") return true;
  const ok = window.confirm(
    "You're playing as a guest. Purchases will be saved to this device only. " +
    "If you clear your browser or switch devices without linking an email or Google account, " +
    "you may lose access to what you bought.\n\nContinue with checkout?",
  );
  if (ok) {
    localStorage.setItem(GUEST_WARNING_KEY, "1");
    toast.info("Link your account from My Account to keep purchases safe.", { duration: 6000 });
  }
  return ok;
}

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: {
    priceId: string;
    quantity?: number;
    customerEmail?: string;
    customData?: Record<string, string>;
    successUrl?: string;
  }) => {
    setLoading(true);
    try {
      const { url } = await createCheckoutSession(options);
      window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Checkout unavailable", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
