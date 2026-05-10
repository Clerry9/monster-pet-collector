import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LuckyRouletteModal } from "./LuckyRouletteModal";
import { LUCKY_STORAGE_KEY } from "@/hooks/useLuckyRouletteCooldown";
import { HISTORY_STORAGE_KEY } from "@/hooks/useRouletteHistory";

// jsdom has no Web Audio API; stub the sfx module so ensureCtx is never called.
vi.mock("@/lib/sfx", () => ({
  sfxDiceTick: vi.fn(),
  sfxCoinGain: vi.fn(),
  sfxLevelUp: vi.fn(),
}));

// jsdom doesn't implement scrollIntoView and our modal calls into framer-motion.
beforeEach(() => {
  localStorage.clear();
  // Silence framer-motion + svg animations in tests
  Element.prototype.scrollIntoView = vi.fn();
  // Stable RNG so the 'winner' is deterministic where we need it
  vi.spyOn(Math, "random").mockReturnValue(0); // winner = slot 0
  // Mock vibrate
  Object.defineProperty(navigator, "vibrate", { value: vi.fn(), writable: true, configurable: true });
});

const baseProps = {
  open: true,
  coins: 500,
  onClose: vi.fn(),
  onClaim: vi.fn(),
  onSpendCoins: vi.fn(() => true),
};

describe("LuckyRouletteModal", () => {
  it("renders 8 wedges with accessible names containing the reward label", () => {
    render(<LuckyRouletteModal {...baseProps} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(8);
    radios.forEach((r) => {
      expect(r).toHaveAttribute("aria-label", expect.stringMatching(/Slot \d+:/));
      expect(r).toHaveAttribute("aria-checked", "false");
    });
  });

  it("disables FREE SPIN until a wedge is picked", () => {
    render(<LuckyRouletteModal {...baseProps} />);
    const spinBtn = screen.getByRole("button", { name: /pick a wedge first|spin for free/i });
    expect(spinBtn).toBeDisabled();
    const firstWedge = screen.getAllByRole("radio")[0];
    fireEvent.click(firstWedge);
    expect(firstWedge).toHaveAttribute("aria-checked", "true");
    const enabled = screen.getByRole("button", { name: /spin for free/i });
    expect(enabled).not.toBeDisabled();
  });

  it("respects the free-spin cooldown stored in localStorage", () => {
    localStorage.setItem(LUCKY_STORAGE_KEY, String(Date.now()));
    render(<LuckyRouletteModal {...baseProps} />);
    // Pick a wedge so the spin button's accessible name reflects the cooldown
    // (it otherwise reads "Pick a wedge first" while no pick is selected).
    fireEvent.click(screen.getAllByRole("radio")[0]);
    const spinBtn = screen.getByRole("button", { name: /free spin in/i });
    expect(spinBtn).toBeDisabled();
  });

  it("disables EXTRA SPIN when the player has fewer than 100 coins", () => {
    render(<LuckyRouletteModal {...baseProps} coins={50} />);
    const extra = screen.getByRole("button", { name: /extra spin for 100 coins/i });
    expect(extra).toBeDisabled();
  });

  it("Esc calls onClose", () => {
    const onClose = vi.fn();
    render(<LuckyRouletteModal {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("appends a history entry after a spin resolves", () => {
    vi.useFakeTimers();
    render(<LuckyRouletteModal {...baseProps} />);
    fireEvent.click(screen.getAllByRole("radio")[0]); // pick slot 0
    fireEvent.click(screen.getByRole("button", { name: /spin for free/i }));
    act(() => { vi.advanceTimersByTime(3700); });
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].won).toBe(true); // picked slot 0, winner forced to slot 0
    vi.useRealTimers();
  });

  it("renders the odds legend with one row per slot", () => {
    render(<LuckyRouletteModal {...baseProps} />);
    const legend = screen.getByLabelText(/roulette odds and rewards/i);
    expect(legend.querySelectorAll("li")).toHaveLength(8);
    expect(legend.textContent).toMatch(/12\.5%/);
  });
});