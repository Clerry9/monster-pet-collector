import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { useState, useEffect } from "react";
import { LandingRewardPopup, type LandingReward } from "./LandingRewardPopup";

const SKULL: LandingReward = { icon: "💀", title: "-5 Coins", subtitle: "Ouch!", tone: "bad" };
const COINS: LandingReward = { icon: "🪙", title: "+12 Coins", tone: "good" };
const STAR: LandingReward = { icon: "⭐", title: "+30 Coins", subtitle: "Star tile!", tone: "good" };

describe("LandingRewardPopup", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it.each([
    ["skull", SKULL],
    ["coins", COINS],
    ["star", STAR],
  ])("auto-dismisses %s after 2s", (_label, reward) => {
    const onDone = vi.fn();
    render(<LandingRewardPopup reward={reward} onDone={onDone} />);
    expect(screen.getByText(reward.title)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("still dismisses when parent re-renders every 100ms (energy timer regression)", () => {
    // Reproduces the bug where the per-second HUD re-renders rebuilt onDone,
    // re-fired the effect, and reset the timer forever — leaving the skull
    // popup stuck on screen.
    const onDone = vi.fn();
    function Parent() {
      const [, setTick] = useState(0);
      useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 100);
        return () => clearInterval(id);
      }, []);
      // A NEW onDone identity every render — the previous bug.
      return <LandingRewardPopup reward={SKULL} onDone={() => onDone()} />;
    }
    render(<Parent />);
    act(() => { vi.advanceTimersByTime(2100); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("manual close button dismisses immediately", () => {
    const onDone = vi.fn();
    render(<LandingRewardPopup reward={SKULL} onDone={onDone} />);
    fireEvent.click(screen.getByLabelText("Dismiss reward"));
    expect(onDone).toHaveBeenCalledTimes(1);
    // And the pending timer must not fire a second time.
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("fires onDone exactly once per reward", () => {
    const onDone = vi.fn();
    const { rerender } = render(<LandingRewardPopup reward={SKULL} onDone={onDone} />);
    // Re-render with the SAME reward object many times — should not re-arm.
    for (let i = 0; i < 10; i++) {
      rerender(<LandingRewardPopup reward={SKULL} onDone={onDone} />);
    }
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});