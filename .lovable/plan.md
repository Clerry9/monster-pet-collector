## 1. Lower monster below the energy bar

The ⚡ energy pill is rendered as an absolute overlay at the top of the board (`Index.tsx`, `CenterEnergyPill`). The monster sprite inside `IsometricBoard` currently renders high enough to sit behind/under it on the 828px viewport.

- Add a top offset to the `IsometricBoard` content (or the monster's vertical anchor) so the monster's sprite starts below the energy pill area (~`top: 96px` on the board, or push the monster sprite down via its existing transform).
- Verify on the 828×724 viewport and a small phone size (375×667) that the monster never overlaps the pill, and the lottery bubble (currently `top-[32%]`) still sits correctly above the monster.
- No behavior changes — purely vertical positioning.

## 2. Harden cosmetic RPCs against anon callers

Currently `buy_cosmetic`, `equip_cosmetic`, and `unequip_cosmetic` are `SECURITY DEFINER` and callable by `anon`. They check `auth.uid() IS NULL` inside, but the linter still flags them and the surface area should not be exposed.

Migration:
- `REVOKE EXECUTE ... FROM anon, public` on the three functions.
- `GRANT EXECUTE ... TO authenticated` only.
- Keep the in-function `auth.uid() IS NULL` guard as defense in depth.

## 3. Cosmetic preview modal

Before buying or equipping, tapping a tile opens a modal with a larger preview, name, rarity, description, and price.

- New `src/components/CosmeticPreviewModal.tsx` using shadcn `Dialog`.
- Big swatch (96×96) using `preview_color`; for `dice_skin` show a styled dice face, for `monster_glow` show a glow ring around a monster emoji, for `island_theme` show a tinted island tile.
- Buttons in the modal:
  - Not owned → **Buy for 🪙 {price}** (disabled if insufficient coins).
  - Owned, not equipped → **Equip**.
  - Equipped → **Unequip**.
- `CosmeticStore` tile click opens the modal instead of buying directly. Existing inline buy/equip buttons removed in favor of the modal CTA.

## 4. Shop filters: All / Owned / Equipped

Add a small filter pill row at the top of `CosmeticStore`:

- Three buttons: **All**, **Owned**, **Equipped**.
- Filter applied to each `kind` group; empty groups are hidden when filtered.
- Filter state is local to the component, defaults to All.
- Show a small count next to each pill (e.g. `Owned · 4`).

## 5. Admin page for cosmetics

A protected `/admin/cosmetics` route gated by `has_role(auth.uid(), 'admin')` that lets admins manage the catalog without touching migrations.

Routing & guard:
- Add route in `src/App.tsx`. Page checks role via `supabase.rpc('has_role', { _user_id, _role: 'admin' })` and redirects non-admins to `/`.

Page features (`src/pages/AdminCosmetics.tsx`):
- Table listing all cosmetics (including disabled), grouped by kind.
- "Add cosmetic" form: id, kind, name, description, price_coins, rarity, preview_color, asset_key, sort_order.
- Inline edit per row: price, rarity, preview_color, asset_key, sort_order, name, description.
- Toggle button to enable/disable.
- Optional delete (with confirm) — only when `user_cosmetics` has zero references.

Data access:
- `cosmetics_def` already has `admins manage cosmetics` ALL policy — admins can insert/update/delete directly via the JS client; no new RPCs needed.
- A small read-only "owners" count column queries `user_cosmetics` grouped by `cosmetic_id` for safety before delete.

## Out of scope
- New cosmetic kinds beyond the existing three.
- Image-asset uploads (admin form takes an `asset_key` text only).
- Audit logging of admin edits.

## Files touched
- New: `src/components/CosmeticPreviewModal.tsx`, `src/pages/AdminCosmetics.tsx`.
- Edited: `src/components/CosmeticStore.tsx`, `src/components/IsometricBoard.tsx` (or `GameBoard.tsx` wrapper), `src/App.tsx`.
- One migration: revoke/grant execute on the three cosmetic RPCs.
