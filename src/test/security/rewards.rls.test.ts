import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  HAS_ENV,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./setup";

const d = HAS_ENV ? describe : describe.skip;

let alice: TestUser;

d("reward RPC lockdown", () => {
  beforeAll(async () => {
    alice = await createTestUser("rew");
  }, 30_000);

  afterAll(async () => {
    if (alice) await deleteTestUser(alice);
  }, 30_000);

  it("authenticated cannot call grant_battle_rewards", async () => {
    const { error } = await alice.client.rpc("grant_battle_rewards", {
      p_user_id: alice.id,
      p_coins: 1_000_000,
      p_shards: 1_000_000,
      p_xp: 1_000_000,
    });
    expect(error).not.toBeNull();
  });

  it("authenticated cannot call grant_paid_roulette_spins", async () => {
    const { error } = await alice.client.rpc("grant_paid_roulette_spins", {
      p_user_id: alice.id,
      p_amount: 100,
    });
    expect(error).not.toBeNull();
  });
});