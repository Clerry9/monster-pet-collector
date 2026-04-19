import { useEffect, useRef, useState } from "react";
import { adsAllowed, onConsentChange } from "@/lib/cookieConsent";

// TODO: Replace with your real AdSense publisher ID (also update index.html)
const ADSENSE_CLIENT = "ca-pub-XXXXXXXXXXXXXXXX";
// TODO: Replace with the slot ID of your 320x100 ad unit from AdSense dashboard
const ADSENSE_SLOT = "0000000000";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdBannerProps {
  className?: string;
}

export const AdBanner = ({ className = "" }: AdBannerProps) => {
  const pushed = useRef(false);
  const isPlaceholder =
    ADSENSE_CLIENT.includes("XXXX") || ADSENSE_SLOT.startsWith("0000");

  const [consented, setConsented] = useState<boolean>(() => adsAllowed());
  useEffect(() => onConsentChange((s) => setConsented(s.analyticsAds === "accepted")), []);

  useEffect(() => {
    if (isPlaceholder || pushed.current || !consented) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) {
      console.warn("AdSense push failed:", e);
    }
  }, [isPlaceholder, consented]);

  // Hide entirely when user rejected non-essential cookies (no placeholder, no slot)
  if (!isPlaceholder && !consented) return null;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
        Ad
      </span>
      {isPlaceholder ? (
        <div
          className="flex items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-xs text-muted-foreground"
          style={{ width: 320, height: 100 }}
        >
          Ad space (320×100)
        </div>
      ) : (
        <ins
          className="adsbygoogle"
          style={{ display: "inline-block", width: 320, height: 100 }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={ADSENSE_SLOT}
        />
      )}
    </div>
  );
};
