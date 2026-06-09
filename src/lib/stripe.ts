import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function getStripeEnvironment(): "sandbox" | "live" {
  return clientToken?.includes("test") ? "sandbox" : "live";
}

export async function createCheckoutSession(opts: {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  customData?: Record<string, string>;
  successUrl?: string;
  promoCode?: string;
}): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { ...opts, environment: getStripeEnvironment() },
  });
  if (error || !data?.url) {
    throw new Error(error?.message || data?.error || "Checkout failed");
  }
  return { url: data.url as string };
}