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

d("pvp_defense_teams RLS", () => {
  beforeAll(async () => {
    alice = await createTestUser("a-pvp");
    bob = await createTestUser("b-pvp");

    const admin = adminClient();
    await admin.from("pvp_defense_teams").insert({
      user_id: alice.id,
      monster_id: "gobby",
      monster_level: 1,
      monster_rarity: "common",
      power: 100,
      rating: 1000,
    });
  }, 30_000);

  afterAll(async () => {
    if (alice) await deleteTestUser(alice);
    if (bob) await deleteTestUser(bob);
  }, 30_000);

  it("any auth user can read defense teams (intentional, for matchmaking display)", async () => {
    const { data, error } = await bob.client
      .from("pvp_defense_teams")
      .select("user_id,power")
      .eq("user_id", alice.id);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(1);
  });

  it("bob cannot update alice's defense team", async () => {
    const { data } = await bob.client
      .from("pvp_defense_teams")
      .update({ rating: 9999 })
      .eq("user_id", alice.id)
      .select();
    expect(data ?? []).toHaveLength(0);

    const admin = adminClient();
    const { data: row } = await admin
      .from("pvp_defense_teams")
      .select("rating")
      .eq("user_id", alice.id)
      .single();
    expect(row?.rating).toBe(1000);
  });
});