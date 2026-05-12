# FriendSearch — pause/resume + persistence QA

The FriendSearch idle loop occasionally floats a 🔍 + friend silhouette over
the active monster. It must NOT appear during gameplay-critical animations.

## Idle behaviour

- With no roll/hop/reveal in flight, a bubble appears every **8–14 s** and
  hides after ~1.6 s. (Random schedule — observe over ~30 s.)
- The friend silhouette is never the active monster.

## Pause states

| State                          | Bubble visible? |
| ------------------------------ | --------------- |
| Dice ticking (`isRolling`)     | No              |
| Monster hopping (post-roll)    | No              |
| Card reveal open (`frozen`)    | No              |
| Idle on board                  | Yes (eventually) |

1. Tap roll. Within the 960 ms tick window, no bubble shows; any visible bubble disappears immediately.
2. While monster hops (between roll end and result banner), no bubble appears.
3. Trigger a card reveal. Bubble cleared and no new schedule starts until reveal closes.
4. Close reveal. Within ≤14 s a new bubble appears.

## Settings toggle persistence

1. Open Settings → toggle **Friend search** OFF.
2. **Without refreshing**, observe the board for 20 s — no bubble appears (live toggle handled by `friend-search:changed` event).
3. Refresh the page. Bubble still does not appear.
4. Re-enable toggle. Refresh. Bubble returns within ≤14 s.
5. Re-enable without refresh — bubble returns on next schedule.

## Monster swap

- Switch active monster from collection. New silhouettes draw from the
  remaining monster pool (active monster excluded).

## Cleanup verification

- Open React DevTools → Profiler. Toggle pause states. Confirm no leaked
  setTimeout (the 1600 ms hide timer is cleared on unmount/pause).