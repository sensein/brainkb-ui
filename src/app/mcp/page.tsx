/**
 * MCP — public marketing page for the BrainKB MCP server. Content follows the
 * MCP server's own site (MCP_SITE), condensed: full per-client setup and the
 * FAQ stay there and are linked. The look is the Home page's design (the `.lp`
 * classes in components/marketing/landing/landing.css).
 */

import Link from "next/link";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import InstallCard from "../components/marketing/InstallCard";
import SkillSetup from "../components/marketing/SkillSetup";
import { dmSans, plexMono } from "../components/marketing/fonts";
import { MCP_ENDPOINT, MCP_SITE } from "../components/marketing/tokens";
import "../components/marketing/landing/landing.css";

const CAPABILITIES = [
  {
    di: "⇪",
    name: "Ingest",
    desc: "Load RDF from text, files or large streamed uploads (up to 5 GB). Each ingest runs as a background job, attributed to you.",
    asks: ["Ingest review.ttl into my lab space", "Did last night's ingest finish?"],
  },
  {
    di: "⌕",
    name: "Search and read",
    desc: "Search everything you may read, open a whole space, or list the graphs in the knowledge base.",
    asks: ["Find anything about Purkinje cells", "What's in the hmba space?"],
  },
  {
    di: "◈",
    name: "Ready-made questions",
    desc: "Vetted questions about extracted entities, cells, markers, phenotypes and causal claims, answered without writing SPARQL.",
    asks: ["How is the neocortex written across papers?", "Which entities do these papers share?"],
  },
  {
    di: "↻",
    name: "Provenance",
    desc: "The history of any graph as W3C PROV-O: who added what, when, and the exact triples each ingest contributed.",
    asks: ["What changed in my space this week?", "Who added these triples?"],
  },
  {
    di: "▣",
    name: "Workspaces",
    desc: "Create private or public spaces, for yourself or a team, and choose who can read or edit them.",
    asks: ["Create a private space for my lab", "Give alice@lab.org edit access"],
  },
  {
    di: "⚿",
    name: "Identity and access",
    desc: "Sign in with Globus, ORCID or GitHub, keep a personal access token, and let admins manage roles.",
    asks: ["Log me in with Globus", "Make me a token for this laptop"],
  },
] as const;

export default function McpPage() {
  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />

      <main className="wrap">
        <section className="hero page">
          <div className="hero-copy">
            <span className="eyebrow">Agent-ready · MCP</span>
            <h1>Use BrainKB from your AI agent.</h1>
            <p className="lead">
              The BrainKB MCP server connects your agent to the knowledge base. Ask in plain language, and it signs in
              as you, ingests RDF into your workspaces, answers questions over extracted entities, and traces where
              every triple came from.
            </p>
            <p className="muted-p">
              Public spaces can be read without logging in. Everything else runs as you, within your permissions.
            </p>
            <div className="endpoint">
              <span className="lbl">Endpoint</span>
              <div className="code">
                <b>https://</b>
                {MCP_ENDPOINT.replace(/^https?:\/\//, "")}
              </div>
            </div>
            <p className="muted-p">
              Works with <b>Claude Code</b>, <b>claude.ai</b>, <b>ChatGPT</b>, <b>Perplexity</b>, <b>Cursor</b>,{" "}
              <b>VS Code</b> and <b>Copilot</b>, <b>Codex</b>, and any other MCP client.
            </p>
            <div className="hero-actions">
              <a className="btn primary" href="#skill">Install the BrainKB skill ↓</a>
            </div>
          </div>
          <InstallCard authNote skillHref="#skill" />
        </section>
      </main>

      <section className="band-section">
        <div className="wrap">
          <div className="section-title">
            <div>
              <span className="eyebrow">Capabilities</span>
              <h2>Less SPARQL.<br />More science.</h2>
            </div>
            <p>Ask in plain language and your agent picks the right BrainKB tools. For example:</p>
          </div>
          <div className="grid3 tight blue-items">
            {CAPABILITIES.map((c) => (
              <div key={c.name} className="dec-item">
                <i className="di" aria-hidden="true">{c.di}</i>
                <h4>{c.name}</h4>
                <p>{c.desc}</p>
                <ul className="asks">
                  {c.asks.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="section" id="skill">
          <div className="section-title center">
            <div>
              <span className="eyebrow">Skill</span>
              <h2>Connect with the BrainKB skill.</h2>
              <p>
                One command installs the BrainKB skill and registers the MCP server. The skill teaches your agent to
                confirm who it is acting as, ingest large files safely, pick the right workspace and question, and
                answer provenance questions.
              </p>
            </div>
          </div>
          <SkillSetup />
        </section>

        <section className="cta">
          <div>
            <h2>Every client,<br />step by step.</h2>
            <p>
              Setup for VS Code, Copilot, Claude Desktop and more, the BrainKB skill, and answers to common questions.
            </p>
          </div>
          <div className="actions">
            <a className="btn primary" href={MCP_SITE} target="_blank" rel="noopener noreferrer">
              Full setup guide ↗
            </a>
            <Link className="btn" href="/explore">Explore the graph</Link>
          </div>
        </section>
      </div>

      <MarketingFooter />
    </div>
  );
}
