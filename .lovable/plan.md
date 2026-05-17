# Lottery Wheel — Reset, Lock, Debug & Reposition

## Goals

1. Lottery wheel fully resets its internal spin state on every new roll.
2. Wheel locks onto the **exact landed tile**, not whatever icon the reel happens to be on.
3. Temporary debug overlay surfaces the live state for diagnosis.
4. The bubble/icon clears immediately when a new roll starts.
5. Award/result popup moves to the **right** of the monster.

## Changes

### 1. `src/components/LotteryRoulette.tsx` — deterministic reset & exact lock

- Add a new `landedKey` prop (e.g. `absoluteStep` or roll counter from parent). When it changes, hard-reset all internal state: clear `tick`, `luckyEnergy`, `hidden`, `firedRef`, `wasSpinningRef`.
- Replace the rising-edge `spinning` effect with one keyed on `landedKey` so a fresh roll always wipes state, even if `spinning` toggles in an unexpected order.
- On stop (`!spinning && result != null`): immediately snap `tick` so the displayed icon is **always** `ICONS[result]` (or `⚡` when lucky). No timing assumption on key remount.
- Clear the bubble when the next roll begins: set `hidden = true` on `landedKey` change until the new spin starts, and unmount via `result == null && !spinning`.

### 2. `src/components/GameBoard.tsx` — pass landedKey & reposition popup

- Pass `landedKey={absoluteStep}` to `<LotteryRoulette>` (keep the `key={...}` remount as a belt-and-suspenders).
- Move the result banner container from `left-1/2 -translate-x-1/2` to the **right** of the monster: `right-2 top-[40%]` (fullscreen branch) and equivalent for the inline branch.
- Keep `FriendSearch` centered.

### 3. Debug overlay (temporary, gated)

- New small component `LotteryDebugOverlay` rendered inside `GameBoard` when `localStorage.getItem("lov_lottery_debug") === "1"` (or `?lotteryDebug=1`).
- Shows: `tile.type`, `lastResult.steps`, `isRolling`, `showResult`, `absoluteStep` (wheel key), current `landedKey`, `spinning` prop value, last lucky bonus.
- Fixed top-right, mono font, semi-transparent panel; updates live via props. Also `console.debug("[lottery]", ...)` on each state change for log capture.
- Documented in `docs/QA-lottery.md` (how to enable + what to look for).

## Technical Details

- `LotteryRoulette` signature becomes:
  ```ts
  interface Props {
    spinning: boolean;
    result: TileType | "card" | null;
    landedKey: string | number;    // NEW — bumps per roll
    onLuckyEnergy?: (amount: number) => void;
    className?: string;
  }
  ```
- Reset effect:
  ```ts
  useEffect(() => {
    firedRef.current = false;
    wasSpinningRef.current = false;
    setHidden(false);
    setLuckyEnergy(null);
    setTick(0);
  }, [landedKey]);
  ```
- Exact lock: in render, when `!spinning && result`, ignore `tick` and render `landedIcon` directly (already mostly true — remove the `REEL[tick % …]` branch when result is set).
- Bubble clear-on-next-roll: when `landedKey` changes, set `hidden = true`; flip back to `false` on the next `spinning === true` edge.
- Right-side popup: in fullscreen branch swap container classes; in inline branch wrap with `absolute right-2 top-[40%]` when `fullscreen` is true (matching existing pattern).

## Out of scope

- No backend / RLS / RPC changes.
- No changes to dice logic, hop animation, or reward economy.
- Debug overlay is opt-in and will be removed after diagnosis.
