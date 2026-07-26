"use client";

/**
 * /admin/guide — In-app reference for the admin surfaces.
 *
 * Mirrors the operator-facing sections of brainkb-ui/README.md so admins can
 * find answers without leaving the app. Sections are anchor-linked so a row
 * in the table of contents jumps to the relevant block.
 */

import React from "react";
import Link from "next/link";
import { FONTS, Icon } from "@/src/app/components/design-system";

interface Section {
  id: string;
  title: string;
  icon: string;
  body: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: "users",
    title: "Managing users",
    icon: "person",
    body: (
      <>
        <p>
          Open <Link href="/admin/users" className="bkb-link">/admin/users</Link>. The list shows every
          UserProfile created by an OAuth sign-in, with their email, ORCID, providers, and roles.
        </p>
        <ul>
          <li>
            <strong>Search</strong> by name, email, or ORCID. <strong>Filter</strong> by role using
            the dropdown.
          </li>
          <li>
            <strong>Add a role</strong>: in the <em>Roles</em> column, pick from the
            <em>+ add role</em> dropdown. Custom roles you've defined under Roles &amp; permissions
            also appear here.
          </li>
          <li>
            <strong>Remove a role</strong>: click the <code>RoleName ✕</code> chip on the row.
          </li>
          <li>
            <strong>Delete a user</strong>: red <em>Delete</em> button at the row's right edge —
            cascades through their activities, role assignments, and OAuth identities.
          </li>
        </ul>
        <p>
          For the <strong>first admin</strong>: set
          <code>USERMANAGEMENT_BOOTSTRAP_SUPERADMIN_EMAILS=you@example.com</code> in the backend's
          <code>.env</code>, restart the backend. The seeded account receives both
          the <em>Admin</em> role (for permissions) and the <em>SuperAdmin</em> role
          (the protected marker — can't be banned, deleted, or stripped via the UI).
          After that admin signs in, <strong>/admin/users</strong> is the canonical
          place to grant the regular Admin role to anyone else.
        </p>
      </>
    ),
  },
  {
    id: "roles",
    title: "Roles & permissions",
    icon: "shield",
    body: (
      <>
        <p>
          Open <Link href="/admin/roles" className="bkb-link">/admin/roles</Link>. Two layers:
        </p>
        <ul>
          <li>
            <strong>Roles</strong>: Admin, Curator, Reviewer, etc. Plus any custom roles you
            create (e.g. <em>MIT User</em>, <em>Lab X Member</em>).
          </li>
          <li>
            <strong>Permissions</strong>: fine-grained <code>resource.action</code> capabilities
            (<code>user.read</code>, <code>role.assign</code>, …). The <em>Admin</em> role is
            granted every permission on backend startup.
          </li>
        </ul>
        <h4>Canonical vs custom roles</h4>
        <p>
          The 13 canonical roles (Admin, Submitter, Annotator, Mapper, Curator, Reviewer,
          Validator, Conflict Resolver, Knowledge Contributor, Evidence Tracer,
          Provenance Tracker, Moderator, Ambassador) are <strong>referenced in code</strong> —
          don't rename them. Bootstrap re-seeds any missing canonical roles on backend start.
        </p>
        <p>
          <strong>Custom roles</strong> are organisational labels that don't get referenced by
          name in code. Format rules: must start with a letter; letters / numbers / spaces /
          hyphens / underscores only; max 100 chars. Same rules for category (max 50 chars).
        </p>
        <h4>Mapping permissions to roles</h4>
        <p>
          On a role's row, click <em>Edit permissions</em> to multi-select the permissions the
          role should grant. The Admin role's permissions are baked in by bootstrap and can't be
          unset from the UI.
        </p>
      </>
    ),
  },
  {
    id: "page-access",
    title: "Page access (per-tool RBAC)",
    icon: "lock",
    body: (
      <>
        <p>
          Open <Link href="/admin/page-access" className="bkb-link">/admin/page-access</Link>. Each
          UI tool page has a <code>page_key</code> (e.g. <code>tools.ingest-kg</code>); this surface
          maps each key to the roles and individual users that may reach it.
        </p>
        <h4>Default-deny</h4>
        <p>
          Tools without an entry are denied to non-admins. <strong>Admins always pass</strong> the
          gate regardless — the check short-circuits on
          <code>isAdmin</code>, so deleting an
          <code>admin.*</code> entry never locks an Admin out (and bootstrap re-seeds those rows on
          every backend start anyway). The X button on <code>admin.*</code> rows is therefore
          disabled.
        </p>
        <h4>Granting tool access to a role</h4>
        <ol>
          <li>Find the page in the <em>Registered pages</em> list, or click the unregistered-tool
            chip in the banner to seed a new entry.</li>
          <li>In the editor, click each role chip under <em>Allowed roles</em> that should pass.</li>
          <li>Optionally paste comma- or newline-separated emails under <em>User-email overrides</em>
            to grant access to specific users regardless of their role.</li>
          <li>Save.</li>
        </ol>
        <h4>Public pages</h4>
        <p>
          Toggle <em>Public</em> if anonymous users should reach the page (rare for workflow tools —
          usually only for content browsing pages). The <code>home</code> entry is the typical example.
        </p>
        <h4>Registering a brand-new tool</h4>
        <p>When you add a new tool page in the codebase:</p>
        <ol>
          <li>Wrap the page in <code>{`<PageAccessGate pageKey="tools.your-tool">`}</code>.</li>
          <li>Add an entry to <code>src/config/toolRegistry.ts</code> with the same{" "}
            <code>pageKey</code>.</li>
          <li>Open this page (page-access), seed via the unregistered banner, assign roles, save.</li>
          <li>(Optional) bake a default into <code>bootstrap.py::seed_default_page_access</code> for
            fresh deployments.</li>
        </ol>
        <h4>Locking a tool to admin-only</h4>
        <p>
          Wrap the tool page in <code>{`<PageAccessGate pageKey="..." adminOnly>`}</code> and set
          <code>adminOnly: true</code> on the matching <code>toolRegistry.ts</code> entry. The gate
          skips the backend RBAC check and only verifies <code>isAdmin</code>; the unregistered-tool
          banner here will skip it. No DB entry needed.
        </p>
      </>
    ),
  },
  {
    id: "bans",
    title: "Suspending users",
    icon: "lock",
    body: (
      <>
        <p>
          Suspend a user without deleting their profile when you need to block their access but
          keep their history (contributions, OAuth identities, role assignments). Lifting the
          suspension restores access immediately — no re-OAuth required.
        </p>
        <h4>Suspending</h4>
        <ol>
          <li>Open <Link href="/admin/users" className="bkb-link">/admin/users</Link>.</li>
          <li>On the user's row, click <strong>Ban</strong>.</li>
          <li>Enter a reason (required; up to 1000 chars). Stored on the profile, surfaced
            on the row's "banned" chip tooltip, and recorded in the activity log under
            <code>USER_BAN</code>.</li>
        </ol>
        <h4>What changes for the suspended user</h4>
        <ul>
          <li><strong>Every authenticated request returns 403</strong> — the
            <code>get_current_user</code> dependency re-reads <code>is_banned</code> on each
            request, so the ban takes effect immediately, even on existing JWTs.</li>
          <li>The user's UI shows a clean <strong>Account suspended</strong> notice with the
            reason instead of the dashboard / tool pages.</li>
          <li>Public pages they could read while signed out remain readable — only
            authenticated actions are blocked.</li>
        </ul>
        <h4>Lifting</h4>
        <p>
          On the suspended user's row, click <strong>Unban</strong>. Access is restored on
          the next request; the action is logged as <code>USER_UNBAN</code>.
        </p>
        <h4>Refusals — by design</h4>
        <ul>
          <li><strong>Can't ban yourself.</strong> The endpoint refuses the request.</li>
          <li><strong>Can't ban a SuperAdmin.</strong> SuperAdmin accounts are
            seeded from <code>USERMANAGEMENT_BOOTSTRAP_SUPERADMIN_EMAILS</code> and
            protected against ban, delete, and role-strip. Other Admins are
            bannable directly — multiple admins coexist and can moderate each
            other.</li>
          <li><strong>Banning is reversible; deleting is not.</strong> Use <em>Delete</em> only
            for spam / invalid accounts where you don't need the audit trail.</li>
        </ul>
        <h4>IP / IP-range bans</h4>
        <p>
          Not implemented at the application layer. Recommendation is to handle IP blocks at
          the WAF / reverse-proxy layer (Cloudflare rules, nginx <code>geo</code>+<code>deny</code>,
          AWS WAF) since proxies, NAT, IPv6, and mobile carriers make app-layer enforcement
          fragile and easy to bypass.
        </p>
      </>
    ),
  },
  {
    id: "shared-api-key",
    title: "Shared OpenRouter API key",
    icon: "key",
    body: (
      <>
        <p>
          Configure on the <Link href="/admin/dashboard" className="bkb-link">Statistics</Link> page,
          under <strong>Shared OpenRouter API key</strong>.
        </p>
        <h4>Setting the key</h4>
        <ol>
          <li>Click <em>Set shared key</em> (or <em>Replace key</em> if one exists).</li>
          <li>Paste the OpenRouter key. Optionally select roles allowed to consume it — empty
            selection means any signed-in user.</li>
          <li>Save. Encrypted at rest using the same Fernet key as OAuth tokens
            (<code>USERMANAGEMENT_OAUTH_TOKEN_ENC_KEY</code>).</li>
        </ol>
        <h4>Visibility rules</h4>
        <ul>
          <li><strong>Admins</strong> can reveal the plaintext via the <em>Reveal current</em>
            button.</li>
          <li><strong>End users in an allowed role</strong> can <em>use</em> the key but never
            <em>see</em> plaintext — the dashboard input shows "Shared admin key in use" and
            forwards the key directly to OpenRouter.</li>
          <li><strong>Users not in an allowed role</strong> get no key from the effective endpoint
            and must paste their own.</li>
        </ul>
        <h4>User precedence</h4>
        <p>
          A user's own personal key (entered on their dashboard) always overrides the shared key
          for their session. Tools resolve as: <code>personal → shared → none</code>.
        </p>
      </>
    ),
  },
  {
    id: "env",
    title: "Backend env vars (cheat sheet)",
    icon: "settings",
    body: (
      <>
        <p>
          Set in <code>BrainKB/.env</code>. Restart the backend after editing — env is read once at
          startup.
        </p>
        {/* Long env-var names overflow on phones — let the table scroll horizontally */}
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 480 }}>
          <thead>
            <tr style={{ background: "var(--bkb-surfaceAlt)", textAlign: "left" }}>
              <th style={{ padding: 8, border: "1px solid var(--bkb-border)" }}>Variable</th>
              <th style={{ padding: 8, border: "1px solid var(--bkb-border)" }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["USERMANAGEMENT_PUBLIC_BASE_URL", "Backend's public URL — used for OAuth redirect_uri"],
              ["USERMANAGEMENT_FRONTEND_CALLBACK_URL", "Where the backend redirects users after OAuth"],
              ["USERMANAGEMENT_OAUTH_TOKEN_ENC_KEY", "Fernet key for encrypting OAuth tokens + shared API keys at rest"],
              ["USERMANAGEMENT_BOOTSTRAP_SUPERADMIN_EMAILS", "Comma-separated emails granted SuperAdmin (+Admin) on backend startup. Protected from ban/delete/role-strip."],
              ["GITHUB_CLIENT_ID / _SECRET", "GitHub OAuth credentials (set on backend, NOT UI)"],
              ["ORCID_CLIENT_ID / _SECRET", "ORCID OAuth credentials"],
              ["GLOBUS_CLIENT_ID / _SECRET", "Globus OAuth credentials"],
            ].map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: 8, border: "1px solid var(--bkb-border)", fontFamily: FONTS.mono }}>{k}</td>
                <td style={{ padding: 8, border: "1px solid var(--bkb-border)" }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <p style={{ marginTop: 12 }}>
          OAuth provider redirect URLs are configured in each provider's developer console and must
          point at the <strong>backend</strong> (e.g.{" "}
          <code>http://localhost:8004/api/auth/github/callback</code>), <strong>not</strong> the UI.
        </p>
      </>
    ),
  },
  {
    id: "diagnostics",
    title: "Diagnostics",
    icon: "info",
    body: (
      <>
        <p>Quick curl checks to confirm the backend is wired correctly:</p>
        <pre style={{ fontSize: 11, background: "var(--bkb-surfaceAlt)", padding: 10, borderRadius: 6, overflowX: "auto" }}>
{`# OAuth providers — should show \`configured: true\` for at least one
curl -s http://localhost:8004/api/auth/providers | jq

# Your roles, profile_id, scopes (replace $JWT)
curl -s -H "Authorization: Bearer $JWT" http://localhost:8004/api/users/me | jq

# Your effective shared OpenRouter key (or \`source: none\`)
curl -s -H "Authorization: Bearer $JWT" \\
  http://localhost:8004/api/settings/openrouter-key/effective | jq

# Page access for a specific tool
curl -s -H "Authorization: Bearer $JWT" \\
  http://localhost:8004/api/access/page/tools.ingest-kg | jq`}
        </pre>
      </>
    ),
  },
];

export default function AdminGuidePage() {
  return (
    <div style={{ maxWidth: 920 }}>
      <h1 style={{ fontFamily: FONTS.display, fontSize: 32, margin: "0 0 4px", letterSpacing: "-0.02em", fontWeight: 400 }}>
        Admin guide
      </h1>
      <div style={{ fontSize: 13, color: "var(--bkb-textMuted)", marginBottom: 24 }}>
        How to configure users, roles, page access, and shared secrets without leaving the app.
      </div>

      {/* Table of contents */}
      <div className="bkb-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
          Contents
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="bkb-chip"
              style={{ textDecoration: "none", color: "var(--bkb-text)" }}
            >
              <Icon name={s.icon} size={11} /> {s.title}
            </a>
          ))}
        </div>
      </div>

      {SECTIONS.map((s) => (
        <section
          key={s.id}
          id={s.id}
          className="bkb-card"
          style={{ padding: 22, marginBottom: 16, scrollMarginTop: 80 }}
        >
          <h2
            style={{
              fontFamily: FONTS.display,
              fontSize: 22,
              margin: "0 0 14px",
              letterSpacing: "-0.01em",
              fontWeight: 400,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Icon name={s.icon} size={18} /> {s.title}
          </h2>
          <div className="bkb-guide-prose" style={{ fontSize: 13, lineHeight: 1.7, color: "var(--bkb-text)" }}>
            {s.body}
          </div>
        </section>
      ))}
    </div>
  );
}
