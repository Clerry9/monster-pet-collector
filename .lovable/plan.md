# Entitlement Dashboard + Subscriptions

## Context

Today the game only sells **one-time** packs and a one-time "Season Pass" — there is no `subscriptions` table, the webhook only handles `transaction.completed`, and there is nothing to cancel or resume. To deliver the request I need to add a real subscription system alongside the existing one-time catalog.

The Season Pass will stay a one-time per-season purchase (that's how the season system is designed). The "subscription" surface will be the two new recurring tiers below — they're what you'll be able to cancel/resume.

## What gets built

### 1. Two new subscription tiers (recurring)

Created in test via `create_product` / `create_price`, auto-synced to live on publish:

- **Collector Club — $4.99 / month**
  `collector_club` / `collector_club_monthly`
  Perks granted on every renewal: +50 rolls, +500 coins, +1 card flip.
- **Monster Elite — $14.99 / month**
  `monster_elite` / `monster_elite_monthly`
  Perks granted on every renewal: +200 rolls, +2,500 coins, +5 card flips, +10 island stars, gold dice tier unlocked, exclusive monsters (`mossfang`, `aurorix`) unlocked while active.

Both support cancel-at-period-end with grace access until `current_period_end`.

### 2. Database — new `subscriptions` table

Standard schema from the Paddle knowledge: `paddle_subscription_id` (unique), `paddle_customer_id`, `product_id`, `price_id` (human-readable external IDs), `status`, `current_period_start/end`, `cancel_at_period_end`, `environment`. RLS: users SELECT own; service role full access. Plus `has_active_subscription(uid, env)` SQL helper that respects the cancel-at-period-end grace window.

### 3. Webhook updates (`payments-webhook`)

Add handlers for `subscription.created`, `subscription.updated`, `subscription.canceled` — upsert the subscriptions row keyed on `paddle_subscription_id`. On each `transaction.completed` for a subscription price, also grant that tier's perks to `game_state` (so the first charge and every renewal credit the player).

### 4. New edge functions

- `cancel-subscription` — verifies JWT, looks up the user's subscription, calls Paddle `PATCH /subscriptions/{id}` with `scheduled_change.action = 'cancel'` (cancel at period end). Refuses if the subscription isn't owned by the caller.
- `resume-subscription` — same auth model, calls Paddle to clear the scheduled cancellation while still inside the current period.

Both route through `getPaddleClient(env)` from `_shared/paddle.ts` and pick env from the stored row.

### 5. New `useSubscription` hook

Filters by `user_id` + current `environment` (sandbox/live derived from the client token), orders by `created_at desc`, returns `{ subscription, isActive, willCancelAt, loading }`. Subscribes to realtime updates on the `subscriptions` table so cancel/resume reflects instantly.

### 6. Entitlement Dashboard (new tab in `GameTabs`)

A single screen that reads from existing hooks (`useGameState`, `useSeason`, `useSubscription`) and shows:

- **Wallet & credits:** rolls, coins, energy, island stars, pending card flips, XP / level — all live from `game_state` via realtime.
- **Unlocked dice tiers:** chips for each tier in `unlocked_dice_tiers`, with the active one highlighted.
- **Unlocked monsters:** grid of every entry in `unlocked_monsters` with image + name; locked monsters shown dimmed.
- **Season pass:** shows `pass_purchased` for the current season + days remaining. One-time, no cancel.
- **Recurring subscriptions:** for each row in `subscriptions`, shows tier name, status badge, current period end, and either:
  - a **Cancel at period end** button (active, not scheduled to cancel), or
  - a **Resume subscription** button (scheduled to cancel, still inside current period), or
  - a **Renew** CTA opening checkout (canceled / past_due past grace).
- **Purchase history:** last 10 rows from `purchases` (read-only).

### 7. Pricing page + in-app shop updates

Add the two new subscription tiers to `Pricing.tsx` (`EXPECTED_EXTERNAL_IDS` + `FALLBACK_TIERS`) and to `list-pricing` so the public pricing page shows them with `/month` suffix. Add a "Subscriptions" card in the in-game shop that opens checkout for either tier.

## Technical notes

- Subscription perks are granted in `transaction.completed` (which fires for both initial charge and each renewal), keyed on `price.importMeta.externalId`. Avoids double-grant by upserting `purchases` on `paddle_transaction_id`.
- Paddle webhooks for sub events are already subscribed by `enable_paddle_payments` — no webhook edits needed.
- All UI access checks (subscription badges, etc.) are advisory; perk granting is server-side via the webhook only.
- `subscriptions.environment` defaults to `'sandbox'` — webhook always sets it explicitly from the `?env=` query param.

## Test plan (preview = test mode)

1. Open the game, go to the new **My Account** tab → confirm credits, dice tiers, and monsters match what you have in-game.
2. Open Shop → Subscriptions → buy **Collector Club**. Use test card `4242 4242 4242 4242`, CVC `123`, any future expiry.
3. Within ~2 s the dashboard should show an **Active** Collector Club row with `cancel_at_period_end = false`, and your rolls / coins / flips should jump by the perk amounts.
4. Click **Cancel at period end** → row updates to "Cancels on …", access stays active.
5. Click **Resume subscription** → row flips back to plain Active.
6. Repeat with **Monster Elite** to verify gold dice + bonus monster unlocks land in `game_state`.
7. Failure card `4000 0000 0000 0002` should leave no subscription row.

After publish, the same flows run against live with real cards; the dashboard auto-switches because it filters by environment.
