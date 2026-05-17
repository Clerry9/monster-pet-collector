import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LotteryRoulette } from "./LotteryRoulette";
import type { TileType } from "@/hooks/useGameState";

// Minimal framer-motion shim so we can render synchronously without animation.
vi.mock("framer-motion", () => {
  const passthrough = (tag: string) =>
    ({ children, ...rest }: any) => {
      const T: any = tag;
      // strip motion-only props
      const { initial, animate, exit, transition, whileHover, whileTap, layout, ...safe } = rest;
      return <T {...safe}>{children}</T>;
    };
  return {
    motion: new Proxy({}, { get: (_t, k: string) => passthrough(k) }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const ICONS: Record<TileType | "card", string> = {
  coins: "🪙",
  bonus: "⚡",
  chest: "🎁",
  food: "🍖",
  skull: "💀",
  star: "⭐",
  card: "🃏",
};

describe("LotteryRoulette e2e landing behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Force luckyEnergy off so we deterministically assert ICONS[tile].
    vi.spyOn(Math, "random").mockReturnValue(0.99);
  });

  it("locks exactly onto the landed tile and never gets stuck spinning", () => {
    const tiles: TileType[] = ["coins", "star", "skull", "chest", "food", "bonus", "coins", "star", "skull", "chest"];

    const { rerender, container } = render(
      <LotteryRoulette spinning={true} result={null} landedKey={0} />,
    );

    tiles.forEach((tile, i) => {
      const key = i + 1;
      // 1) Start a fresh roll: landedKey bumps, spinning goes true.
      act(() => {
        rerender(<LotteryRoulette spinning={true} result={null} landedKey={key} />);
        vi.advanceTimersByTime(300);
      });

      // 2) Land: spinning false, result set.
      act(() => {
        rerender(<LotteryRoulette spinning={false} result={tile} landedKey={key} />);
        vi.advanceTimersByTime(400);
      });

      // The wheel must display exactly the landed icon — never a stale reel tick.
      expect(container.textContent).toContain(ICONS[tile]);
    });

    // After all cycles complete and no new spin is requested, no rogue
    // interval should remain running — advancing the clock must not change
    // the rendered icon.
    const before = container.textContent;
    act(() => { vi.advanceTimersByTime(5000); });
    expect(container.textContent).toBe(before);
  });

  it("hides the previous result the instant a new roll starts", () => {
    const { rerender, container } = render(
      <LotteryRoulette spinning={false} result={"coins"} landedKey={1} />,
    );
    expect(container.textContent).toContain("🪙");

    act(() => {
      // Next roll begins — landedKey bumps before spinning rises.
      rerender(<LotteryRoulette spinning={false} result={null} landedKey={2} />);
    });
    // Reel is hidden between rolls (no result, not spinning yet).
    expect(container.textContent).not.toContain("🪙");
  });
});