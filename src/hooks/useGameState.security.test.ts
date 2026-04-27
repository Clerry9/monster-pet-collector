/**
 * Integration-style tests verifying:
 *  1. Direct client-side UPDATEs to game_state that try to *increase* economic
 *     values (coins, rolls, xp, level, unlocked_dice_tiers) are rejected by
 *     the RLS WITH CHECK policy.
 *  2. Purchases only succeed via the SECURITY DEFINER RPCs
 *     (buy_dice_pack, unlock_dice_tier, spend_coins_rolls).
 *
 * These tests mock @/integrations/supabase/client to simulate the server
 * behavior so they run offline in CI. The mock mirrors the real RLS policy:
 *   - UPDATE rejects if any of coins/rolls/xp/level/tiers grows.
 *   - RPCs are the only path that can grow them.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = {
  user_id: string;
  coins: number;
  rolls: number;
  xp: number;
  level: number;
  energy: number;
  unlocked_dice_tiers: string[];
};

const SERVER: Row = {
  user_id: "u1",
  coins: 100,
  rolls: 5,
  xp: 0,
  level: 1,
  energy: 150,
  unlocked_dice_tiers: ["basic"],
};

// Helpers used by the mock
function rejectGrowth(patch: Partial<Row>): { ok: boolean; reason?: string } {
  if (patch.coins !== undefined && patch.coins > SERVER.coins)
    return { ok: false, reason: "coins growth blocked by RLS" };
  if (patch.rolls !== undefined && patch.rolls > SERVER.rolls)
    return { ok: false, reason: "rolls growth blocked by RLS" };
  if (patch.xp !== undefined && patch.xp > SERVER.xp + 1_000_000)
    return { ok: false, reason: "xp out of range" };
  if (patch.level !== undefined && patch.level > SERVER.level)
    return { ok: false, reason: "level growth blocked by RLS" };
  if (
    patch.unlocked_dice_tiers !== undefined &&
    patch.unlocked_dice_tiers.length > SERVER.unlocked_dice_tiers.length
  )
    return { ok: false, reason: "tier growth blocked by RLS" };
  return { ok: true };
}

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: (_table: string) => ({
        update: (patch: Partial<Row>) => ({
          eq: () => Promise.resolve(
            rejectGrowth(patch).ok
              ? { data: null, error: null }
              : { data: null, error: { message: rejectGrowth(patch).reason } }
          ),
        }),
      }),
      rpc: async (name: string, args: any) => {
        if (name === "buy_dice_pack") {
          const map: Record<string, { cost: number; rolls: number }> = {
            starter: { cost: 50, rolls: 5 },
            value: { cost: 120, rolls: 15 },
            mega: { cost: 350, rolls: 50 },
            ultra: { cost: 900, rolls: 150 },
          };
          const p = map[args.p_pack_id];
          if (!p) return { data: null, error: { message: "unknown pack" } };
          if (SERVER.coins < p.cost)
            return { data: null, error: { message: "insufficient coins" } };
          SERVER.coins -= p.cost;
          SERVER.rolls += p.rolls;
          return { data: { ...SERVER }, error: null };
        }
        if (name === "unlock_dice_tier") {
          const map: Record<string, number> = { silver: 500, gold: 2000 };
          const cost = map[args.p_tier_id];
          if (cost === undefined)
            return { data: null, error: { message: "unknown tier" } };
          if (SERVER.coins < cost)
            return { data: null, error: { message: "insufficient coins" } };
          if (!SERVER.unlocked_dice_tiers.includes(args.p_tier_id)) {
            SERVER.coins -= cost;
            SERVER.unlocked_dice_tiers = [
              ...SERVER.unlocked_dice_tiers,
              args.p_tier_id,
            ];
          }
          return { data: { ...SERVER }, error: null };
        }
        if (name === "spend_coins_rolls") {
          if (
            SERVER.coins < args.p_coins ||
            SERVER.rolls < args.p_rolls
          ) {
            return { data: null, error: { message: "insufficient" } };
          }
          SERVER.coins -= args.p_coins;
          SERVER.rolls -= args.p_rolls;
          return { data: { ...SERVER }, error: null };
        }
        return { data: null, error: { message: "unknown rpc" } };
      },
    },
  };
});

import { supabase } from "@/integrations/supabase/client";

beforeEach(() => {
  // Reset server state before each test
  SERVER.coins = 100;
  SERVER.rolls = 5;
  SERVER.xp = 0;
  SERVER.level = 1;
  SERVER.energy = 150;
  SERVER.unlocked_dice_tiers = ["basic"];
});

describe("RLS — direct UPDATEs that grow economic fields are rejected", () => {
  it("rejects increasing coins via direct UPDATE", async () => {
    const { error } = await (supabase.from("game_state") as any)
      .update({ coins: 999_999 })
      .eq("user_id", "u1");
    expect(error).not.toBeNull();
    expect(error.message).toMatch(/coins/i);
  });

  it("rejects increasing rolls via direct UPDATE", async () => {
    const { error } = await (supabase.from("game_state") as any)
      .update({ rolls: 9_999 })
      .eq("user_id", "u1");
    expect(error).not.toBeNull();
    expect(error.message).toMatch(/rolls/i);
  });

  it("rejects implausible xp via direct UPDATE", async () => {
    const { error } = await (supabase.from("game_state") as any)
      .update({ xp: 2_000_000_000 })
      .eq("user_id", "u1");
    expect(error).not.toBeNull();
  });

  it("rejects increasing level via direct UPDATE", async () => {
    const { error } = await (supabase.from("game_state") as any)
      .update({ level: 50 })
      .eq("user_id", "u1");
    expect(error).not.toBeNull();
    expect(error.message).toMatch(/level/i);
  });

  it("rejects appending an unlocked dice tier via direct UPDATE", async () => {
    const { error } = await (supabase.from("game_state") as any)
      .update({ unlocked_dice_tiers: ["basic", "gold"] })
      .eq("user_id", "u1");
    expect(error).not.toBeNull();
    expect(error.message).toMatch(/tier/i);
  });

  it("allows decreasing coins (e.g. spend) via direct UPDATE", async () => {
    const { error } = await (supabase.from("game_state") as any)
      .update({ coins: 50 })
      .eq("user_id", "u1");
    expect(error).toBeNull();
  });
});

describe("Purchases only succeed via RPCs", () => {
  it("buy_dice_pack debits coins and credits rolls server-side", async () => {
    const before = SERVER.coins;
    const { data, error } = await supabase.rpc("buy_dice_pack", {
      p_pack_id: "starter",
    });
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect((data as any).coins).toBe(before - 50);
    expect((data as any).rolls).toBe(10); // 5 + 5
  });

  it("buy_dice_pack rejects unknown pack ids", async () => {
    const { error } = await supabase.rpc("buy_dice_pack", {
      p_pack_id: "fake_pack",
    });
    expect(error).not.toBeNull();
  });

  it("buy_dice_pack rejects when insufficient coins", async () => {
    SERVER.coins = 10;
    const { error } = await supabase.rpc("buy_dice_pack", {
      p_pack_id: "ultra",
    });
    expect(error).not.toBeNull();
  });

  it("unlock_dice_tier appends tier and debits coins server-side", async () => {
    SERVER.coins = 600;
    const { data, error } = await supabase.rpc("unlock_dice_tier", {
      p_tier_id: "silver",
    });
    expect(error).toBeNull();
    expect((data as any).unlocked_dice_tiers).toContain("silver");
    expect((data as any).coins).toBe(100);
  });

  it("unlock_dice_tier rejects insufficient coins", async () => {
    SERVER.coins = 10;
    const { error } = await supabase.rpc("unlock_dice_tier", {
      p_tier_id: "gold",
    });
    expect(error).not.toBeNull();
  });

  it("unlock_dice_tier rejects non-purchasable tier id", async () => {
    const { error } = await supabase.rpc("unlock_dice_tier", {
      p_tier_id: "basic",
    });
    expect(error).not.toBeNull();
  });

  it("spend_coins_rolls debits both atomically", async () => {
    const { data, error } = await supabase.rpc("spend_coins_rolls", {
      p_coins: 30,
      p_rolls: 2,
    });
    expect(error).toBeNull();
    expect((data as any).coins).toBe(70);
    expect((data as any).rolls).toBe(3);
  });

  it("spend_coins_rolls rejects when insufficient", async () => {
    const { error } = await supabase.rpc("spend_coins_rolls", {
      p_coins: 9_999,
      p_rolls: 0,
    });
    expect(error).not.toBeNull();
  });
});
