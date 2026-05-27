## Phase 1 Battle System Overhaul

Everything below ships as one focused update. Phase 2 (balance / new modes / bug-sweep) follows after this lands.

---

### 1. New mechanics (server-authoritative)

**Status effects** — extend `Combatant` with `burn_turns`, `stun_turns`, `freeze_turns`, `poison_turns`. End-of-round tick applies damage / skips next action / reduces spd.
- Common → burn (5%/turn, 2 turns)
- Rare → already has Quick Slash; add 30% stun on special
- Epic → already ignores def; add freeze 2 turns
- Legendary → existing bleed + poison stack

**Elemental types** — add `element: "fire"|"water"|"earth"|"air"|"neutral"` to `BaseStats`. Rock-paper-scissors:
- fire > earth > air > water > fire; cross-pair = 1.5x dmg, reverse = 0.75x, same/neutral = 1.0x
- Show element badge next to each combatant.

**Combo system** — track `combo_count` on attacker. 3 consecutive `attack` actions (no defend/special break) → next attack is free (extra turn) at 1.2x. Display combo counter UI.

**Mid-battle items** — new `items` array on `ArenaRun` (potions, bombs, shields). Earn from rewards. New action `"item"` with `item_id` payload, validated server-side. Start with 1 potion per run.

---

### 2. UI polish

**Screen shake + hit flash** — wrap `BattleArena` root in motion div that triggers `x: [-6,6,-3,3,0]` on damage events. White flash overlay on crits via opacity pulse. Red vignette when player HP < 25%.

**Victory/defeat screen** — new `BattleResultModal` showing winner portrait, XP gained, coin/shard rewards, items dropped, streak counter, and "Continue / Choose Reward" CTAs. Replaces current inline log finish.

**Special move cinematic** — when `special` fires, briefly: dim background (300ms), zoom attacker portrait to 1.4x, flash signature name in large display font, then resume. Implement as `<AnimatePresence>` overlay inside `BattleArena`.

---

### 3. Rewards & progression

**Monster XP / level-up** — new table `monster_progress (user_id, monster_id, xp, level)`. Award XP on battle win (50 base × wave). Level-up thresholds: `100 * level^1.5`. Boost `base_*` stats by 5% per level when building combatant.

**Better loot tables** — modify `arena-action` rewards block:
- Coins/shards scale per wave (already partial)
- Boss waves (every 5) guarantee 1 card drop of epic+
- Add `items` drops (potion/bomb) at low odds

**Streak bonuses** — track `win_streak` on `arena_runs`. Multiplier: `min(5, 1 + streak * 0.2)` applied to coin/shard payout. Reset on defeat. Show streak chip in HUD.

**Post-battle choice** — already partially scaffolded (`status: "choosing"`, `choose` op). Extend choices from {heal, buff, skip} to 3 randomized cards from: heal-50%, atk-buff, def-buff, gain-potion, gain-bomb, gain-rare-card. UI: 3-card picker modal.

---

### 4. Schema changes

```sql
-- monster XP/level
CREATE TABLE public.monster_progress (
  id uuid PK, user_id uuid, monster_id text,
  xp int default 0, level int default 1,
  UNIQUE(user_id, monster_id)
);
-- RLS: user reads own, service writes
-- GRANT select to authenticated, all to service_role

-- arena_runs additions
ALTER TABLE public.arena_runs
  ADD COLUMN win_streak int NOT NULL default 0,
  ADD COLUMN items jsonb NOT NULL default '[]'::jsonb,
  ADD COLUMN pending_choices jsonb;

-- monster_stats_def additions
ALTER TABLE public.monster_stats_def
  ADD COLUMN element text NOT NULL default 'neutral';
```

Seed elements for existing monsters via `insert` tool after migration approval.

---

### 5. Files touched

- `supabase/functions/_shared/combat.ts` — status, elements, combos, items, XP grant
- `supabase/functions/arena-action/index.ts` — items op, streak, loot tables, monster XP write
- `src/lib/combat.ts` — mirror new fields
- `src/components/BattleArena.tsx` — shake, flash, cinematic, combo counter, status icons, item bar
- `src/components/BattleResultModal.tsx` *(new)* — victory/defeat screen
- `src/components/BattleChoiceModal.tsx` *(new)* — 3-card post-battle picker (replaces inline choose UI)
- `src/hooks/useArena.ts` — `useItem` action
- `src/pages/Arena.tsx` — wire result + choice modals, show streak chip
- `src/data/monsters.ts` — element annotations

---

### 6. Out of scope (Phase 2)

- Damage formula re-balance / wave curve tuning
- New modes (boss raids, daily challenges)
- Existing bug sweep
- PvP integration of new mechanics (PvP keeps current rules for now)

---

### 7. Risks

- Combat module changes affect PvP via shared file. Mitigation: PvP edge function pins old behavior by passing `useNewMechanics: false` until Phase 2.
- Test suite (`arenaRuns.rls.test.ts`, `pvp.rls.test.ts`) may need updates for new columns. Will adjust.
