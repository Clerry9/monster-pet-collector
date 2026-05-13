# Plan

## 1. FAQPage JSON-LD on homepage
Inject a FAQPage schema mirroring the How to Play content (HelpDialog) — questions like "How do I win?", "What do tile rewards mean?", "How does the seasonal mini-game work?", "What are the card rarity odds?". Render via `<Helmet>` inside `src/pages/Index.tsx` so it ships only on `/`.

## 2. Fix lottery reel "stuck on energy"
File: `src/components/LotteryRoulette.tsx`
- Bug: when a lucky-energy bonus rolls, `landedIcon` stays `⚡` because `luckyEnergy` state never clears, and the reel never auto-hides after landing — it lingers until the next spin.
- Fix:
  - Auto-hide the reel ~2s after a non-spinning result lands (clear internal `visible` state and call `onLuckyEnergy` once).
  - Reset `luckyEnergy` to `null` on the same auto-hide so it doesn't bleed into the next spin's display.
  - Also clear `luckyEnergy` on the rising edge regardless (already done) and guard against re-firing the callback.

## 3. Homepage LCP + contrast
LCP (`index.html`):
- Move the AdSense `<script async>` to load after `DOMContentLoaded` (or add `defer` and drop `async`) so it doesn't block the main thread during initial paint. Same treatment for the CrazyGames SDK (load on first user gesture if possible, otherwise defer).
- Add `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` and `<link rel="preconnect" href="https://fonts.googleapis.com">` so the display font (`Luckiest Guy`) lands faster — currently the LCP candidate is the big display heading.
- Add `<link rel="dns-prefetch">` for ad domains.

Contrast (low-contrast tokens):
- `src/components/Footer.tsx` — `text-muted-foreground/70` → `text-muted-foreground` (still meets AA on cream bg).
- `src/pages/Index.tsx` line 1079 — `text-cream/70` on dark wood is fine, but the `EventBanner` uses `text-wood-dark/70` and `/80` on cream — bump countdown text to `text-wood-dark` for AA.
- `CenterEnergyPill` countdown uses `text-cream-light/90` on pink — keep, already AA.

## 4. Search Console + sitemap submission
- Use `standard_connectors--connect` with `connector_id: google_search_console`.
- Run the META verification flow against `https://monsterpetcol.com/`: request token → inject `<meta name="google-site-verification" …>` into `index.html` → republish → call verify → `PUT` site → submit `sitemap.xml` via the gateway.
- Note: the verify step needs the site republished first, so this is a two-pass: (a) inject meta tag and ask user to republish, (b) finish verification + sitemap submit.

## 5. Republish
After code changes land, the user clicks Update in the publish dialog so Lighthouse re-scores against the new build. I'll prompt with the publish action at the end.

## Order of operations
1. Code edits: FAQ JSON-LD, LotteryRoulette fix, contrast tweaks, index.html perf hints.
2. Insert verification meta tag placeholder (after Search Console connect returns the token).
3. Ask user to republish.
4. Finish Search Console verification + sitemap submission.
