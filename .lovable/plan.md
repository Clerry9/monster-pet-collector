## Changes

**1. `src/pages/Index.tsx`** — Remove the two top-right floating buttons (ARENA and PVP `RouterLink` blocks, lines ~854–873). Arena and PvP are still reachable from the left rail.

**2. `src/components/SideRails.tsx`** — Increase the rail's top offset so it sits below the top HUD (resources strip + XP bar) instead of overlapping it. Change the inline `top` from `calc(env(safe-area-inset-top, 0px) + 110px)` to `calc(env(safe-area-inset-top, 0px) + 170px)` on both left and right rails.

No other behavior changes.