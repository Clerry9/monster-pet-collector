# Daily Missions — claim flow QA

Manual checklist for verifying the claim button, spinner, reward credit, and toast.
Run against the preview/preview-prod build while signed in.

## Setup

- Sign in as a non-admin test user.
- Note current `coins`, `rolls`, `energy` from the HUD.
- Open the Daily Missions modal (Target icon in header).

## Happy path

1. Roll dice / collect coins until at least one mission shows progress = target.
2. Claim button enables and shows the gift icon.
3. Tap **Claim** → spinner appears, button text becomes "Claiming…".
4. Toast: `Mission claimed! +<amount> <kind>` (sonner success).
5. HUD value for that reward kind increases by `reward_amount`.
6. Row dims to claimed style; button reads "Claimed" and is disabled.
7. Launcher badge counter decrements (or disappears if last).
8. Reopen modal → mission still shows "Claimed" (not re-claimable).

## Idempotency

- Tap Claim twice in rapid succession → only one network call (DevTools), one toast, one credit. The second tap is blocked by `claimingCode`.

## Multiple ready

- Complete two missions. Claim them sequentially. Only one spinner is active at a time. Each credits independently.

## Slow network

- DevTools → Network → Throttling: **Slow 3G**.
- Tap Claim → spinner stays visible until RPC resolves (may take 5–10 s).
- UI does not duplicate. Subsequent taps during the in-flight RPC are no-ops.
- After resolve: toast + HUD update fire normally.

## Failure cases

- **Already claimed**: open two browser tabs. Claim in tab A. In tab B, tap Claim before refresh → red error toast `already claimed`; button returns to enabled then re-render flips to "Claimed" after `refresh()`.
- **Not complete**: bump progress to one short of target via console (or wait), button stays "In progress" and is disabled.
- **Network down**: kill connection, tap Claim → red toast surfaces error, button returns to "Claim", no reward credited (verify HUD unchanged).
- **Auth expired**: sign out in another tab, tap Claim → red error toast, no credit.

## Day rollover

- In SQL: `update daily_missions set mission_date = current_date - 1 where user_id = '<uid>';`
- Reopen modal → `get_or_roll_daily_missions` rolls a fresh set; previously claimed missions do not appear.

## Accessibility

- Esc closes the modal.
- Tab order: header close → each claim button in DOM order.
- Screen reader announces "Daily missions" dialog and the launcher's "ready to claim" count.

## Automation hooks

- Each claim button has `data-testid="claim-<code>"` for future Playwright/Vitest coverage.