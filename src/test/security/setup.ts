import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
export const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const HAS_ENV =
  !!SUPABASE_URL && !!ANON_KEY && !!SERVICE_ROLE_KEY;

export interface TestUser {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
}

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function rid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createTestUser(tag: string): Promise<TestUser> {
  const admin = adminClient();
  const email = `${rid(`rls-${tag}`)}@security-test.local`;
  const password = `Test-${rid("pw")}-Pw1!`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signin = await client.auth.signInWithPassword({ email, password });
  if (signin.error) throw new Error(`signIn failed: ${signin.error.message}`);

  // Bootstrap game_state for the user
  await client.rpc("bootstrap_game_state");

  return { id: data.user.id, email, password, client };
}

export async function deleteTestUser(user: TestUser): Promise<void> {
  const admin = adminClient();
  try {
    await admin.from("game_state").delete().eq("user_id", user.id);
    await admin.from("arena_runs").delete().eq("user_id", user.id);
    await admin.from("battles").delete().eq("user_id", user.id);
    await admin.from("pvp_defense_teams").delete().eq("user_id", user.id);
    await admin.from("profiles").delete().eq("user_id", user.id);
  } catch {
    // best-effort cleanup
  }
  await admin.auth.admin.deleteUser(user.id);
}