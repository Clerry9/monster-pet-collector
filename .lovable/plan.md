## Security Hardening Plan

### 1. Revoke EXECUTE on internal-only SECURITY DEFINER functions

Lock down functions that should never be invoked by a signed-in client. All user-facing RPCs (`apply_dice_roll`, `buy_dice_pack`, `claim_mission`, etc.) stay callable by `authenticated` — they're the safe interface to mutate `game_state`.

Migration revokes `EXECUTE` from `PUBLIC`, `anon`, `authenticated` and grants only `service_role` on:

- `grant_battle_rewards` (already partially locked — reapply for defense-in-depth)
- `grant_paid_roulette_spins` (same)
- `handle_new_user` (auth trigger only)
- `clamp_game_state_ranges` (table trigger only)
- `update_updated_at_column` (table trigger only)

Trigger functions stay invokable by triggers regardless of grants — the engine runs them as definer. Revoking client EXECUTE prevents an authenticated user from calling them directly via PostgREST.

### 2. Audit exposed RPC + edge endpoints

Read-only pass — no code changes unless an issue is found. Deliverable is a short audit note appended to `mem://security/rpc-audit.md`:

- For every public-schema function: list grants, document who is supposed to call it, and verify the function body enforces `auth.uid()` checks or `auth.role()` gates before mutating.
- For every edge function (`arena-action`, `pvp-match`, `create-checkout`, roulette/pack/webhook handlers): confirm JWT validation via `getClaims`, confirm the userId used in DB writes comes from the verified claim (never from request body), and confirm any service-role DB call cannot be triggered with attacker-controlled identity.
- Flag any gap as a follow-up task; do not silently fix in this pass.

### 3. Automated RLS regression tests (Vitest, service-role seeded)

New directory: `src/test/security/`

Setup (`src/test/security/setup.ts`):
- Reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` from env (CI secrets; not committed).
- Creates two throwaway auth users (`userA`, `userB`) via service-role admin API in `beforeAll`, deletes them in `afterAll`.
- Exposes `anonClientAs(user)` helper returning an anon-key client signed in as that user.

Test files:
- `gameState.rls.test.ts` — userB cannot SELECT/UPDATE userA's `game_state`; direct `position` update is rejected; `shards` increase is rejected; baseline INSERT enforced.
- `arenaRuns.rls.test.ts` — userB cannot read userA's `arena_runs` or `battles`; only service_role can INSERT/UPDATE.
- `rewards.rls.test.ts` — calling `grant_battle_rewards` as authenticated fails; calling `apply_dice_roll`/`buy_dice_pack` as the wrong user only affects the caller's row.
- `pvp.rls.test.ts` — defense team rows readable by all auth users (intentional), but updatable only by owner.

Add `test:security` script to `package.json` that runs `vitest run src/test/security/`.

### 4. Extend CI security linting

Update `.github/workflows/security-lint.yml`:

- Keep existing `scripts/security-lint.mjs` checks.
- Add a step that runs `supabase db lint` (via `supabase` CLI in the workflow) against the migrations and fails on any `ERROR`-level finding. Warnings (e.g. anonymous-access notices) are logged but not failing — documented in the workflow comments.
- Add a step that runs the new `npm run test:security` suite against a Cloud test instance using repository secrets.
- Add a guard step: greps new migrations under `supabase/migrations/` for `CREATE TABLE public.` lines without an accompanying `GRANT` in the same file, fails the build if found.
- Update `mem://security/ci.md` documenting which checks gate merges and how to triage failures.

### Technical details

Migration SQL pattern for step 1:

```sql
REVOKE EXECUTE ON FUNCTION public.<name>(<args>) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.<name>(<args>) TO service_role;
```

Vitest service-role usage stays out of the browser bundle — files live under `src/test/security/` and are excluded from the app build by the existing `vitest.config.ts` `include` glob (`src/**/*.{test,spec}.{ts,tsx}`) being test-only. Service-role key is only injected via CI env, never via `.env` or `import.meta.env`.

No changes to existing user-facing flows; no UI changes.