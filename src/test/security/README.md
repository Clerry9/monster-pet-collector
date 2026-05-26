# RLS Regression Suite

These tests exercise live Supabase RLS policies by signing in as two real
throwaway users and attempting cross-user reads / privileged writes.

## Required env (CI secrets, never committed)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

If any are missing the suite is skipped (so contributors without secrets get
a clean local run). CI must provide all three.

## Run

```
npm run test:security
```

## What this guards

- `game_state` — no cross-user read/update; `position` and `shards` cannot be
  inflated via direct PostgREST update.
- `arena_runs` / `battles` — no cross-user reads; writes are service-role only.
- `grant_battle_rewards` RPC — rejects calls from `authenticated`.
- `pvp_defense_teams` — public read (intentional), owner-only write.