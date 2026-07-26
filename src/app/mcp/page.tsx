"use client";

/**
 * /mcp — how to drive BrainKB from an AI assistant via the Model Context
 * Protocol (MCP) server. Editorial style consistent with the About/landing
 * pages (FONTS + --bkb-* tokens + .bkb-card + .home-pad).
 */

import { FONTS } from "@/src/app/components/design-system";

const MCP_URL = "https://mcp.brainkb.org/mcp";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 12,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--bkb-accent)",
        fontWeight: 600,
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bkb-card"
      style={{ padding: 28, borderRadius: 16, background: "var(--bkb-surfaceAlt)", height: "100%" }}
    >
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre
      style={{
        fontFamily: FONTS.mono,
        fontSize: 13,
        lineHeight: 1.6,
        background: "var(--bkb-surface)",
        border: "1px solid var(--bkb-border)",
        borderRadius: 10,
        padding: "14px 16px",
        overflowX: "auto",
        margin: "10px 0 0",
        color: "var(--bkb-text)",
      }}
    >
      <code>{children}</code>
    </pre>
  );
}

const CAPABILITIES: { h: string; d: string }[] = [
  { h: "Spaces & graphs", d: "Create private/team workspaces, register named graphs, manage members and access." },
  { h: "Ingest", d: "Load RDF (Turtle / N-Triples / JSON-LD) — raw text or files up to ~5 GB — as background jobs." },
  { h: "Read & search", d: "Access-filtered full-text search, read a space's RDF, list registered graphs." },
  { h: "Provenance (PROV-O)", d: "Per-job provenance, a graph's change history, and the exact triples each ingest added." },
  { h: "Personal Access Tokens", d: "Mint a browser-free token to authenticate the assistant, then revoke it any time." },
  { h: "Admin (if authorized)", d: "Manage users, roles, capabilities, and per-space access rules." },
];

export default function McpPage() {
  return (
    <main className="home-pad" style={{ padding: "72px 64px", maxWidth: 1100, margin: "0 auto" }}>
      <Eyebrow>AI access · Model Context Protocol</Eyebrow>
      <h1 style={{ fontFamily: FONTS.display, fontSize: 44, letterSpacing: "-0.02em", lineHeight: 1.05, margin: "0 0 18px", color: "var(--bkb-text)" }}>
        Use BrainKB from your AI assistant
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--bkb-textMuted)", maxWidth: 720, margin: "0 0 40px" }}>
        BrainKB runs an <strong>MCP server</strong> so an assistant like Claude can operate the
        knowledge graph <em>on your behalf</em> — ingest data, search, explore provenance, and
        manage spaces — using your own account and permissions. Every action is access-controlled
        server-side exactly as it is in this web app.
      </p>

      <div className="home-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 40 }}>
        <Card>
          <div style={{ fontFamily: FONTS.display, fontSize: 20, color: "var(--bkb-text)", marginBottom: 6 }}>Connect</div>
          <p style={{ fontSize: 14, color: "var(--bkb-textMuted)", lineHeight: 1.6, margin: 0 }}>
            Add the hosted MCP endpoint to your client (e.g. Claude Code):
          </p>
          <Code>{`claude mcp add --transport http \\
  brainkb ${MCP_URL}`}</Code>
          <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, marginTop: 12 }}>
            Registry id <code style={{ fontFamily: FONTS.mono }}>org.brainkb/brainkb</code>. Transport:
            streamable-http.
          </p>
        </Card>
        <Card>
          <div style={{ fontFamily: FONTS.display, fontSize: 20, color: "var(--bkb-text)", marginBottom: 6 }}>Authenticate</div>
          <p style={{ fontSize: 14, color: "var(--bkb-textMuted)", lineHeight: 1.6, margin: 0 }}>
            Sign in once, mint a <strong>Personal Access Token</strong>, and send it with each request:
          </p>
          <Code>{`Authorization: Bearer brainkb_pat_…`}</Code>
          <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, marginTop: 12 }}>
            In the skill: <code style={{ fontFamily: FONTS.mono }}>brainkb_create_token()</code> after a
            one-time Globus login, then set it as <code style={{ fontFamily: FONTS.mono }}>BRAINKB_TOKEN</code>.
            Tokens are revocable and expire on inactivity.
          </p>
        </Card>
      </div>

      <Eyebrow>What the assistant can do</Eyebrow>
      <div className="home-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, marginBottom: 44 }}>
        {CAPABILITIES.map((c) => (
          <Card key={c.h}>
            <div style={{ fontFamily: FONTS.display, fontSize: 17, color: "var(--bkb-text)", marginBottom: 8 }}>{c.h}</div>
            <div style={{ fontSize: 14, color: "var(--bkb-textMuted)", lineHeight: 1.6 }}>{c.d}</div>
          </Card>
        ))}
      </div>

      <div
        style={{
          padding: "18px 20px",
          borderRadius: 12,
          background: "var(--bkb-surfaceAlt)",
          border: "1px solid var(--bkb-border)",
          fontSize: 14,
          color: "var(--bkb-textMuted)",
          lineHeight: 1.65,
        }}
      >
        The assistant acts as <strong>you</strong> — it can only see and change what your roles and
        space membership permit, and a <code style={{ fontFamily: FONTS.mono }}>403</code> means a
        permission is missing, not a broken token. Full tool reference and examples:{" "}
        <a href="http://docs.brainkb.org" style={{ color: "var(--bkb-accent)" }}>docs.brainkb.org</a>.
      </div>
    </main>
  );
}
