## Goal
Ensure no entry in **Special Packages** (`src/components/SpecialPacks.tsx`) ever advertises or grants more than 8 cards.

## Changes

### 1. Add a hard cap constant
In `src/components/SpecialPacks.tsx`, add:
```ts
export const MAX_CARDS_PER_PACK = 8;
```
Export it so any future fulfillment code (Paddle webhook handler, etc.) can import the same ceiling.

### 2. Make card counts a structured field
Today perks are free-text strings (`"3× Card Packs"`, `"1× Mystery Card"`). Switch the `SpecialPack` type so card grants are first-class and clamped:

```ts
export interface SpecialPack {
  …
  cards?: number;        // total cards granted, clamped to MAX_CARDS_PER_PACK
  perks: string[];       // remaining non-card perks
}
```

Update each pack:
- Starter: `cards: 1`
- Card Collector: `cards: 3` (was "3× Card Packs")
- Monster Master: `cards: 0`
- VIP Mega Bundle: `cards: 8` (was unspecified — gets the new max)

At runtime, clamp via `Math.min(pack.cards ?? 0, MAX_CARDS_PER_PACK)` so any future edit that exceeds 8 is silently capped.

### 3. Render the card line from the structured field
In the perks `<ul>`, prepend a derived line like `+{clampedCards} Cards` when `clampedCards > 0`, then render the remaining `perks[]` as before. This guarantees the UI can never display "9× Cards".

### 4. No backend / fulfillment changes
Purchase fulfillment isn't in this component, and the user asked only about the pack definition. The exported `MAX_CARDS_PER_PACK` is available to wire into the webhook later if desired.

## Files touched
- `src/components/SpecialPacks.tsx` (only)

## Out of scope
- Mini-game rewards, CardReveal queue, roulette rewards (different "packs").
- Server-side enforcement in `supabase/functions/payments-webhook` — can be a follow-up if you want me to also clamp on the backend.
