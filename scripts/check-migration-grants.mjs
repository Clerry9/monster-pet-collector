#!/usr/bin/env node
/**
 * Guards against new public-schema tables added in migrations without
 * accompanying GRANT statements in the SAME migration file.
 *
 * PostgREST will not be able to reach the table otherwise (RLS alone is
 * not enough), and the app will fail at runtime.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";

// Migrations created before this guard existed are grandfathered.
// New migrations (lexicographically greater) MUST include GRANTs.
const CUTOFF = "20260526180000";

let failed = 0;

for (const name of readdirSync(dir)) {
  if (!name.endsWith(".sql")) continue;
  const ts = name.slice(0, 14);
  if (ts < CUTOFF) continue;
  const sql = readFileSync(join(dir, name), "utf8");

  // Look for CREATE TABLE public.<name>
  const tableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi;
  const grantRe = /grant\s+[^;]+\s+on\s+(?:table\s+)?public\.([a-z0-9_]+)/gi;

  const created = new Set();
  const granted = new Set();
  let m;
  while ((m = tableRe.exec(sql))) created.add(m[1].toLowerCase());
  while ((m = grantRe.exec(sql))) granted.add(m[1].toLowerCase());

  for (const t of created) {
    if (!granted.has(t)) {
      console.error(
        `[grants] ${name}: CREATE TABLE public.${t} has no GRANT in the same migration`,
      );
      failed++;
    }
  }
}

if (failed) {
  console.error(`\n${failed} migration(s) missing GRANT statements.`);
  process.exit(1);
}
console.log("All public-schema table migrations include GRANTs. ✅");