import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLotteryHistory } from "./useLotteryHistory";

describe("useLotteryHistory", () => {
  beforeEach(() => { sessionStorage.clear(); });

  it("appends, caps at 20, and round-trips through sessionStorage", () => {
    const { result } = renderHook(() => useLotteryHistory());
    act(() => {
      for (let i = 0; i < 25; i++) {
        result.current.append({
          at: i, monsterId: "gobby", tileType: "coins",
          tileLabel: "Coins", emoji: "🪙", value: i,
        });
      }
    });
    expect(result.current.entries).toHaveLength(20);
    expect(result.current.entries[0].value).toBe(24);

    const { result: result2 } = renderHook(() => useLotteryHistory());
    expect(result2.current.entries).toHaveLength(20);
    expect(result2.current.entries[0].value).toBe(24);
  });

  it("attachLuckyEnergy decorates the most recent matching entry", () => {
    const { result } = renderHook(() => useLotteryHistory());
    act(() => {
      result.current.append({ at: 1, monsterId: "gobby", tileType: "coins", tileLabel: "Coins", emoji: "🪙", value: 5 });
      result.current.attachLuckyEnergy("gobby", 10);
    });
    expect(result.current.entries[0].luckyEnergy).toBe(10);
  });
});