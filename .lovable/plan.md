## Goal

Make the auth experience resilient: a working `/auth` page (login + register with validation), an `AuthProvider` that survives initialization failures without crashing the React tree, and a global error screen for any runtime crash.

## Scope

The `/auth` page already exists and is functional (email/password login + signup, Google OAuth, guest). The real gaps are:
1. `AuthProvider` does not handle initialization errors — if `supabase.auth.getSession()` throws, `loading` stays `true` forever (blank screen).
2. No client-side validation on the signup form (length, email format, password strength).
3. The global `ErrorBoundary` already exists at the root of `App.tsx` but its message should be clearer for general runtime crashes.

## Changes

### 1. `src/hooks/useAuth.tsx` — resilient AuthProvider

Add an `error` state and a fallback render path so a failed init never leaves the app stuck:

- Wrap `supabase.auth.getSession()` and the `onAuthStateChange` setup in `try/catch`.
- New state: `error: Error | null`.
- When `loading` is true, render a centered loading screen (same style as the existing `ProtectedRoute` loader) instead of children — this guarantees no consumer hook runs against a half-initialized context.
- When `error` is set, render a fallback panel with a "Reload" button (reuses the same visual language as `ErrorBoundary`).
- Only render `children` once init has completed successfully.

This eliminates the class of runtime errors where downstream hooks call `useAuth()` before context is ready.

### 2. `src/pages/Auth.tsx` — validation + explicit redirect

- Add a `zod` schema for sign-up:
  - `email`: trimmed, valid email, ≤255 chars
  - `password`: ≥8 chars, ≤72 chars, must contain a letter and a number
- For login: keep the lighter validation (email format + non-empty password) so existing accounts with shorter passwords still work.
- Show inline field errors under each input (small red text) in addition to the toast.
- After a successful login/signup, explicitly `navigate("/", { replace: true })` using `react-router-dom`'s `useNavigate`. (Today it relies on `AuthRoute` re-rendering — which works but is implicit; explicit navigation is more predictable and what the user asked for.)
- For sign-up, set `emailRedirectTo: window.location.origin` on `signUp()` per Lovable Cloud auth conventions.

No new route is added — `/auth` already exists and is wired in `App.tsx`.

### 3. `src/components/ErrorBoundary.tsx` — global crash screen polish

Already exists and is already wrapped around the whole app in `App.tsx`. Small tweaks:
- Default `title` → "Something went wrong"
- Default `message` → "The app hit an unexpected error. Reloading will give it a fresh start."
- Keep the existing "Reload page" button (calls `window.location.reload()`).
- Keep the dev-only `<details>` with the stack trace.

No new file needed; the existing boundary already covers the "global error screen" requirement.

## Files

**Edited**
- `src/hooks/useAuth.tsx` — add error state, loading/fallback render gates
- `src/pages/Auth.tsx` — add zod validation, inline errors, explicit post-auth navigation
- `src/components/ErrorBoundary.tsx` — copy tweaks for default title/message

**No new files. No DB changes. No config changes.**

## Out of scope

- Password reset flow (not requested; would need a `/reset-password` route)
- Email verification UI (Cloud handles confirmation emails by default)
- Changes to `vite.config.ts`, `hmrGuard.ts`, or the React-dedup scripts — those were resolved in the previous loop and are working.