import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CardReveal } from "./CardReveal";
import { BetSelector } from "./BetSelector";
import type { GameCard } from "@/data/cards";

const card: GameCard = {
  id: "stack-test-card",
  name: "Test Card",
  emoji: "🧪",
  rarity: "rare",
  theme: "Test",
  description: "Stacking test",
  reward: { type: "coins", amount: 10 },
} as unknown as GameCard;

function zOf(el: Element | null): number {
  if (!el) return 0;
  const z = parseInt(getComputedStyle(el).zIndex || "0", 10);
  return Number.isFinite(z) ? z : 0;
}

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  window.dispatchEvent(new Event("resize"));
}

describe("CardReveal stacking", () => {
  afterEach(cleanup);

  for (const width of [375, 768, 1280]) {
    it(`portals above bet/spin controls at ${width}px`, () => {
      setViewport(width);
      render(
        <div>
          <BetSelector coins={5000} currentBet={1} onSetBet={() => {}} energy={50} energyCap={50} />
          <CardReveal card={card} onComplete={() => {}} />
        </div>
      );
      // The reveal renders via createPortal into document.body — find the
      // fixed inset-0 dialog wrapper that carries z-[100].
      const dialog = document.body.querySelector('[role="dialog"][aria-label^="Card reveal"]') as HTMLElement | null;
      expect(dialog).toBeTruthy();
      // Tailwind's z-[100] is an arbitrary class; jsdom doesn't parse our
      // CSS, so assert via the className contract instead of computed style.
      expect(dialog!.className).toMatch(/z-\[100\]/);
      // No betting/spin control declares z >= 100 in its className.
      const controls = document.querySelectorAll('[role="radiogroup"], [role="radio"]');
      for (const ctrl of Array.from(controls)) {
        expect((ctrl as HTMLElement).className).not.toMatch(/z-\[(1\d{2,}|[2-9]\d{2,})\]/);
      }
    });
  }
});