# Sessions, renewal and tool access

How a signed-in browser session stays usable, how it recovers when its backend
token lapses, and how tool access is decided and shown. Written after fixing
"signed in, but membership is missing and every tool is disabled".

## The incident

Users stayed signed in (name in the navbar, "Welcome back, Tek"), but the dashboard
subtitle read `Member · —` and every gated workflow tool showed **disabled**. It
happened both in idle tabs and during active use. Signing out and back in fixed it.

## Root cause

Two defects together. Neither was token expiry on its own: a lapsed token is
expected every 15 minutes and is supposed to be renewed silently.

1. **The root layout rendered a session with no backend token.**
   `src/app/layout.tsx` called `getServerSession()` without `authOptions`. Called
   that way, NextAuth uses an empty config, so none of our callbacks run. The session
   it returned had only `name`/`email`: no `backendToken`, roles or `error`. The
   layout hands that session to `<SessionProvider session={…}>`, and NextAuth's
   client trusts an initial session and skips its own fetch. So after **every full
   page load** the app was "authenticated" but tokenless until the next refetch (tab
   focus or the 4-minute interval):
   - `useCurrentUser` saw no token and made up a user with `roles: []` and
     `auth_source: null`, which renders as `Member · —`.
   - The page-access checks went out with no `Authorization` header.

2. **The backend treated a bad credential as "anonymous", not 401.**
   `get_current_user_optional` (used by `/api/access/page/{key}` and
   `/api/access/pages`) returned `None` for an expired or invalid token. The endpoint
   then answered **200 with every gated page denied**. The UI's renew-and-retry
   logic only reacts to 401, so it never fired. The same happened during active use
   whenever a check landed just after the 15-minute access token expired and before
   the next session refetch.

Contributing problems:

- A failed check (5xx, network) left tools without an answer, and the dashboard drew
  "no answer" as **disabled**. `usePageAccess` also set `allowed: false` on errors.
- `useCurrentUser`'s cache was keyed by the access token, which changes on every
  renewal. Membership was re-fetched from scratch with no cached value to fall back
  on.
- Server side, `check_access` fell back to the token's `roles` claim when the DB
  returned no roles, so revoking all of a user's roles had no effect until their
  token expired.

## How it works now

### Session lifecycle (`lib/auth.ts`)

| Token | Lifetime | Renewal |
|---|---|---|
| Access token (in the session cookie) | 15 min | Renewed ~1 min before expiry on any session read, or on demand after a 401 (`update()`) |
| Web refresh token | 7 days, sliding | Renewed by `/api/auth/exchange` once past half its life, so an active session never hits a fixed end |
| NextAuth cookie | 7 days | Re-issued on every session read |

- **Session reads.** The session is re-read every 4 minutes and on tab focus
  (`SessionProvider`), and each read renews the access token. The server render
  (`getServerSession(authOptions)`) also returns a renewed token. It can't write
  the cookie from a server component, but the client's next read does.
- **Rejected refresh token** (401/403: expired, revoked, banned, deactivated): the
  credentials are dropped and `error: "SessionExpired"` is set.
  `SessionExpiryWatcher` signs the user out once, centrally.
- **Backend unreachable** (5xx/network): credentials are kept and the next read
  retries. A redeploy doesn't sign anyone out.

### Calling the backend (`src/lib/auth/backendFetch.ts`, `useBackendFetch`)

- **401:** renew once, then retry with the new token. A second 401 is final.
- **Signed in but no token:** renew *before* sending, so the request never goes
  out anonymously and gets answered "denied".
- **Concurrent 401s** share a single refresh-token exchange (`singleFlight`).
- **403, 5xx and network errors** are not a verdict on the session and are never
  renewed.

### Permission state (`src/lib/auth/accessState.ts`)

Only a **successful** backend answer changes what the user may do:

| Situation | Shown |
|---|---|
| First check in flight | `checking…` |
| Check succeeded | `available` / `disabled` (the real answer) |
| Re-check in flight (renewal, focus, Refresh) | last answer, no flicker |
| Re-check failed | last answer + "showing your last known access" |
| First check failed | `not verified` + "your permissions have not changed" + Retry |
| Different user / signed out | state cleared; nothing carries over |

State is re-validated whenever the access token changes, so grants made mid-session
show up within one renewal cycle. `useCurrentUser` follows the same rules. It is
cached per signed-in email and shared across components, and a failure marks it
`stale` rather than emptying the roles.

### Server-side enforcement (usermanagement_service)

- A presented but invalid token on the access endpoints is **401** (with
  `WWW-Authenticate: Bearer`). Only a request with no credentials is anonymous.
- `check_access` resolves roles from the DB whenever the profile is known, even
  when the result is empty. Revocations apply on the next request, and the token's
  `roles` claim is never the authority.
- The UI's states are display only. Every protected backend route still checks the
  caller itself.

## Tests

```bash
# UI (vitest)
npm test

# usermanagement_service
uv run --no-project --python 3.11 --with-requirements requirements.txt \
  python -m unittest core.tests.test_access_auth core.tests.test_sliding_refresh
```

| Area | File | Covers |
|---|---|---|
| Session lifecycle | `lib/__tests__/auth.test.ts` | idle tab renewal, renewal before expiry, 3 days of active use at the 4-min cadence, forced renewal, sliding refresh token, revoked refresh token, backend outage then recovery, no refresh token, server-rendered session with/without `authOptions`, layout wiring |
| Fetch and renewal | `src/lib/auth/__tests__/backendFetch.test.ts` | 401 then renew and retry, tokenless session renews first, renewal failure, no loop on a second 401, 403/5xx not renewed, network errors, five concurrent 401s sharing one exchange |
| Permission state | `src/lib/auth/__tests__/accessState.test.ts` | transient failures keep grants, first failure shows "unverified" not "disabled", no flicker while re-validating, recovery, real revocations still apply, no leak across identities |
| Backend access API | `core/tests/test_access_auth.py` | valid token, expired token is 401, garbage token is 401, anonymous still allowed, mid-session grant, full revocation enforced despite the token claim |

Not covered automatically: a real browser left signed in for 15+ minutes. To check
by hand, sign in, open the dashboard, leave the tab for 20+ minutes, then reload and
also switch tabs. Tools and membership should stay as they were, with no sign-out.
