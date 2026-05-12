# Dice3D — landing alignment QA

The visible 3D dice face must match the authoritative server roll result
(`lastResult.steps`) once the tumble settles, in both standard and
reduced-motion modes.

## Timing model

- Dice tick interval: **80 ms × 12 ticks ≈ 960 ms** of random faces.
- After ticks finish, `onRollDice()` runs and `lastResult` populates.
- `Dice3D.value` swaps from random `diceValue` → `lastResult.steps` so the
  cube re-targets and lands on the server number.
- `settleMs = 700` (reduced-motion: `0`).
- Hop animation begins once the result banner timer fires
  (`min(steps,12) × 110 + 250 ms`), which is ≥ 460 ms after `lastResult` —
  the cube is already settled by then.

## Standard mode checklist

1. Roll dice 20 times. After each tumble, the visible top face equals the
   number in the result banner ("+N steps").
2. No frame where the cube freezes on a random non-server number.
3. No `THREE.WebGLRenderer: Context Lost` errors during normal play.
4. Switch dice tier basic → silver → gold. Colors update; settle timing
   unchanged.

## Reduced-motion mode checklist

1. Enable Settings → Reduced motion (or set OS `prefers-reduced-motion`).
2. Roll. The flat number tile shows the server roll value immediately when
   ticking ends — no canvas mounted (verify in DevTools elements: no
   `<canvas>` inside `.roll-dial` parent).
3. No WebGL context messages in console.

## Background tab

1. Tap Roll, immediately switch tabs.
2. Wait 3 s, return.
3. The 1.5 s watchdog finishes the roll. Visible dice shows the server
   `lastResult.steps`, not a stale random tick.

## Performance

- Chrome Performance tab: a single roll should not produce >50 ms long
  tasks on a mid-tier laptop.
- The Dice3D canvas unmounts shortly after the result banner shows
  (when `isRolling=false` and `showResult=true`), preventing accumulating
  WebGL contexts across many rolls.