import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { hasDecidedConsent, setConsent } from "@/lib/cookieConsent";

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer to next tick so SSR/hydration concerns are avoided
    const id = window.setTimeout(() => {
      if (!hasDecidedConsent()) setVisible(true);
    }, 200);
    return () => window.clearTimeout(id);
  }, []);

  if (!visible) return null;

  const handle = (value: "accepted" | "rejected") => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card/95 backdrop-blur p-4 shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            We use strictly necessary cookies to run the game. With your consent, we also use cookies for analytics and personalized ads (e.g. Google AdSense). You can change your choice anytime in our{" "}
            <Link to="/privacy" className="underline text-primary">Privacy Policy</Link>.
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => handle("rejected")}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Reject non-essential
            </button>
            <button
              onClick={() => handle("accepted")}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
