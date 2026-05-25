
# Reward, Monster Summoning, 3D Polish, and Battle System

Split into four phases. Each is shippable on its own; we approve and build in order.

---

## Phase 1 — Per-roll bonus reward system

Every roll already grants tile rewards. On top of that, add a **bonus roll** whose chance and quality scale with `bet_multiplier`.

**Bonus pool (one is granted when triggered):**

| Bonus | Effect | Rarity |
|---|---|---|
| Energy refill | +10/+25/+50 energy | common |
| Monster buff | +10% coin gain or +1 step range for next 5 rolls | common |
| Mini-game token | Grants 1 free MiniGame / MiniGameJack play | uncommon |
| Build discount | -25% building costs for 5, 10, or 15 minutes | uncommon |
| Shard drop | 1–10 shards (rarity-weighted by bet) | always available, scales |
| Mega shard burst | 25–50 shards | rare |

**Trigger formula:** `chance = clamp(0.15 + log2(bet) * 0.08, 0.15, 0.65)`. Higher bets also bias the pool toward better outcomes. Shards are the most common drop so progression always feels rewarding.

**Where it slots in:** `useGameState.ts` `spin()` returns a `bonusReward` alongside the tile reward. `Index.tsx` displays it via a new `BonusRewardToast` component that animates over the board.

**Build-discount timer:** stored in `game_state.active_buffs` (new jsonb column) with `expires_at`. Read by building-cost UIs.

**Buff stack:** stored similarly; consumed per-roll counter or timer.

---

## Phase 2 — Shards & monster summoning/merging

Replaces direct coin-buy of monsters with a gacha-style summon + merge loop.

**New columns on `game_state`:**
- `shards` int default 0
- `monster_collection` jsonb — `{ "<monsterId>": { level: 0, copies: 1 } }`
- `active_buffs` jsonb (from Phase 1)

**Summon costs (server RPC `summon_monster(rarity)`):**
- 50 shards → random **common**
- 100 shards → random **rare**
- 125 shards → random **epic**
- 150 shards → random **legendary**

Random pick respects existing rarity tags in `MONSTERS`. Newly summoned monsters start at **Level 0**.

**Merging (RPC `merge_monsters(monsterId)`):**
- 3 copies of the same monster at level N → 1 copy at level N+1, capped at the monster's existing evolution count (4 levels).
- Triggers `LevelUpCelebration` and switches the rendered evolution.

**UI changes:**
- `MonsterCollection.tsx` gains a **Summon** panel with 4 rarity buttons + animated reveal of the summoned monster.
- Per-card "Merge" button when ≥3 copies exist.
- Existing coin-cost monster purchases removed; legacy unlocks are auto-converted (each previously-unlocked monster becomes 1 copy at its current evolution level).
- Top HUD: add a shard counter (✨) next to gem/coin/star.

---

## Phase 3 — All-3D monsters with idle animations

Currently `Monster3D` renders 2D sprites on a billboard plane. We'll upgrade to animated 3D sprites for every monster, no GLB assets needed.

- Add idle skeleton: gentle bob, slight rotation drift, rim-light glow pulse, on-summon "pop" (scale 0 → 1 with overshoot).
- Add `useFrame` triggers for: `summon`, `mergeUp`, `hit`, `attack`, `victory`, `faint` (used by battle system).
- Ensure `MonsterDisplay`, `MonsterCollection` thumbnails, and the new battle UI all use `Monster3D` consistently (collection thumbs use `compact`).
- Keep low-power 2D fallback intact.

---

## Phase 4 — Battle system (PvE + async PvP)

Turn-based, server-authoritative to prevent cheating. Cinematic 1v1 fights between owned monsters.

**Derived stats per monster (computed server-side from level + rarity + evolution):**
- HP, Attack, Defense, Speed
- One signature move per rarity tier

**Combat actions (each turn):** Attack · Defend (50% damage taken, +25% next turn) · Special (signature move, 3-turn cooldown) · Item (heal potion from inventory if any)

**PvE encounters:**
- Wild monsters appear from tile interactions (new "battle" tile type or a chance from skull tiles).
- Win → coins, XP, **shards**, occasional buff token.

**Async PvP:**
- Players upload a **defense team** (1 monster initially, 3 later).
- Match queue picks an opponent within ±10% power, fight resolves on the server when the attacker initiates.
- Daily PvP cap to keep load bounded. Win → leaderboard points + shards.

**New tables (migration):**
- `monster_stats_def` — base stats per monster ID and rarity tier multipliers.
- `battles` — `id, attacker_id, defender_id, mode ('pve'|'pvp'), attacker_monster, defender_monster, winner_id, log jsonb, created_at`.
- `pvp_defense_teams` — `user_id, monster_id, power, updated_at`.
- `pvp_seasons` (optional in v1) — rating per player.

**Edge function `battle-resolve`:**
- Validates ownership, computes stats, simulates the turn the client requested (attacker action vs defender's chosen action), returns next state + animation events.
- Server stores full log so we can replay it client-side.

**UI:**
- `BattleArena.tsx` page/modal — two `Monster3D` instances facing each other, HP bars, animated action cards.
- `BattleResult.tsx` celebration on victory.
- `PvPHub.tsx` for queue + defense team picker.

---

## Sequencing & deliverables

```text
Phase 1 (rewards + buffs)         ~ small, immediately playable
  └─> Phase 2 (shards + summon)   ~ unlocks new progression loop
        └─> Phase 3 (3D polish)   ~ visual upgrade everywhere
              └─> Phase 4 (battles) ~ biggest chunk; PvE first, then PvP
```

Each phase: schema migration → server RPC/edge function → hook changes → UI → tests where helpful.

## Open assumptions (confirm or adjust)

1. **Legacy monsters:** Players who already bought monsters with coins get 1 copy at their current evolution converted into the new `monster_collection`. No refund.
2. **PvP defense:** 1-monster team in v1; 3-monster team in a follow-up.
3. **Battle initiation:** PvE is automatic from board tiles; PvP requires the player to open the PvP hub and tap "Find match".
4. **Buff stacking:** Same buff refreshes timer rather than stacking.

Reply with any adjustments, otherwise approve and I'll start with Phase 1.
