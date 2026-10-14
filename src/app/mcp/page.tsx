/**
 * MCP — public marketing page for the BrainKB MCP server. Content is the real
 * MCP server details; the look is the Home page's design (the `.lp` classes in
 * components/marketing/landing/landing.css).
 */

import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import InstallCard from "../components/marketing/InstallCard";
import { dmSans, plexMono } from "../components/marketing/fonts";
import { MCP_ENDPOINT } from "../components/marketing/tokens";
import "../components/marketing/landing/landing.css";

const CAPABILITIES = [
  { di: "▣", name: "Spaces & graphs", desc: "Create private/team workspaces, register named graphs, manage members and access." },
  { di: "⇪", name: "Ingest", desc: "Load RDF (Turtle / N-Triples / JSON-LD) — raw text or files up to ~5 GB — as background jobs." },
  { di: "⌕", name: "Read & search", desc: "Access-filtered full-text search, read a space's RDF, list registered graphs." },
  { di: "↻", name: "Provenance (PROV-O)", desc: "Per-job provenance, a graph's change history, and the exact triples each ingest added." },
  { di: "⚿", name: "Personal Access Tokens", desc: "Mint a browser-free token to authenticate the assistant, then revoke it any time." },
  { di: "◉", name: "Admin (if authorized)", desc: "Manage users, roles, capabilities, and per-space access rules." },
] as const;

const CLIENTS = [
  ["✳", "Claude Code"], ["✳", "claude.ai"], ["◎", "ChatGPT"], ["⌕", "Perplexity"],
  ["▸", "Cursor"], ["◇", "VS Code & Copilot"], ["›_", "Codex"],
];

export default function McpPage() {
  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />

      <main className="wrap">
        <section className="hero page">
          <div className="hero-copy">
            <span className="eyebrow">Agent-ready · MCP</span>
            <h1>The BrainKB MCP server.</h1>
            <p className="lead">
              BrainKB exposes an MCP server so an assistant can operate the knowledge graph on your behalf: ingest
              data, search, explore provenance, and manage spaces, using your own account and permissions.
            </p>
            <p className="muted-p">
              Every action is access-controlled server-side exactly as in this web app — a <code>403</code> means a
              permission is missing, not a broken token.
            </p>
            <div className="endpoint">
              <span className="lbl">Endpoint</span>
              <div className="code">
                <b>https://</b>
                {MCP_ENDPOINT.replace(/^https?:\/\//, "")}
              </div>
            </div>
            <div className="clients" aria-label="Supported clients" style={{ margin: "26px 0 0" }}>
              {CLIENTS.map(([i, name]) => (
                <span key={name} className="client"><i>{i}</i>{name}</span>
              ))}
              <span className="client any">+ any MCP client</span>
            </div>
          </div>
          <InstallCard authNote />
        </section>
      </main>

      <section className="band-section">
        <div className="wrap">
          <div className="section-title">
            <div>
              <span className="eyebrow">Capabilities</span>
              <h2>What your assistant<br />can do.</h2>
            </div>
            <p className="note">TODO: we should provide more description and links to the skills</p>
          </div>
          <div className="grid3 tight blue-items">
            {CAPABILITIES.map((c) => (
              <div key={c.name} className="dec-item">
                <i className="di" aria-hidden="true">{c.di}</i>
                <h4>{c.name}</h4>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
