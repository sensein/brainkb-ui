# BrainKB UI

A modern user interface for exploring and interacting with the **BrainKB Knowledge Graph infrastructure**.  

---

## Screenshots
<img width="1735" height="1123" alt="landing_page" src="https://github.com/user-attachments/assets/9d1b5aa0-8fc5-4b63-8428-f0aad86f7e76" />
<img width="1735" height="1123" alt="Screenshot 2025-11-12 at 2 06 44 PM" src="https://github.com/user-attachments/assets/de5732fe-962f-4fdf-a567-d42f0f544993" />



---

## Getting Started

You can run BrainKB UI locally or with Docker.  
The UI depends on the **BrainKB backend services** (authentication, query, chat, etc.).   

---

### 1. Clone the Repository & Configure Environment

```bash
git clone https://github.com/sensein/brainkb-ui.git
```

Before starting the app, create a `.env.local` file with the required environment
variables:

```bash
cp .env.example .env.local
```

[`.env.example`](.env.example) is generated from the code — every variable the app
reads is in it, grouped, with the required ones uncommented and a one-line note each.
`src/config/env.ts` is the typed registry behind the `NEXT_PUBLIC_*` set; adding a
variable there means adding it to `.env.example` too.

Only `NEXT_PUBLIC_*` reaches the browser. `NER_API_KEY`, `NEXTAUTH_SECRET` and
`USER_MANAGEMENT_API_BASE` are server-only and must not be renamed into that
namespace.

---

> **Note:**  
> To use the public BrainKB instance, register for a JWT key here:  
> [API Registration](https://ingest.brainkb.org/docs#/Security/register_api_register_post)  
> Your account must be **activated by an admin** before access is granted.  

---

### OAuth setup (backend)

Sign-in (GitHub / ORCID / Globus) is handled entirely by the
`usermanagement_service` backend — this UI just calls `/api/auth/providers` and
renders a button for each provider the backend reports as `configured`. If the
sign-in slot is empty in the navbar, it means none of the providers below are
populated on the backend.

**1. Set these env vars on the backend's `.env`** (e.g. `BrainKB/.env`, NOT this
UI's `.env.local`):

```env
USERMANAGEMENT_PUBLIC_BASE_URL=http://localhost:8004
USERMANAGEMENT_FRONTEND_CALLBACK_URL=http://localhost:3000/auth/callback
USERMANAGEMENT_OAUTH_TOKEN_ENC_KEY=<32+ char random string, e.g. `openssl rand -base64 32`>

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

ORCID_CLIENT_ID=...
ORCID_CLIENT_SECRET=...

GLOBUS_CLIENT_ID=...
GLOBUS_CLIENT_SECRET=...
```

A provider only becomes available once **both** its `*_CLIENT_ID` and
`*_CLIENT_SECRET` are non-empty. Restart the backend after editing — env is
loaded once at startup. Verify with:

```bash
# local dev
curl -s http://localhost:8004/api/auth/providers | jq

# production (replace with whatever USERMANAGEMENT_PUBLIC_BASE_URL is)
curl -s https://usermanagement.brainkb.org/api/auth/providers | jq
```

**2. Register the redirect / callback URL on each provider's developer console.**

> ⚠️ **This is the most common setup mistake.** The URL you paste into the
> provider's developer console must point at the **backend** (`:8004`), not at
> this UI (`:3000`). The UI's `/auth/callback` page is a separate hop the
> backend triggers *after* it has handled the provider's callback — it is
> **not** what providers should redirect to. Wrong URL → providers reject the
> flow with errors like Globus's `OAUTH_AUTH_REQUEST_FAILURE`.

#### Where to paste what

| Provider | Where to paste | Field name in console | Value (local dev) | Value (prod) |
|---|---|---|---|---|
| GitHub | https://github.com/settings/developers → *OAuth Apps* → New OAuth App | **Authorization callback URL** | `http://localhost:8004/api/auth/github/callback` | `https://<your-backend>/api/auth/github/callback` |
| ORCID  | https://orcid.org/developer-tools → register an API client *(ORCID does not support `localhost` — use a public dev backend)* | **Redirect URI** | n/a (use prod URL) | `https://<your-backend>/api/auth/orcid/callback` |
| Globus | https://app.globus.org/settings/developers → register an app | **Redirects** | `http://localhost:8004/api/auth/globus/callback` | `https://<your-backend>/api/auth/globus/callback` |

In general the pattern is `{USERMANAGEMENT_PUBLIC_BASE_URL}/api/auth/<provider>/callback`.

#### Two URLs that are easy to confuse

These look similar but live in different places and serve different purposes —
mixing them up is what produces `OAUTH_AUTH_REQUEST_FAILURE` and friends:

| What | Configured where | Local-dev value | Purpose |
|---|---|---|---|
| OAuth provider callback | In the **provider's developer console** (GitHub / ORCID / Globus) | `http://localhost:8004/api/auth/<provider>/callback` | Where the provider sends the user back with the auth `code` after consent. Must match exactly what the backend sends as `redirect_uri`. |
| `USERMANAGEMENT_FRONTEND_CALLBACK_URL` | In the **backend's `.env`** | `http://localhost:3000/auth/callback` | Where the **backend** sends the user (with `?token=<jwt>`) after it has finished the OAuth exchange. The UI page at `/auth/callback` reads the token and signs the user in. |

If the navbar shows a sign-in button but clicking it lands on a provider error
page, the provider's redirect URL is wrong (table 1). If the provider flow
completes and you end up on a 404 instead of logged in, the
`USERMANAGEMENT_FRONTEND_CALLBACK_URL` is wrong (table 2).

---

### 2. Run Without Docker

1. Install [Node.js](https://nodejs.org/)  
2. Install dependencies:  
   ```bash
   npm install --legacy-peer-deps
   ```
   _(use `--force` if necessary)_  
3. Start development server:  
   ```bash
   npm run dev
   ```
   Note for production, you would run the following command.
   ```bash
   npm run build
   npm start
    ```

**Scripts** (`package.json`):

| Script | Does |
|---|---|
| `npm run dev` | development server |
| `npm run build` | runs `warm-cache` first, then `next build` — so a build needs the backend reachable |
| `npm start` | serve the production build |
| `npm run lint` | `next lint` |
| `npm run warm-cache` | `scripts/warm-cache.mjs`: pre-fetches query_service data into the cache. Reads `NEXT_PUBLIC_JWT_USER`/`NEXT_PUBLIC_JWT_PASSWORD`, so it fails if the backend or those credentials are missing — the usual cause of a build failing with no code change |

---

### Pages

Route → what it is. The filesystem under `src/app` is the map; this is here so the set
is reviewable at a glance.

| Route | Page |
|---|---|
| `/` | Landing |
| `/about`, `/contact`, `/privacy-policy` | Static |
| `/knowledge-base/[slug]`, `/knowledge-base/[slug]/[id]` | Browse a named graph, then one entity |
| `/knowledge-base/synth-scholar`, `/knowledge-base/synth-scholar/[id]` | Public SynthScholar reviews |
| `/see`, `/see/all`, `/see/entity/[type]`, `/see/entity/[type]/[id]` | Structured Entity Extraction results |
| `/evidence`, `/assertions` | Evidence and assertion views |
| `/hmba-taxonomy` | HMBA taxonomy browser |
| `/data-release` | Monthly releases |
| `/tools-and-libraries` | Neuroscience tools directory |
| `/playground` | Graph statistics / query playground |
| `/mcp` | Using BrainKB from an AI assistant (MCP + skill) |
| `/user`, `/user/dashboard`, `/user/profile` | Signed-in home, profile |
| `/user/ingest-kg`, `/user/job-status` | Ingest RDF, track and recover jobs |
| `/user/sie` | Named-entity extraction |
| `/user/extract-resource` | Structured resource extraction |
| `/user/pdf2reproschema` | PDF to ReproSchema |
| `/user/synth-scholar` | Run a SynthScholar review |
| `/admin`, `/admin/dashboard` | Admin home, statistics |
| `/admin/users`, `/admin/roles`, `/admin/page-access` | RBAC administration |
| `/admin/guide` | Admin how-to, incl. backend OAuth setup |
| `/auth/callback` | OAuth return / sign-in failure |

---

### 3. Run With Docker (integrated UI + backend)

The UI and the BrainKB backend share a Docker network so they can talk to
each other by container name. Bringing them up requires three things:

1. The backend stack ([BrainKB/docker-compose.unified.yml](../BrainKB/docker-compose.unified.yml)).
2. This UI stack ([docker-compose.yml](docker-compose.yml)) — joins the same
   network and bakes the backend URLs into the client bundle at build time.
3. (Optional) An nginx reverse proxy ([docker-compose.proxy.yml](docker-compose.proxy.yml) +
   [nginx/nginx.conf](nginx/nginx.conf)) so everything is reachable on a
   single public origin.

A helper script [`bin/up.sh`](bin/up.sh) wires it all together — creates the
shared network, brings up the backend, waits for health, then builds and
starts the UI (and proxy on demand).

#### Quick start (single host, dev)

```bash
# Both repos cloned as siblings: ~/work/BrainKB and ~/work/brainkb-ui
cd ~/work/brainkb-ui
./bin/up.sh                       # backend + UI on localhost:3000
./bin/up.sh --with-proxy          # also nginx on :80, single public origin
```

`up.sh` is idempotent: re-running it picks up source / env changes and
rebuilds only what moved.

#### What goes wrong if you skip `up.sh`

The most common deploy failure modes — and what guards against them:

| Pitfall | Symptom | Fixed by |
|---|---|---|
| Network missing | UI can't resolve `brainkb-unified` | `up.sh` runs `docker network create brainkb-network` once |
| `NEXT_PUBLIC_*` baked as `localhost` | Browser API calls 404 / CORS-fail when hit over a real hostname | `up.sh` warns; pass real URLs as env vars before running (see below) |
| Volume overlay overwriting build | UI 500s / blank page in prod | `docker-compose.yml` no longer bind-mounts source over `/app` |
| Network name drift between stacks | Containers up but on different bridges | Both compose files pin `name: brainkb-network` |

#### Deploying to AWS (or any remote host)

`NEXT_PUBLIC_*` env vars are inlined into the JavaScript bundle by
`next build` — they're URLs the **user's browser** ends up calling, so they
must be reachable from outside the host. Localhost values do not work.

1. Copy the deployment template and edit:

   ```bash
   cp .env.deploy.example .env.deploy
   $EDITOR .env.deploy           # template defaults to http://localhost
                                 # (UI on :80 via proxy, backends on
                                 # :8004 / :8007 / :8010 / :8011) — fine
                                 # for same-host testing. Replace
                                 # `localhost` with your real DNS name
                                 # (and http→https, ws→wss) for remote /
                                 # TLS deploys.
   ```

2. Source it before running `up.sh`:

   ```bash
   set -a; . ./.env.deploy; set +a
   ./bin/up.sh --with-proxy
   ```

3. Front the box with TLS if it's reachable from the internet — typically
   an AWS ALB terminating HTTPS and forwarding to the EC2 instance's port
   80 (where nginx is listening) for the UI, and to ports 8004 / 8007 /
   8010 / 8011 for the backend services. The UI's NextAuth uses
   `X-Forwarded-Proto`, which the proxy already sets correctly.

#### What the reverse proxy does (and doesn't)

[nginx/nginx.conf](nginx/nginx.conf) is intentionally thin — it fronts
**only the UI** on a friendly port (default 80) so you don't have to
expose `:3000` directly. Backend services keep their host-mapped ports
from `BrainKB/docker-compose.unified.yml` and are reached by the browser
on those ports:

| Browser hits | Container | Service |
|---|---|---|
| `http://<host>` (port 80) | `web:3000` via nginx | This Next.js UI |
| `http://<host>:8004` | `brainkb-unified:8004` | Auth, users, admin, RBAC |
| `http://<host>:8007` | `brainkb-unified:8007` | SynthScholar, NER, struct.res (SSE + WebSocket) |
| `http://<host>:8010` | `brainkb-unified:8010` | SPARQL + KG ingest |
| `http://<host>:8011` | `brainkb-chat:8011` | Chat service (optional) |

That's why every `NEXT_PUBLIC_*` URL in [.env.deploy.example](.env.deploy.example)
points at its service's default port — the same shape as
[.env.local](.env.local). To consolidate everything behind one origin
later (e.g. for one TLS cert), add `location /<svc>/ { proxy_pass ... }`
blocks per service in `nginx.conf` and rewrite the env vars to match.

#### Bringing it down

```bash
docker compose -f docker-compose.yml -f docker-compose.proxy.yml down
docker compose -f ../BrainKB/docker-compose.unified.yml down
```

The `brainkb-network` persists across `down` so you don't have to recreate
it on the next run. If you do want a clean slate:
`docker network rm brainkb-network`.

---

### 4. Run Without Docker (PM2)

For a non-Docker deploy on an EC2 / VPS box, [`bin/up-node.sh`](bin/up-node.sh)
wraps the install → build → PM2 (re)start cycle with the same env-var
sanity checks `up.sh` does for the Docker path. NEXT_PUBLIC_* still bakes
into the bundle at build time, so the script reads `.env.local` and warns
about anything missing.

```bash
# first-time deploy
sudo apt-get install -y nodejs npm        # or via nvm; needs Node 18+
cp .env.deploy.example .env.local         # then edit values
./bin/up-node.sh                          # installs pm2 if missing,
                                          # runs install + build + pm2 start
pm2 startup                               # follow printed command, so PM2
                                          # survives reboots via systemd

# subsequent re-deploys
git pull
./bin/up-node.sh                          # rebuilds + zero-downtime reload

# common ops
./bin/up-node.sh --status
./bin/up-node.sh --logs
./bin/up-node.sh --restart                # restart without rebuild
./bin/up-node.sh --stop
```

Useful env knobs: `PM2_APP_NAME`, `PORT`, `USE_NPM_CI=1`, `SKIP_BUILD=1`,
`NODE_ENV`. See the script header for the full list.

If you'd rather run the bare commands without the script:

```bash
npm install pm2 -g
npm install --force                       # or `npm ci` if you keep package-lock current
npm run build
PORT=3000 pm2 start npm --name brainkb-ui -- start
pm2 save
```

Front the running app with nginx (or ALB) on `:443` → `:3000` so port
3000 isn't exposed publicly.

#### Monitoring
```bash
pm2 list
pm2 logs brainkb-ui
pm2 stop brainkb-ui
pm2 delete brainkb-ui
pm2 start brainkb-ui
```
# Developer Documentation

## Design system (`bkb` tokens)

The UI uses a design-token system ported from `sensein/brainkb-ui-prototype`. Every
route is wrapped (in `src/app/layout.tsx`) in a `<Theme theme="light">` that applies
the cream `#f0eee9` body background and exposes `--bkb-*` CSS variables (surface,
border, text, primary, accent, etc.).

Translation from existing Tailwind utility classes to the `bkb` palette is done in
`src/app/globals.css` under the `.bkb` scope — so we don't have to rewrite every
page body. Highlights:

- Cards (`div.bg-white` etc.) → `var(--bkb-surface)`; full-width section bands stay
  transparent so the cream body bg shows end-to-end (no alternating slabs).
- Saturated gradient panels (`from-sky-500 …`) collapse to a solid `--bkb-primary`
  teal so white icons / `text-white` ink stay readable. Light shades nested inside
  (`text-sky-100`, `text-blue-100`, …) get bumped to `--bkb-primaryInk` so they
  also stay legible on the dark teal.
- Gradient-text headings (`text-transparent bg-clip-text bg-gradient-to-r …`) get
  the bg stripped and the ink forced to `--bkb-primary`.
- Headings (`h1`–`h6`, `.text-3xl`–`.text-6xl`) use Instrument Serif at weight 400.
- Code / `kbd` / `pre` / `.font-mono` → JetBrains Mono.

If you add a new page, wrap its content in the bkb `Theme` (or rely on the root
layout's `<Theme>`) and the overrides apply automatically. Use `var(--bkb-*)` tokens
directly in inline styles when you need the canonical palette.

## RBAC + admin dashboard

The UI integrates with the `usermanagement_service` FastAPI backend
(`NEXT_PUBLIC_USER_MANAGEMENT_API_BASE`, default `http://localhost:8004`). It powers:

- `/api/auth/providers` — drives the navbar Sign-in dropdown. If the backend is
  unreachable or has no OAuth credentials configured, the dropdown hides entirely
  (no broken pill is rendered).
- `/api/users/me` — fetched by `useCurrentUser()` to expose `isAdmin` / `hasRole`.
- `/api/admin/*` — wrapped in `src/services/api/userManagement.ts`; powers the
  admin surfaces under `src/app/admin/{users,roles,page-access,dashboard}`.
- `/api/access/page/<page_key>` — checked by `<PageAccessGate>`
  (`src/app/components/auth/PageAccessGate.tsx`) on every workflow tool page.

**Default-deny.** Workflow tool pages (Ingest KGs, SIE, Resource extraction, …) are
gated by `<PageAccessGate>` and require an admin to enable the corresponding
`pageKey` (see `src/config/toolRegistry.ts`) for the user's role. For local
development, set `DISABLE_PAGE_ACCESS_GATE=true` in `src/config/featureFlags.ts`
to bypass the gate.

### Access matrix

Admins are a blanket exception to the gate — they see everything regardless of
per-page rules. Concretely:

| Route | Anonymous | Signed-in (no roles) | Admin |
|---|---|---|---|
| `/`, `/knowledge-base/*`, `/about`, `/playground`, `/hmba-taxonomy` | ✅ | ✅ | ✅ |
| `/user/dashboard`, `/user/profile` | ❌ | ✅ | ✅ |
| `/user/<tool>` (sie, ingest-kg, extract-resource, pdf2reproschema, job-status) | ❌ | ⚠️ depends on per-page RBAC | ✅ (always) |
| `/admin/*` | ❌ | ❌ (Forbidden screen) | ✅ |

So **admins have access to both the user dashboard and the admin surface** by
design. The "always" for `/user/<tool>` comes from
[PageAccessGate.tsx:37](src/app/components/auth/PageAccessGate.tsx#L37) —
`if (isAdmin) return children`. Non-admins hit
`GET /api/access/page/<page_key>` and are denied if the backend returns
`not_found` or `denied`.

### Promoting a user to admin

There are two mechanisms — the env-var bootstrap for the *first* admin (you
can't use the admin UI yet because nobody has access), and the `/admin/users`
UI for everyone after.

**1. First admin (bootstrap, one-time)** — set on the **backend's** `.env`
(`BrainKB/.env`), comma-separated:

```env
USERMANAGEMENT_BOOTSTRAP_SUPERADMIN_EMAILS=you@example.com,colleague@example.com
```

On every backend startup `promote_bootstrap_superadmins()` reads that list
and:
- If the email already has a profile → assigns both the `Admin` and
  `SuperAdmin` roles.
- If the email has not signed in yet → the backend's `require_admin`
  dependency honors the env allowlist anyway, so the user has admin access on
  their first sign-in. The roles are then persisted on the next backend
  startup.

`SuperAdmin` is the protected marker — accounts holding it cannot be banned,
deleted, or have that role stripped via the admin UI/API. Regular `Admin`
roles assigned through `/admin/users` remain fully manageable.

Restart the backend after editing the env. Verify with
`curl -s -H "Authorization: Bearer <jwt>" http://localhost:8004/api/users/me | jq .roles`
(or `https://usermanagement.brainkb.org/api/users/me` against production).

**2. Subsequent admins (UI)** — any existing admin can promote others:

1. Sign in and open `/admin/users` (admin sidebar → *Users*).
2. Search by name, email, or ORCID to find the target.
3. In the *Roles* column, pick **Admin** from the *+ add role* dropdown.

To **demote**: click the `Admin ✕` chip on that user's row. To delete a
user entirely: red *Delete* button at the row's right edge (cascades through
roles, activities, and OAuth identities).

The admin UI calls (wrapped in [src/services/api/userManagement.ts](src/services/api/userManagement.ts)):

- `POST /api/admin/users/{profile_id}/roles` — assign role
- `DELETE /api/admin/users/{profile_id}/roles/{role}` — remove role
- `DELETE /api/admin/users/{profile_id}` — delete the profile (cascades)
- `POST /api/admin/users/{profile_id}/ban` — suspend (body `{ reason }`)
- `DELETE /api/admin/users/{profile_id}/ban` — lift suspension

### Suspending users (per-user ban)

When you need to block a user's access without losing their profile history,
use **Ban** on their row in `/admin/users` (or the API directly). Effects:

- The `Web_user_profile.is_banned` flag is set, with `banned_at` /
  `banned_by` / `ban_reason` audit fields populated.
- Every authenticated request from that user returns 403
  `account_suspended` — `core.security.get_current_user` re-reads
  `is_banned` per request, so the ban takes effect immediately on
  existing JWTs (no need to revoke or wait for expiry).
- The UI shows an **Account suspended** page (with reason + timestamp)
  instead of the dashboard / tool pages, via `<UserBanGate>`
  ([src/app/user/UserBanGate.tsx](src/app/user/UserBanGate.tsx)) and the
  parallel check in `<AdminShell>`.
- Activity log records `USER_BAN` / `USER_UNBAN` entries against the
  acting admin's profile.

**Refusals**: you can't ban yourself, and you can't ban another Admin
without first removing their Admin role. Banning is reversible (Unban
restores access immediately); deleting is not — use Delete only for
spam / invalid accounts where you don't need the audit trail.

**IP / IP-range bans** are not implemented at the application layer —
recommended to handle at the WAF / reverse-proxy layer (Cloudflare, nginx
`geo`+`deny`, AWS WAF) where proxy / NAT / IPv6 / mobile-carrier complications
are addressed correctly.

### Defining custom roles

Beyond the canonical roles seeded by the backend (`Admin`, `Curator`,
`Reviewer`, `Submitter`, `Annotator`, `Mapper`, `Validator`,
`Conflict Resolver`, `Knowledge Contributor`, `Evidence Tracer`,
`Provenance Tracker`, `Moderator`, `Ambassador`), admins can add custom
organisational roles like `MIT User`, `Lab X Member`, `External
Collaborator`, etc.

1. Open `/admin/roles` (admin sidebar → *Roles & permissions*).
2. Click *New role* and fill in:
   - **Name** — must start with a letter; letters, numbers, spaces,
     hyphens, and underscores allowed (max 100 chars). E.g. `MIT User`.
   - **Description** — optional, free text.
   - **Category** — optional. Canonical buckets are `Admin`, `Content`,
     `Quality`, `Knowledge`, `Community`; custom buckets like
     `Organization` are allowed (same format rules as Name, max 50 chars).
3. Save. The role appears immediately in `/admin/users` role pickers and
   in `/admin/page-access` allowed-roles selectors.

⚠️ The canonical names listed above are referenced in code (default
`Curator` assignment on first OAuth sign-in, `Admin` checks throughout
the gate). Don't rename or deactivate them — bootstrap will re-seed any
missing canonical roles on next backend startup, but renaming them
requires a code change.

### Granting tool access to roles

Tool pages (`/user/sie`, `/user/ingest-kg`, …) are gated by `<PageAccessGate
pageKey="tools.<slug>">`. Default-deny applies: a tool is invisible to
non-admins until an admin lists their role in the page-access entry.

1. Open `/admin/page-access` (admin sidebar → *Page access*).
2. Find the page in the *Registered pages* list (or click the chip in the
   "workflow tools aren't registered yet" banner to seed a new entry from
   the [tool registry](src/config/toolRegistry.ts)).
3. In the editor:
   - Toggle **Public** if anonymous users should reach the page (rare for
     workflow tools — usually only for content browsing pages).
   - Click each role chip in **Allowed roles** that should pass the gate.
   - Optionally paste comma- or newline-separated emails into
     **User-email overrides** to grant access to specific users
     regardless of their role.
4. Save. The change is live on next page load — `usePageAccess` hits
   `/api/access/page/<page_key>` with no client cache.

**Admins always pass** — the gate short-circuits the role/email checks
for any user with the `Admin` role
([PageAccessGate.tsx:37](src/app/components/auth/PageAccessGate.tsx#L37)).
That's why `admin.*` page entries can't be deleted from the UI: their
role list is decorative for admins, and bootstrap re-seeds them on every
backend startup anyway.

### Registering a new tool

When you add a new workflow tool page (e.g. `/user/my-new-tool/page.tsx`),
two artefacts have to line up so the gate works:

1. **Wrap the page in `<PageAccessGate pageKey="tools.my-new-tool">`**
   ([example](src/app/user/sie/page.tsx)). Pick a stable, dotted page key
   — these end up in the DB and in URLs (`/api/access/page/<page_key>`),
   so renaming is a migration.
2. **Register it in [src/config/toolRegistry.ts](src/config/toolRegistry.ts)** —
   add `{ pageKey: "tools.my-new-tool", title: "My New Tool", href: "/user/my-new-tool" }`.
   This is what the `/admin/page-access` "workflow tools aren't
   registered yet" banner reads from. New entries appear there
   automatically until an admin assigns roles and saves.
3. **Hand-create or seed an entry** in `/admin/page-access`:
   - Quickest path: click the `+ tools.my-new-tool` chip in the
     unregistered-tools banner — it pre-fills the editor with the
     tool's title as description.
   - Add the roles that should reach it. Save.
4. **Optional: bake a default into bootstrap.** If the tool ships
   with sensible default access (e.g. a curation tool every Curator
   should have), add it to `_default_page_access` in
   [bootstrap.py](file:///Users/tekrajchhetri/Documents/brainypedia_codes_design/BrainKB/usermanagement_service/core/bootstrap.py) so a fresh DB has it
   pre-seeded. This is idempotent — won't overwrite an admin-edited entry.

Until step 3 (or 4) happens, the tool is denied to everyone except
admins. That's intentional — new tools shouldn't accidentally leak to
end-users between deployment and access configuration.

### Locking a tool to admin-only

If a tool should *never* be exposed to non-admins (e.g. data-destructive
operations, raw-DB inspection, anything that bypasses normal validation),
mark it `adminOnly` so admins can't accidentally relax the restriction
through `/admin/page-access`:

1. **In the tool's page** — add `adminOnly` to `<PageAccessGate>`:
   ```tsx
   <PageAccessGate pageKey="tools.danger-zone" adminOnly>
     <DangerZoneTool />
   </PageAccessGate>
   ```
   The gate skips the backend RBAC fetch entirely and just checks
   `isAdmin` from `/api/users/me`. Non-admins get a clear "Admin only"
   denial screen. Test override (`DISABLE_PAGE_ACCESS_GATE=true` in
   [src/config/featureFlags.ts](src/config/featureFlags.ts)) still works.

2. **In the tool registry** — match the gate by setting
   `adminOnly: true`:
   ```ts
   {
     pageKey: "tools.danger-zone",
     href: "/user/danger-zone",
     title: "Danger Zone",
     description: "Admin-only data-destructive ops.",
     icon: "shield",
     color: "var(--bkb-danger)",
     adminOnly: true,
   }
   ```
   The matching flag tells `/admin/page-access` to skip this tool from
   the "workflow tools aren't registered yet" banner — registering it
   would be a no-op since the gate ignores the page-access table when
   `adminOnly` is set.

3. **No DB entry needed.** Don't add an entry in `/admin/page-access`
   for admin-only tools. There's nothing to configure: an admin always
   passes, and any other role would still be denied at the gate
   regardless of what the page-access table says.

The two-flag pattern (gate + registry) is intentional: the gate is the
*enforcement point*, and the registry flag is the *intent declaration*
that keeps the admin UI consistent. Forgetting one fails safe — if you
set `adminOnly` only on the gate, the admin UI just shows the tool in
the unregistered banner pointlessly; if you set it only on the registry,
non-admins can still access the page (whatever its page-access entry
says). Both should match.

## OpenRouter API key (shared + personal)

LLM-backed tools (SIE, Resource extraction, …) need an OpenRouter API key
to call the model. The UI supports two layers:

1. **Admin-shared key** — configured on `/admin/dashboard` (Shared
   OpenRouter API key card). Encrypted at rest, distributed to authorised
   users via `/api/settings/openrouter-key/effective`. Rolling out a key
   for the whole team without asking each user to obtain their own.
2. **Personal key** — pasted by the user on `/user/dashboard` and stored
   in the per-tab `sessionStorage` slot `OPENROUTER_API_KEY_STORAGE`
   (defined in [useApiKeyValidator.ts](src/app/components/user/useApiKeyValidator.ts)).
   Always overrides the shared key for that user's session.

### Effective key resolution

`resolveOpenRouterKey()` (same module) returns the key in this order:

```
personal (sessionStorage) → shared (admin-set)  → none
```

`source` indicates which one is in play, so tools can show appropriate
status. Tools never render plaintext to non-admins; they pass the key
directly to OpenRouter as a Bearer token and that's it.

### Visibility rules

- **End users** can *use* the shared key (their browser receives the
  plaintext to forward to OpenRouter) but never *see* it as plaintext in
  the UI. The dashboard input shows "Shared admin key in use" with the
  last 4 characters and a banner explaining how to override.
- **Admins** can reveal the plaintext via the *Reveal current* button on
  the admin card. Internally that hits `GET /api/admin/settings/openrouter-key?reveal=true`.

### Role gating

When setting the shared key, the admin can pick a list of allowed roles.
Members of those roles (plus all admins) get the key on
`/api/settings/openrouter-key/effective`; other users get
`{ source: "none" }` and have to supply their own. Empty role list = "any
signed-in user with a profile".

### At-rest encryption

The shared key is Fernet-encrypted using the same key as OAuth tokens
(`USERMANAGEMENT_OAUTH_TOKEN_ENC_KEY` — see the
[OAuth setup](#-oauth-setup-backend) section). One key for both surfaces
keeps key management simple. Rotating that env value invalidates both
stored OAuth tokens *and* the shared API key — re-set both after rotation.

### API surface

- `GET    /api/admin/settings/openrouter-key[?reveal=true]` — admin only; metadata + optional plaintext
- `PUT    /api/admin/settings/openrouter-key` — admin only; body `{ api_key, allowed_role_names? }`
- `DELETE /api/admin/settings/openrouter-key` — admin only; clears the row
- `GET    /api/settings/openrouter-key/effective` — any signed-in user with an allowed role; returns `{ source, api_key, last_4 }`

## Codebase Structure

The directory tree, and what to change for a given kind of task (pages, API routes,
API clients, components), is in
[DEVELOPER_DOCUMENTATION.md](DEVELOPER_DOCUMENTATION.md) — it carries the fuller
version, so it is not repeated here.

What follows is the part that is specific to this README: how the YAML-driven
knowledge-base pages are configured.

### `/src/config/` - Configuration
#### **YAML Files (`/src/config/yaml/`)**
- **Key Files**:
  - `page-mapper.yaml` - Maps page slugs to their configuration files
  - `config-knowledgebases.yaml` - Knowledge base list configurations
  - `*-detail.yaml` - Detail page configurations (e.g., `genomeannotation-detail.yaml`)
  - `*-list.yaml` - List page configurations (e.g., `ner-list.yaml`)

#### Steps to configure new KB page
1. Update the `config-knowledgebases.yaml` to include page and sparql query. This is what you would see first when you visit on that particular page.
Below is an example for Genome Annotation.
```yaml
  - page: "Genome Annotation"
    title: "Genome Annotation"
    description: "Genome Annotation Data."
    slug: "genomeannotation"
    sparql_query: |-
      PREFIX bican: <https://identifiers.org/brain-bican/vocab/>
      PREFIX NIMP: <http://example.org/NIMP/>
      PREFIX biolink: <https://w3id.org/biolink/vocab/>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT DISTINCT ?entity ?label
      WHERE {
      GRAPH <https://test-upload.com/> {
          ?entity biolink:category "bican:GenomeAnnotation"^^<http://www.w3.org/2001/XMLSchema#anyURI>;
              rdfs:label ?label;
        }
      }
    default_kb: false

```
2. Create a detail YAML file (e.g., `myentity-detail.yaml`) for the detail view. Below is an example for genome annotation. See `YAML Configuration Reference` for details.
```yaml
type: "detail"
route: "/knowledge-base/genomeannotation"
slug: "genomeannotation"
backLink: "/knowledge-base/genomeannotation"
title: "Genome Annotation"
dataSource:
  type: "sparql"
  endpoint: "/api/entity-query"
  idParam: "id"
  cardConfigFile: "genomeannotation_card.yaml"
tabs:
  - id: "summary"
    label: "Summary"
    sections:
      - title: "Summary"
        layout: "default"
        # Fields will be auto-generated from data
  - id: "related-info"
    label: "Related Info"
    type: "related"
  - id: "contributors"
    label: "Contributors"
    type: "provenance"
  - id: "revision-history"
    label: "Revision History"
    type: "provenance"
showProvenance: false
showRelated: true
```
Make sure you have `*_card.yaml` page to show card, in our case `genomeannotation_card.yaml`. This will contain the SPARQL query.
```yaml

# EntityView:
id: ui:1
name: GenomeAnnotation_card
slug: genomeannotation
description: Genome Annotation
boxes:
  - box:
    slug: summarybox
    id: ui:2
    name: Summary
    cardtype: card
    box_header:
      key: id
    sparql_query: |-
        PREFIX NIMP: <http://example.org/NIMP/>
                PREFIX prov: <http://www.w3.org/ns/prov#>
                PREFIX biolink: <https://w3id.org/biolink/vocab/>
                
                SELECT DISTINCT ?subject ?predicate ?object ?category_type
                WHERE {
                GRAPH <https://test-upload.com/> {
                  {  BIND(<{0}> AS ?id)
                      ?subject ?predicate ?id . }
                      UNION
                      { BIND(<{0}> AS ?id)
                      ?id ?predicate ?object . }
                      UNION
                      { BIND(<{0}> AS ?id)
                      ?subject ?id ?object . }
                      
                      OPTIONAL {
                      ?id prov:wasDerivedFrom ?derivedFrom .
                      ?derivedFrom biolink:category ?category_type .
                      }
                  }
              }
    box_additional_info:
      is_iterable: true
      properties:
        - key: Source Derived From
          sparql_query: |-
            PREFIX NIMP:   <http://example.org/NIMP/>
            PREFIX prov:   <http://www.w3.org/ns/prov#>
            PREFIX biolink: <https://w3id.org/biolink/vocab/>
            
            SELECT DISTINCT ?subject ?predicate ?object ?category_type
            WHERE {
              GRAPH <https://test-upload.com/> {
            
                # focus_id is either the root itself or any *direct* wasDerivedFrom target
                #{
                #  VALUES ?focus_id { <{0}> }
                #}
                #UNION
                {
                  <{0}> prov:wasDerivedFrom ?focus_id .
                }
            
                # Neighborhood of each focus_id
                {
                  # ... as object
                  ?subject ?predicate ?focus_id .
                }
                UNION
                {
                  # ... as subject (but do NOT follow its own wasDerivedFrom further)
                  ?focus_id ?predicate ?object .
                  FILTER (?predicate != prov:wasDerivedFrom)
                }
                UNION
                {
                  # ... as predicate
                  ?subject ?focus_id ?object .
                }
            
                # Category of the focus node itself
                OPTIONAL {
                  ?focus_id biolink:category ?category_type .
                }
              }
            }

```
3. Configure the `page-mapper.yaml` , i.e., update it to add new page information.
```yaml
PageMapper:
  # List pages
  - type: "list"
    slug: "ner"
    filename: "ner-list.yaml"
  
  # Detail pages
  - type: "detail"
    slug: "ner"
    filename: "ner-detail.yaml"
  
  - type: "detail"
    slug: "myentity"
    filename: "myentity-detail.yaml"
```
For our genomeannotation page, we will add new entry.
```yaml
PageMapper:
  # List pages
  - type: "list"
    slug: "ner"
    filename: "ner-list.yaml"
  
  # Detail pages
  - type: "detail"
    slug: "ner"
    filename: "ner-detail.yaml"
  
  - type: "detail"
    slug: "myentity"
    filename: "myentity-detail.yaml"
    
  - type: "detail"
    slug: "genomeannotation"
    filename: "genomeannotation-detail.yaml"
```
Finally, add it to the `NavBar`. That's it, you should have the genome annotation page added.


### YAML Configuration Reference

#### List Page Configuration for API-based e.g., NER, Resources

```yaml
type: "list"                    # Required: must be "list"
route: "/knowledge-base/slug"  # Required: page route
slug: "slug"                   # Required: unique identifier
title: "Page Title"            # Required: page title
description: "Description"     # Optional: page description
dataSource:                    # Required: data source configuration
  type: "api-get"              # Required: "api-get" or "api-post"
  endpoint: "NEXT_PUBLIC_ENV_VAR_NAME"  # Required: environment variable name (e.g., "NEXT_PUBLIC_NER_GET_ENDPOINT")
  apiRoute: "/api/route"       # Required: Next.js API route (e.g., "/api/ner")
  params:                       # Optional: additional parameters
    tokenEndpointType: "query"  # Optional: "ml", "query", or "default" (default: "query")
    useAuth: true              # Optional: enable/disable auth (default: true)
columns:                       # Required: column definitions
  - key: "field_name"          # Required: field key from API response
    label: "Display Label"     # Required: column header
    type: "text"               # Required: "text", "link", "badge", "date", "array"
    linkPath: "/knowledge-base/slug"  # Optional: for "link" type (base path for links)
    badgeVariant: "default"    # Optional: for "badge" type
    arraySeparator: ", "       # Optional: for "array" type
itemsPerPage: 50              # Optional: items per page (default: 50)
search:                       # Optional: search configuration
  enabled: true               # Required: enable/disable search
  placeholder: "Search..."    # Optional: search placeholder text
```

Below is an example for resources list page.
```yaml
type: "list"
route: "/knowledge-base/resources"
slug: "resources"
title: "Structured Resources"
description: "Browse extracted resources from neuroscience publications, including models, code, datasets, and benchmarks."
dataSource:
  type: "api-get"
  endpoint: "NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT"
  apiRoute: "/api/resources"
  params:
    tokenEndpointType: "ml"  # Options: "ml", "query", "default" (default: "query")
    useAuth: true  # Optional: set to false to disable auth (default: true)
  dataExtractor: "extractResourceData"
columns:
  - key: "name"
    label: "Name"
    type: "link"
    linkPath: "/knowledge-base/resources"
  - key: "category"
    label: "Category"
    type: "text"
  - key: "type"
    label: "Type"
    type: "text"
  - key: "judge_score"
    label: "Judge Score"
    type: "text"
itemsPerPage: 50
search:
  enabled: true
  placeholder: "Search resources by name, category, type, description..."
```

#### Detail Page Configuration for SPARQL-based page

```yaml
type: "detail"                 # Required: must be "detail"
route: "/knowledge-base/slug" # Required: page route
slug: "slug"                  # Required: unique identifier
backLink: "/knowledge-base/slug" # Required: back navigation link
title: "Page Title"           # Required: page title
dataSource:                   # Required: data source configuration
  type: "sparql"              # Required: "sparql"
  endpoint: "/api/entity-query"  # Required: Next.js API route (no env var needed)
  idParam: "id"               # Optional: ID parameter name (default: "id")
  cardConfigFile: "entity_card.yaml"  # Required: card configuration file name
tabs:                         # Required: tab definitions
  - id: "summary"             # Required: unique tab identifier
    label: "Summary"          # Required: tab label
    sections:                 # Optional: field sections
      - title: "Summary"      # Required: section title
        layout: "default"     # Optional: layout type (default: "default")
        # Fields will be auto-generated from card config file
  - id: "related-info"        # Required: unique tab identifier
    label: "Related Info"     # Required: tab label
    type: "related"           # Required: special tab type
  - id: "contributors"        # Required: unique tab identifier
    label: "Contributors"     # Required: tab label
    type: "provenance"        # Required: special tab type
  - id: "revision-history"    # Required: unique tab identifier
    label: "Revision History" # Required: tab label
    type: "provenance"        # Required: special tab type
showProvenance: false         # Optional: show provenance tab (default: true)
showRelated: true             # Optional: show related items (default: false)
```


## License
Apache 2.0
