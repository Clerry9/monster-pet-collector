// Lightweight cookie consent utility — strictly necessary cookies are always allowed.
// "analytics_ads" controls non-essential cookies (AdSense personalization, analytics).

export type ConsentValue = "accepted" | "rejected";

const STORAGE_KEY = "cookie-consent-v1";
const CONSENT_EVENT = "cookie-consent-changed";

export interface ConsentState {
  analyticsAds: ConsentValue | null; // null = not yet decided
  decidedAt: string | null;
}

export function getConsent(): ConsentState {
  if (typeof window === "undefined") {
    return { analyticsAds: null, decidedAt: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { analyticsAds: null, decidedAt: null };
    const parsed = JSON.parse(raw) as ConsentState;
    return {
      analyticsAds: parsed.analyticsAds ?? null,
      decidedAt: parsed.decidedAt ?? null,
    };
  } catch {
    return { analyticsAds: null, decidedAt: null };
  }
}

export function setConsent(value: ConsentValue) {
  const state: ConsentState = {
    analyticsAds: value,
    decidedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
}

export function hasDecidedConsent(): boolean {
  return getConsent().analyticsAds !== null;
}

export function adsAllowed(): boolean {
  return getConsent().analyticsAds === "accepted";
}

export function onConsentChange(handler: (state: ConsentState) => void): () => void {
  const wrapped = (e: Event) => handler((e as CustomEvent<ConsentState>).detail);
  window.addEventListener(CONSENT_EVENT, wrapped);
  return () => window.removeEventListener(CONSENT_EVENT, wrapped);
}
