#!/usr/bin/env node
/**
 * Security regression check.
 *
 * Calls the Supabase linter REST endpoint and fails (exit 1) if it finds:
 *  - any ERROR-level finding
 *  - any privilege-escalation finding (0011 / "privilege escalation" / "policy_exists_rls_disabled" etc.)
 *  - any anonymous-access finding (0013 "policy_allows_anon" or names matching /anonymous/i)
 *
 * Other WARN-level findings (e.g. 0029 SECURITY DEFINER functions callable by
 * signed-in users) are reported but do NOT fail CI — those are intentional in
 * this project (see docs/security-allowlist.md / security memory).
 *
 * Required env:
 *   SUPABASE_ACCESS_TOKEN   - personal access token (sbp_...)
 *   SUPABASE_PROJECT_REF    - project ref (e.g. tpvnkpoodakakuhrnzxs)
 */

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

if (!TOKEN || !REF) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF env var.");
  process.exit(2);
}

const url = `https://api.supabase.com/v1/projects/${REF}/database/lints`;
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});

if (!res.ok) {
  console.error(`Linter API ${res.status}: ${await res.text()}`);
  process.exit(2);
}

const lints = await res.json();

const isBlocking = (l) => {
  const name = `${l.name ?? ""} ${l.title ?? ""} ${l.description ?? ""}`.toLowerCase();
  if ((l.level ?? "").toLowerCase() === "error") return true;
  if (/privilege.?escalation/.test(name)) return true;
  if (/policy_allows_anon|anonymous.?access|allow.?anonymous/.test(name)) return true;
  if ((l.cache_key ?? "").includes("0013_policy_allows_anon")) return true;
  return false;
};

const blocking = lints.filter(isBlocking);
const advisory = lints.filter((l) => !isBlocking(l));

if (advisory.length) {
  console.log(`Advisory findings (not blocking): ${advisory.length}`);
  for (const l of advisory) {
    console.log(`  [${l.level}] ${l.name ?? l.title}`);
  }
}

if (blocking.length) {
  console.error(`\nBlocking security findings: ${blocking.length}`);
  for (const l of blocking) {
    console.error(`  [${l.level}] ${l.name ?? l.title}`);
    if (l.description) console.error(`    ${l.description.split("\n")[0]}`);
  }
  process.exit(1);
}

console.log("\nNo blocking security findings. ✅");