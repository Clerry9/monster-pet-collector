
# Phase 4 — Battle System + Gladiator Arena

Building the turn-based battle engine, then layering three modes on top. Shipped in three sub-phases so each is playable on its own.

---

## 4A — Core combat engine (server-authoritative)

The foundation every mode reuses.

**New tables (migration):**
- `monster_stats_def` — base HP/Atk/Def/Spd per monster id + rarity multipliers + signature move id
- `battles` — `id, user_id, mode ('pve'|'arena'|'pvp'), attacker_monster jsonb, defender_monster jsonb, winner ('attacker'|'defender'), log jsonb, rewards jsonb, created_at`
- `arena_runs` — `id, user_id, wave int, current_hp int, current_monster_id, status ('active'|'ended'), best_wave int, started_at, ended_at`
- `pvp_defense_teams` — `user_id, monster_id, power int, updated_at`

**Derived stats (server-side, deterministic):**
```text
HP  = baseHP  * (1 + 0.25 * level) * rarityMult
Atk = baseAtk * (1 + 0.20 * level) * rarityMult
Def = baseDef * (1 + 0.15 * level) * rarityMult
Spd = baseSpd + 2 * level
rarityMult: common 1.0 · rare 1.15 · epic 1.35 · legendary 1.6
```

**Turn actions:** Attack · Defend (½ dmg taken, +25% next attack) · Special (signature, 3-turn CD) · Item (heal potion from inventory)

**Edge function `battle-action`:**
- Input: `battle_id`, `action`, optional `item_id`
- Validates ownership, computes both sides' chosen action, applies damage, returns updated state + animation event list (`["attack","hit","crit","faint",...]`)
- Server stores the full log so replays are possible

**Shared UI:**
- `BattleArena.tsx` — two `Monster3D` instances facing each other, HP bars, action card row, floating damage numbers, victory/defeat overlay
- `BattleResult.tsx` — celebration with rewards breakdown
- Hook `useBattle(battleId)` polling state from server

---

## 4B — PvE encounters + Gladiator Arena (Endless Colosseum)

Both use the same engine; arena is a wrapped multi-fight loop.

**PvE encounters:**
- Skull tiles gain ~30% chance to spawn a wild monster fight (and a new "⚔️ Battle" tile type added to the board pool)
- Wild monster level scales to your party average; defeat → coins + XP + 1–5 shards + small chance of buff token

**Gladiator Arena — Endless Colosseum:**
- Entry from a new "Arena" tab in `GameTabs`
- Pick **one** monster from your collection to enter
- Fight escalating AI gladiators wave 1..∞; HP carries between waves
- Between waves: choose 1 of 3 (heal 30% · +10% atk next fight · skip wave for half rewards)
- Every wave 5 = boss (legendary-class stats) with a 25–50 shard payout
- Run ends on faint; rewards = `floor(wave * 5)` coins + `floor(wave * 1.5)` shards + cosmetic title at milestones (W10, W25, W50, W100)
- `best_wave` shown on a public leaderboard view
- One free run/day, additional runs cost 50 energy

**New files:**
- `src/pages/Arena.tsx` (route `/arena`)
- `src/components/ArenaWaveSelect.tsx` (between-wave choice)
- `src/components/ArenaLeaderboard.tsx`
- Edge function `arena-start` / `arena-next-wave` / `arena-end`

---

## 4C — Async PvP

Built last because it depends on matchmaking + power calc tuning from 4B.

- `PvPHub.tsx` page — defense team picker (1 monster v1), "Find match" button, recent results, weekly leaderboard
- Edge function `pvp-find-match` — picks an opponent within ±10% power from `pvp_defense_teams`
- Edge function `pvp-resolve` — runs full simulated battle server-side using each side's monster (defender uses AI policy: special on CD, defend below 30% HP, else attack), writes to `battles`
- Daily cap: 10 PvP fights/day. Win → leaderboard points + 5–15 shards. Loss → 2 shards consolation.

---

## Technical notes

- All combat math lives in **one** TS module (`supabase/functions/_shared/combat.ts`) imported by every battle edge function — no client math, prevents cheating
- Signature moves table seeded with: common = "Power Strike (1.5× atk)", rare = "Quick Slash (hits twice, 0.8× each)", epic = "Crushing Blow (2× atk, ignores 50% def)", legendary = "Cataclysm (2.5× atk + 20% bleed for 2 turns)"
- `Monster3D` already has the hook points the plan called for; we'll wire `attack/hit/faint/victory` frame triggers in 4A
- Arena AI gladiators are generated procedurally from `MONSTERS` with level = `floor(wave * 0.6) + 1`, rarity weight shifts toward legendary at higher waves
- Reuses Phase 2 `shards` column for all battle rewards — no new currency

---

## Sequencing

```text
4A  Engine + BattleArena UI + monster_stats_def seed   (foundation)
 └─ 4B  PvE tile + Gladiator Arena Colosseum            (single-player, ships independently)
     └─ 4C  Async PvP hub + matchmaking                 (depends on tuned power formula)
```

Approve and I'll start with 4A (migration + combat module + BattleArena scaffolding).
