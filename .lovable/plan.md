
## Plan: AdSense 320x100 Banner in Shop Tab

### 1. Add AdSense script to `index.html`
Inject the AdSense loader in `<head>` (async, with `crossorigin`):
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
```
The `ca-pub-XXXXXXXXXXXXXXXX` is the user's AdSense publisher ID — placeholder for now with a `TODO` comment. The script tag is safe to ship; it just won't fill ads until the real publisher ID + slot are set.

### 2. New component `src/components/AdBanner.tsx`
A reusable 320x100 banner:
- Renders an `<ins class="adsbygoogle">` tag with `data-ad-client`, `data-ad-slot`, fixed `display:inline-block; width:320px; height:100px`.
- On mount, pushes `(window.adsbygoogle = window.adsbygoogle || []).push({})`.
- If publisher ID is still the placeholder, renders a styled "Ad space (320×100)" placeholder card so devs see the slot in the preview.
- Centered, with a small "Ad" label above per AdSense policy.

### 3. Mount in Shop tab (`src/pages/Index.tsx`)
Find the Shop tab content section (where `DiceShop`, `StarPack`, `SpecialPacks`, `RewardedAdButton` render) and append `<AdBanner />` at the bottom inside a centered wrapper with top margin.

### 4. Notes for the user (in chat after build)
- Real fills require: (a) approved AdSense account, (b) replacing the placeholder publisher ID in `index.html`, (c) creating a 320x100 ad unit in AdSense and pasting its slot ID into `AdBanner.tsx`.
- AdSense doesn't typically approve sites until they have meaningful traffic + a privacy policy page.

### Files
- Edit: `index.html`, `src/pages/Index.tsx`
- Create: `src/components/AdBanner.tsx`

### End-to-End Test
After build → open Shop tab → scroll to bottom → confirm a centered 320×100 placeholder card labeled "Ad space" appears below the existing shop sections. Once the user pastes their real publisher ID + slot ID, real ads render in that slot.
