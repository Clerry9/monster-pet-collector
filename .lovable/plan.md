
## Goal

Make Stat Forge backups forward/backward compatible via explicit versioning and migrations, and add automated tests covering coin-spend validation, undo refund logic, and localStorage persistence.

## 1. Versioned export/import with migrations (`src/lib/monsterStats.ts`)

- Bump `EXPORT_VERSION` to `2` and define the on-disk shape:
  ```ts
  interface BackupV1 { version: 1; upgrades: Record<string, StatUpgrade>; history?: UpgradeHistoryEntry[] }
  interface BackupV2 { version: 2; exportedAt: string; upgrades: Record<string, StatUpgrade>; history: UpgradeHistoryEntry[] }
  ```
- Add a `migrations` registry: `{ 1: (b) => BackupV2 }` that upgrades step-by-step. Each migration:
  - v1 → v2: ensures `history` exists (default `[]`), backfills `exportedAt` from now, normalizes missing stat keys to `0`, drops unknown stat keys, and synthesizes minimal history entries (`cost: 0`, `at: 0`) so undo still works on restored data — clearly labeled `legacy: true`.
- `exportData()` writes the latest version explicitly with `version: EXPORT_VERSION`.
- `importData(raw)`:
  - Parses JSON; if `version` missing, assume `1` (legacy from the original export).
  - Rejects with a typed error if `version > EXPORT_VERSION` ("Backup created by a newer app version").
  - Runs migrations sequentially until current version.
  - Validates the migrated payload (shape of `upgrades` and `history`); on failure returns `{ ok: false, error }`.
  - On success writes both stores, updates React state, returns `{ ok: true, migratedFrom?: number }`.
- Extend `UpgradeHistoryEntry` with optional `legacy?: boolean` (rendered subtly in the history panel — out of scope here, no UI change required).

## 2. Toast surfacing (`src/components/MonsterStatsShop.tsx`)

- On successful import, if `migratedFrom` is set, toast: `Backup restored (migrated from v{n})`.
- No other UI changes.

## 3. Tests

Add Vitest specs (jsdom env already configured) using the existing setup. Use `beforeEach` to clear `localStorage`.

### `src/lib/monsterStats.test.ts`
- **upgradeCost** scales as expected at levels 0/1/5.
- **apply + persistence**: call `apply`, then re-read via fresh `readStore`/new hook render — values persist; history entry appended with correct `cost`/`level`.
- **undoLast**: returns the last entry, decrements the stat level, removes the history row; second call after empty returns `null`.
- **exportData/importData round-trip** at current version preserves upgrades + history.
- **Legacy v1 import**: feed `{ upgrades: {...} }` (no `version`, no `history`), assert it migrates, stores upgrades, and `history` is `[]`.
- **Future-version import** (`version: 99`) returns `{ ok: false }` with a clear error.
- **Malformed JSON / missing `upgrades`** returns `{ ok: false }`.

### `src/components/MonsterStatsShop.test.tsx`
- Render with `coins=0` and click a stat → click Confirm → expect `addCoins` NOT called and an error toast (mock `sonner`).
- Render with sufficient coins → Confirm → `addCoins` called with negative cost; stat level persists in `localStorage`.
- After a successful buy, click **Undo last** → `addCoins` called with `+cost` refund; history entry removed.
- Simulate stale balance: balance shown is high but prop drops to `0` between preview and confirm → confirm shows "Not enough coins" toast.

## Technical notes

- Keep all migration logic pure and exported (e.g. `migrateBackup(parsed): { data, fromVersion }`) so it can be unit-tested without touching React state.
- Mock `sonner` via `vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))`.
- No schema, network, or backend changes. Localstorage-only.

## Out of scope

- UI to surface `legacy: true` history rows (data field added, no visual treatment).
- Cross-device sync; this remains local backups only.
