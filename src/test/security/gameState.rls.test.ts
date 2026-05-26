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

d("game_state RLS", () => {
  beforeAll(async () => {
    alice = await createTestUser("alice");
    bob = await createTestUser("bob");
  }, 30_000);

  afterAll(async () => {
    if (alice) await deleteTestUser(alice);
    if (bob) await deleteTestUser(bob);
  }, 30_000);

  it("alice cannot read bob's game_state", async () => {
    const { data } = await alice.client
      .from("game_state")
      .select("*")
      .eq("user_id", bob.id);
    expect(data ?? []).toHaveLength(0);
  });

  it("alice cannot update bob's game_state", async () => {
    const { error, data } = await alice.client
      .from("game_state")
      .update({ coins: 0 })
      .eq("user_id", bob.id)
      .select();
    // RLS silently returns no affected rows
    expect(error === null || error !== null).toBe(true);
    expect(data ?? []).toHaveLength(0);

    const admin = adminClient();
    const { data: bobGs } = await admin
      .from("game_state")
      .select("coins")
      .eq("user_id", bob.id)
      .single();
    expect(bobGs?.coins).toBeGreaterThan(0);
  });

  it("alice cannot inflate her own shards via direct update", async () => {
    const admin = adminClient();
    const { data: before } = await admin
      .from("game_state")
      .select("shards")
      .eq("user_id", alice.id)
      .single();
    const baseline = before?.shards ?? 0;

    await alice.client
      .from("game_state")
      .update({ shards: baseline + 9999 })
      .eq("user_id", alice.id);

    const { data: after } = await admin
      .from("game_state")
      .select("shards")
      .eq("user_id", alice.id)
      .single();
    expect(after?.shards ?? 0).toBeLessThanOrEqual(baseline);
  });

  it("alice cannot move her board position via direct update", async () => {
    const admin = adminClient();
    const { data: before } = await admin
      .from("game_state")
      .select("position")
      .eq("user_id", alice.id)
      .single();
    const baseline = before?.position ?? 0;

    await alice.client
      .from("game_state")
      .update({ position: baseline + 50 })
      .eq("user_id", alice.id);

    const { data: after } = await admin
      .from("game_state")
      .select("position")
      .eq("user_id", alice.id)
      .single();
    expect(after?.position ?? -1).toBe(baseline);
  });
});