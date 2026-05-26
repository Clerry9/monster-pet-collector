import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  HAS_ENV,
  adminClient,
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./setup";

const d = HAS_ENV ? describe : describe.skip;

let alice: TestUser;
let bob: TestUser;

d("arena_runs + battles RLS", () => {
  beforeAll(async () => {
    alice = await createTestUser("a-arena");
    bob = await createTestUser("b-arena");

    const admin = adminClient();
    await admin.from("arena_runs").insert({
      user_id: alice.id,
      monster_id: "gobby",
      monster_level: 1,
      monster_rarity: "common",
      current_hp: 100,
      max_hp: 100,
      wave: 1,
      best_wave: 0,
      status: "active",
    });
  }, 30_000);

  afterAll(async () => {
    if (alice) await deleteTestUser(alice);
    if (bob) await deleteTestUser(bob);
  }, 30_000);

  it("bob cannot read alice's arena_runs", async () => {
    const { data } = await bob.client
      .from("arena_runs")
      .select("*")
      .eq("user_id", alice.id);
    expect(data ?? []).toHaveLength(0);
  });

  it("authenticated user cannot directly INSERT arena_runs", async () => {
    const { error } = await alice.client.from("arena_runs").insert({
      user_id: alice.id,
      monster_id: "gobby",
      monster_level: 1,
      monster_rarity: "common",
      current_hp: 100,
      max_hp: 100,
      wave: 1,
      best_wave: 99,
      status: "active",
    });
    expect(error).not.toBeNull();
  });

  it("authenticated user cannot directly UPDATE arena_runs", async () => {
    const { error, data } = await alice.client
      .from("arena_runs")
      .update({ shards_earned: 99999 })
      .eq("user_id", alice.id)
      .select();
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("bob cannot read alice's battles", async () => {
    const { data } = await bob.client
      .from("battles")
      .select("*")
      .eq("user_id", alice.id);
    expect(data ?? []).toHaveLength(0);
  });
});