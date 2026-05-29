# Global Arena Leaderboard

Add a competitive global ranking for arena runs, with weekly seasons that reset every Monday 00:00 UTC and pay out coins/shards to top finishers when a new season starts.

## What players see

- A new **Leaderboard** tab on the Arena page (alongside the gladiator picker / current run).
- **Top 100** global ranking for the current week: rank, display name, best monster icon, best wave reached, total runs.
- The current user is always shown with their rank highlighted (even if outside the top 100, pinned at the bottom: "You — rank #347, wave 12").
- A countdown to season reset ("Resets in 3d 14h").
- A small "Last season winners" strip at the top with top 3 names + their reward.
- After a reset, if the user placed in a reward tier, a one-time **Season Reward** modal appears on next Arena visit ("You finished #7 last week — +500 coins, +50 shards").

## Reward tiers (per weekly season)

- Rank 1: 5,000 coins + 500 shards
- Rank 2–3: 2,500 coins + 250 shards
- Rank 4–10: 1,000 coins + 100 shards
- Rank 11–50: 300 coins + 30 shards
- Rank 51–100: 100 coins + 10 shards

Rewards are granted automatically the first time any player loads the Arena page after the season has rolled over.

## How ranking works

- Each arena run already has a `best_wave`. We aggregate the user's **highest `best_wave` reached during the current season window** as their score.
- Tiebreaker: earliest timestamp at which that wave was first achieved (rewards consistency, not spam).

## Technical changes

### Database (one migration)

1. **`arena_seasons`** — `id text PK` (e.g. `2026-W22`), `starts_at`, `ends_at`, `created_at`. Public read.
2. **`arena_season_scores`** — `season_id`, `user_id`, `best_wave`, `best_monster_id`, `runs_count`, `first_reached_at`, `updated_at`. Unique on `(season_id, user_id)`. Public read for top-N display, no direct writes.
3. **`arena_season_rewards`** — `season_id`, `user_id`, `rank`, `coins`, `shards`, `granted_at`, `claimed_at`. User can read own rows.
4. Standard `GRANT` blocks + RLS (auth read where appropriate, service-role writes).

### RPCs / functions (security definer)

- `current_arena_season()` → returns `arena_seasons` row, creating the current ISO-week row on demand.
- `get_arena_leaderboard(_limit int)` → joins `arena_season_scores` + `profiles`, returns top N with display_name + level for the active season.
- `get_my_arena_rank()` → returns the caller's current rank, score, runs_count.
- `roll_arena_season()` → if the active season has ended: snapshot top 100 into `arena_season_rewards`, credit each winner via `grant_battle_rewards` semantics (coins/shards only), create the next season row. Idempotent (guarded by unique season id + status flag).
- `claim_pending_arena_rewards()` → returns and marks `claimed_at` on any unclaimed reward rows for the caller (used to drive the one-time modal).

### Edge function update

`supabase/functions/arena-action/index.ts`:
- After a run ends (any path that sets `arena_runs.status = 'ended'`), upsert into `arena_season_scores` for the current season: if `new_best_wave > existing.best_wave`, update score + `first_reached_at = now()` + `best_monster_id`. Always bump `runs_count`.
- Call `roll_arena_season()` at the start of `arena-action` so the rollover happens lazily on traffic (no cron needed).

### Frontend

- **New file** `src/components/ArenaLeaderboard.tsx` — fetches `get_arena_leaderboard` + `get_my_arena_rank`, renders the list with rank medals (gold/silver/bronze for top 3), reward tier hint per row, reset countdown.
- **New file** `src/components/ArenaSeasonRewardModal.tsx` — shown when `claim_pending_arena_rewards` returns rows. Confetti + rank + payout summary.
- **Edit** `src/pages/Arena.tsx`:
  - Replace the existing "Your Best Runs" personal mini-list with a tab toggle: **Play** | **Leaderboard**.
  - On mount, call `claim_pending_arena_rewards`; if rows returned, show `ArenaSeasonRewardModal`.
- **Edit** `src/hooks/useArena.ts` — no logic change, but expose a `refreshLeaderboard()` callback used by the page after a run ends.

### No changes to

- Combat math, choice cards, monster XP, existing arena run flow, or any other game mode.
- Existing `arena_runs` / `battles` schema (we only read `best_wave` for aggregation; nothing is removed).

