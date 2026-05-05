## Plan

Three feature areas: SFX volume controls, tutorial replay/progress, camera tuning + visual fixes.

### 1. SFX volumes & master toggle (`src/lib/sfx.ts`, `src/components/SettingsDialog.tsx`)

Extend `sfx.ts` with per-category gains:
- Categories: `master`, `coin`, `skull`, `win` (win covers `sfxLevelUp` + `sfxCoinGain` jackpot-style; specifically map: `coin` → `sfxCoinGain`, `skull` → `sfxSkull`, `win` → `sfxLevelUp`; other SFX (`sfxHop`, `sfxLand`, `sfxDiceTick`) ride the master gain only).
- Add `getVolume(cat)`, `setVolume(cat, 0..1)`, `subscribeVolumes(cb)`, persist in `localStorage` (`sfx.vol.<cat>`). Defaults 0.8.
- Add `getMasterEnabled()` / `setMasterEnabled(bool)` (separate from the existing mute, which stays as the global mute toggle; master toggle is a quicker on/off with sliders intact).
- Each `sfx*` function multiplies its base gain by `master * categoryGain` and skips entirely if master is off.

In `SettingsDialog.tsx` add a new section "Sound effects":
- Master switch (uses existing `Switch` UI).
- Three sliders (Coin / Skull / Win) using `@/components/ui/slider`, each with a small "Test" play button that triggers the corresponding `sfx*` once.
- Live subscribe to changes so multiple settings panels stay in sync.

### 2. Tutorial progress, skip, replay (`src/components/TutorialCoachmark.tsx`, `src/hooks/useTutorial.ts`, `src/components/SettingsDialog.tsx`, `src/pages/Index.tsx`)

`TutorialCoachmark.tsx`:
- Replace the dot row with a labeled progress bar: `Step {index+1} of {steps.length}` plus a thin gold fill (`(index+1)/steps.length`).
- Add an explicit "Skip tutorial" text button next to NEXT (in addition to the existing top-right ✕). Both call `onClose`.
- Keep keyboard handling (Esc → skip, Enter/→ → next).

`useTutorial.ts`:
- Already has `reset()`. Expose it from the consumer.

`SettingsDialog.tsx`: add "Tutorial" section with a "Replay tutorial" button that calls a passed-in `onReplayTutorial` prop.

`Index.tsx`: wire `onReplayTutorial` → `tutorial.reset()` + open the coachmark immediately. Pass `tutorial.markCompleted` as `onClose` and `onFinish` so skipping also marks complete.

### 3. Camera tuning + visual fixes

**3a. Camera settings store (new `src/lib/cameraSettings.ts`)**
- Pubsub identical in shape to `lowPower.ts`.
- Keys persisted to localStorage:
  - `deadZone` (default 0.05, range 0–0.5) — `lerpedTarget` snaps when distance is below this.
  - `followSmoothing` (default 1.5, range 0–6) — multiplier on the lerp rate; 0 disables smoothing entirely (camera locks rigidly to target).
  - `zoom` (default 1.0, range 0.5–1.5) — scales the chase distance multipliers (4.5/3.5/4.5).
- Export `getCameraSettings()`, `setCameraSetting(key, value)`, `resetCameraSettings()`, `subscribeCameraSettings(cb)`.

**3b. `IsometricBoard.tsx` camera changes**
- `CameraRig` reads settings via a small hook (`useSyncExternalStore` against `subscribeCameraSettings`).
- Replace hardcoded `0.001` dead-zone with `settings.deadZone`. When `followSmoothing === 0`, always `copy(target)` (no lerp). Otherwise use `delta * (2.5 * followSmoothing/1.5)` etc., applied to BOTH `lerpedTarget` and the camera position lerp.
- Apply `zoom` factor to the `4.5 / 3.5 / 4.5` chase offsets so the user can pull the camera in. Default `zoom=1.0` keeps current framing; lower `zoom` (e.g. 0.7) brings camera closer to fix "zoomed out too far".
- Default chase multipliers reduced from `4.5/3.5/4.5` to `3.6/2.8/3.6` to address "camera too far out" complaint, before the user-zoom multiplier applies.
- Idle jitter: when `followSmoothing` low and within deadzone, the camera path no longer lerps at all, so any residual shake disappears even on devices where `delta` is unstable.

**3c. Fog reduction (`IsometricBoard.tsx`)**
- Bump fog further: `<fog args={[theme.fog, isMoving ? 90 : 70, isMoving ? 200 : 170]} />`. Effectively halves perceived fog density at the typical chase distance.

**3d. Camera section in `SettingsDialog.tsx`**
- Three sliders: Camera distance (zoom), Follow smoothing, Idle dead-zone.
- "Reset camera" button → `resetCameraSettings()`.
- Live preview: changes apply instantly via the pubsub.

### Files

- New: `src/lib/cameraSettings.ts`
- Edit: `src/lib/sfx.ts`, `src/components/SettingsDialog.tsx`, `src/components/TutorialCoachmark.tsx`, `src/components/IsometricBoard.tsx`, `src/pages/Index.tsx`

### Out of scope / not changing

- Existing `setMuted/isMuted` global mute stays as-is (used elsewhere e.g. BGM). The new master SFX toggle is independent and only gates SFX, not BGM.
- No DB / backend changes.
