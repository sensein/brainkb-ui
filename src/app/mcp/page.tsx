/**
 * Use with AI — public page for connecting an AI agent to BrainKB over MCP.
 * Order: why and how to connect (hero with the per-client configuration), what
 * the agent can do (research vs knowledge management), a research example, one
 * setup interface (BrainKB skill or MCP only) with verification, then help.
 * The look is the Home page's design (the `.lp` classes in landing.css).
 */

import Link from "next/link";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import InstallCard from "../components/marketing/InstallCard";
import SkillSetup from "../components/marketing/SkillSetup";
import { dmSans, plexMono } from "../components/marketing/fonts";
import { MCP_ENDPOINT, MCP_SITE } from "../components/marketing/tokens";
import "../components/marketing/landing/landing.css";

type Cap = { di: string; name: string; line: string; desc: string; asks: string[] };

const RESEARCH: Cap[] = [
  { di: "⌕", name: "Discover", line: "Find concepts and relationships", desc: "Search everything you may read, open a whole space, or list the graphs in the knowledge base.", asks: ["Find what BrainKB has on disease-associated microglia", "What's in the hmba space?"] },
  { di: "◈", name: "Investigate", line: "Ask scientific questions", desc: "Vetted questions over extracted entities: cell types, regions, markers, phenotypes and causal claims, answered without writing SPARQL.", asks: ["Which papers link TREM2 to microglia?", "Which entities do these papers share?"] },
  { di: "❝", name: "Verify", line: "Trace supporting evidence", desc: "Where each assertion came from: the paper and sentence, who added it and when, as W3C PROV-O.", asks: ["Which sentence supports this claim?", "Who added these triples, and when?"] },
];
const MANAGE: Cap[] = [
  { di: "⇪", name: "Ingest", line: "Add structured data", desc: "Load RDF from text, files or large streamed uploads (up to 5 GB). Each ingest runs as a background job, attributed to you.", asks: ["Ingest review.ttl into my lab space", "Did last night's ingest finish?"] },
  { di: "▣", name: "Organize", line: "Work across spaces", desc: "Create private or public spaces and subspaces for yourself or a team, and see what changed in each.", asks: ["Create a private space for my lab", "What changed in my space this week?"] },
  { di: "⚿", name: "Control", line: "Manage access", desc: "Sign in with Globus, ORCID or GitHub, keep a personal access token, and choose who can read or edit.", asks: ["Give alice@lab.org edit access", "Make me a token for this laptop"] },
];

function Group({ title, caps }: { title: string; caps: Cap[] }) {
  return (
    <div className="cap-group">
      <span className="cap-k">{title}</span>
      <div className="grid3 tight blue-items">
        {caps.map((c) => (
          <div key={c.name} className="dec-item">
            <i className="di" aria-hidden="true">{c.di}</i>
            <h4>{c.name}</h4>
            <p className="cap-line">{c.line}</p>
            <p>{c.desc}</p>
            <ul className="asks">
              {c.asks.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function McpPage() {
  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />

      <main className="wrap">
        <section className="hero page" id="connect">
          <div className="hero-copy">
            <span className="eyebrow">Agent-ready · MCP</span>
            <h1>Use BrainKB from your AI agent.</h1>
            <p className="lead">
              Connect Claude, Codex, VS Code and other MCP-compatible clients to BrainKB. Search neuroscience
              knowledge, explore evidence-linked relationships, and work with your knowledge spaces in natural
              language.
            </p>
            <ul className="chips" aria-label="What you get">
              <li>MCP server</li>
              <li>Optional skill</li>
              <li>Public + private spaces</li>
            </ul>
            <div className="two-parts">
              <div>
                <b>MCP server</b>
                <span>Connects your agent to BrainKB&apos;s tools and knowledge. This is what you add to your client.</span>
              </div>
              <div>
                <b>BrainKB skill</b>
                <span>Optional. Adds instructions and workflows for using those tools well.</span>
              </div>
            </div>
            <div className="endpoint">
              <span className="lbl">Endpoint</span>
              <div className="code">
                <b>https://</b>
                {MCP_ENDPOINT.replace(/^https?:\/\//, "")}
              </div>
            </div>
          </div>
          <InstallCard authNote skillHref="#setup" />
        </section>
      </main>

      <section className="band-section">
        <div className="wrap">
          <div className="section-title">
            <div>
              <span className="eyebrow">What your agent can do</span>
              <h2>Less SPARQL.<br />More science.</h2>
            </div>
            <p>Ask in plain language and your agent picks the right BrainKB tools. For example:</p>
          </div>
          <Group title="Research with your agent" caps={RESEARCH} />
          <Group title="Manage knowledge" caps={MANAGE} />
        </div>
      </section>

      <div className="wrap">
        <section className="section" id="example">
          <div className="section-title">
            <div>
              <span className="eyebrow">Research in action</span>
              <h2>One question,<br />traced to its evidence.</h2>
            </div>
            <p>
              Why connect BrainKB to your agent: it answers from linked, sourced knowledge instead of from memory, and
              shows you where each part of the answer came from.
            </p>
          </div>
          <div className="example">
            <div className="ex-ask">
              <span className="ex-k">Researcher asks</span>
              <p>“What relationships are documented between TREM2, disease-associated microglia and Alzheimer&apos;s disease?”</p>
            </div>
            <ol className="ex-flow">
              <li><span className="ex-k">Find the concepts</span><code>brainkb_search</code> resolves TREM2, disease-associated microglia and Alzheimer&apos;s disease to graph entities.</li>
              <li><span className="ex-k">Retrieve assertions</span><code>brainkb_qa_run</code> asks the vetted questions about those entities and the claims that connect them.</li>
              <li><span className="ex-k">Show provenance</span><code>brainkb_provenance_graph</code> returns who added each assertion, when, and from which source.</li>
            </ol>
            <div className="ex-result">
              <div><span className="ex-k">Concepts</span><p>TREM2 (gene) · disease-associated microglia (cell state) · Alzheimer&apos;s disease (disease)</p></div>
              <div><span className="ex-k">Relationships</span><p>The assertions linking them, for example that the disease-associated microglia response depends on TREM2</p></div>
              <div><span className="ex-k">Evidence</span><p>The paper and sentence behind each assertion, with its extraction run and PROV-O record</p></div>
            </div>
            <p className="ex-note">
              This shows the workflow. What comes back depends on what has been ingested into the spaces you can read.
            </p>
            <div className="connect-links">
              <Link className="btn primary" href="/explore">Explore knowledge</Link>
              <a className="btn" href="#setup">Try it in your agent ↓</a>
            </div>
          </div>
        </section>

        <section className="section" id="setup">
          <div className="section-title center">
            <div>
              <span className="eyebrow">Set up</span>
              <h2>Connect, sign in, check.</h2>
              <p>Pick the BrainKB skill (recommended) or connect the MCP server alone.</p>
            </div>
          </div>
          <SkillSetup />
        </section>

        <section className="help">
          <div>
            <h3>Need help connecting your client?</h3>
            <p>Configuration examples, authentication and troubleshooting for Claude Code, Codex, VS Code, Cursor, Copilot and other clients.</p>
          </div>
          <a className="btn" href={MCP_SITE} target="_blank" rel="noopener noreferrer">Full setup guide ↗</a>
        </section>
      </div>

      <MarketingFooter />
    </div>
  );
}
