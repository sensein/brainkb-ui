/**
 * Home — public marketing entry page.
 *
 * Ported from the landing redesign handoff (index.html): hero search + animated
 * connect demo, five pillars (connected, open, decentralized, agent-ready,
 * provenance), then one section per pillar. Styles live in
 * components/marketing/landing/landing.css, scoped under `.lp`. Renders
 * standalone, outside the app's Navbar/Footer/Theme chrome — see SiteChrome.
 */

import Link from "next/link";
import MarketingHeader from "./components/marketing/MarketingHeader";
import MarketingFooter from "./components/marketing/MarketingFooter";
import { dmSans, plexMono } from "./components/marketing/fonts";
import HeroSearch, { FocusSearchLink } from "./components/marketing/landing/HeroSearch";
import HeroDemo from "./components/marketing/landing/HeroDemo";
import CompareSources from "./components/marketing/landing/CompareSources";
import WhereResultsGo from "./components/marketing/landing/WhereResultsGo";
import ProvenanceTrace from "./components/marketing/landing/ProvenanceTrace";
import "./components/marketing/landing/landing.css";

const PILLARS = [
  { href: "#connected", k: "c", name: "Connected", title: "Knowledge, not silos.", desc: "Facts are extracted from papers, datasets and reviews, then linked in one knowledge graph so you can discover connections across studies.", go: "See the graph →" },
  { href: "#open", k: "g", name: "Open", title: "No login to read.", desc: "Public spaces are open to everyone: search, browse and download.", go: "What's open →" },
  { href: "#decentralized", k: "v", name: "Decentralized", title: "Run it. Share if you want.", desc: "Run BrainKB and its extraction tools yourself. Contribute to the community only when you choose.", go: "Run & share →" },
  { href: "#agents", k: "b", name: "Agent-ready", title: "Bring your own client.", desc: "Ask Claude, ChatGPT, Perplexity, Cursor or VS Code to search and discover across the graph, over MCP and skills.", go: "Connect an agent →" },
  { href: "#provenance", k: "a", name: "Provenance", title: "Every fact has a source.", desc: "Who added it, when, how, and from which sentence of which paper it was extracted.", go: "Trace a fact →" },
];

const AUDIENCES = [
  { ico: "⌕", title: "Researchers", desc: "Answer questions across the literature in minutes, not weeks. Ask your agent in plain language and get linked answers with their sources.", more: "\"Which papers report PV cells in layer 4?\"" },
  { ico: "▣", title: "Labs & consortia", desc: "Run your own BrainKB or use the shared one. Keep work private until it's ready, then publish it with full attribution.", more: "Private → team → public" },
  { ico: "⌘", title: "Tool & AI builders", desc: "Build on a knowledge graph instead of scraping PDFs: open standards (RDF, PROV-O), an open API, and MCP for agents.", more: "RDF · PROV-O · MCP · HTTP" },
];

const NO_LOGIN = [
  { ok: true, t: "Search across all public spaces" },
  { ok: true, t: "Browse and read public knowledge graphs" },
  { ok: true, t: "Download public data as RDF" },
  { ok: false, t: "Private spaces stay hidden" },
  { ok: false, t: "No ingest, editing or sharing" },
];

const LOGGED_IN = [
  "Your own and shared private spaces",
  "Ingest RDF, extract entities, run reviews",
  "Share spaces and publish them openly",
  "Provenance and change history",
  "Log in with Globus, ORCID or GitHub",
];

const DECENTRALIZED = [
  { di: "⌂", title: "Run tools locally", desc: "Entity extraction (StructSense) and systematic reviews (SynthScholar) run on your own machine, as agent skills or from the command line." },
  { di: "⚿", title: "Your models, your keys", desc: "Use the model provider you choose, or a local model. Papers and drafts don't have to leave your machine." },
  { di: "▣", title: "Host your own BrainKB", desc: "The full stack (graph store, search, API, MCP) runs from one Docker Compose file, for a lab, a consortium or offline work." },
  { di: "⇪", title: "Share with the community, your call", desc: "Keep it local, share with your team, or contribute to the community graph. Sharing is opt-in, and your name stays on what you add." },
];

const CLIENTS = [
  ["✳", "Claude Code"], ["✳", "claude.ai"], ["◎", "ChatGPT"], ["⌕", "Perplexity"],
  ["▸", "Cursor"], ["◇", "VS Code & Copilot"], ["›_", "Codex"],
];

const PROV_POINTS = [
  { di: "◉", title: "Attributed", desc: "Every ingest is tied to the account that made it. Nothing is anonymous once it's written." },
  { di: "❝", title: "Evidence-backed", desc: "Extracted facts keep the sentence, section and paper they came from, so you can check the claim." },
  { di: "↻", title: "Change history", desc: "See exactly which triples each job added, and compare versions over time." },
  { di: "⌘", title: "Open standard", desc: "Provenance is W3C PROV-O, queryable like the rest of the graph, and exportable." },
];

const STEPS = [
  { lbl: "INGEST", title: "Bring data in", desc: "Upload RDF, or send papers and text through the extraction tools." },
  { lbl: "EXTRACT", title: "Find entities", desc: "Cell types, regions, genes and claims are extracted with their evidence." },
  { lbl: "LINK", title: "Map to ontologies", desc: "Entities are aligned to ontology terms and reference taxonomies." },
  { lbl: "QUERY", title: "Search & trace", desc: "Search, query the graph, and trace any fact back to its source." },
];

function SectionTitle({ eyebrow, color, title, children }: { eyebrow: string; color?: string; title: [string, string]; children: React.ReactNode }) {
  return (
    <div className="section-title">
      <div>
        <span className="eyebrow" style={color ? { color } : undefined}>{eyebrow}</span>
        <h2>
          {title[0]}
          <br />
          {title[1]}
        </h2>
      </div>
      <p>{children}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />

      <main id="top" className="wrap">
        <section className="hero">
          <div className="hero-copy">
            <span className="badge"><i />OPEN · DECENTRALIZED · AGENT-READY</span>
            <h1>
              Neuroscience knowledge, <span>connected.</span>
            </h1>
            <p className="lead">
              Findings are scattered across papers, datasets and atlases, each naming things its own way. BrainKB
              extracts what they say, links it into one open knowledge graph, and lets you search it, ask your AI
              agent about it, and trace every fact back to the source.
            </p>
            <HeroSearch />
          </div>
          <HeroDemo />
        </section>

        <p className="pitch-k">WHY BRAINKB, IN FIVE WORDS</p>
        <section className="pillars five" aria-label="What BrainKB stands for">
          {PILLARS.map((p) => (
            <a key={p.href} className="pillar" href={p.href}>
              <span className={`k ${p.k}`}><i />{p.name}</span>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
              <span className="go">{p.go}</span>
            </a>
          ))}
        </section>

        <section className="section" id="connected">
          <SectionTitle eyebrow="The problem → the fix" color="#0e7490" title={["Knowledge is stuck", "in silos."]}>
            The same cell type appears under a dozen names, findings sit in PDFs, and nothing links one result to the
            next. Researchers spend weeks re-reading what&apos;s already known. BrainKB connects it into one graph, so
            related facts are one query apart.
          </SectionTitle>
          <CompareSources />
        </section>

        <section className="section flush" id="who">
          <SectionTitle eyebrow="Who it's for" title={["Less searching.", "More science."]}>
            One knowledge base, three ways it pays off.
          </SectionTitle>
          <div className="grid3">
            {AUDIENCES.map((a) => (
              <article key={a.title} className="card">
                <div className="ico">{a.ico}</div>
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
                <span className="more">{a.more}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="section open" id="open">
          <SectionTitle eyebrow="Open knowledge · no login" title={["Access open knowledge.", "No need to log in."]}>
            Public spaces in BrainKB are open to everyone. Search, browse and read them without an account. It is
            read-only: nothing can be added or changed without logging in.
          </SectionTitle>
          <div className="access">
            <div className="access-card free">
              <h3>No login <span className="tag green">READ-ONLY</span></h3>
              <p className="sub">Anyone, from the web, an AI agent or the API.</p>
              <ul>
                {NO_LOGIN.map((l) => (
                  <li key={l.t} className={l.ok ? undefined : "off"}>
                    <i>{l.ok ? "✓" : "✕"}</i>
                    <span>{l.t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="access-card">
              <h3>Logged in <span className="tag blue">YOUR ACCOUNT</span></h3>
              <p className="sub">Everything on the left, plus what your role allows.</p>
              <ul>
                {LOGGED_IN.map((t) => (
                  <li key={t}>
                    <i>✓</i>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section" id="decentralized">
          <SectionTitle eyebrow="Decentralized" title={["Run your own.", "Share if you want."]}>
            BrainKB isn&apos;t one central server you have to hand your data to. Run the tools and your own BrainKB,
            keep it private as long as you like, and contribute to the community knowledge graph when you&apos;re
            ready, with credit on every triple.
          </SectionTitle>
          <div className="dec">
            <div className="dec-list">
              {DECENTRALIZED.map((d) => (
                <div key={d.title} className="dec-item">
                  <i className="di" aria-hidden="true">{d.di}</i>
                  <h4>{d.title}</h4>
                  <p>{d.desc}</p>
                </div>
              ))}
            </div>
            <WhereResultsGo />
          </div>
        </section>

        <section className="section flush" id="agents">
          <SectionTitle eyebrow="Agent-ready" title={["Use BrainKB from", "your favorite client."]}>
            BrainKB is built to be driven by AI agents. Any MCP client can search, read, ingest and trace provenance in
            plain language, and public data needs no login.
          </SectionTitle>
          <div className="clients" aria-label="Supported clients">
            {CLIENTS.map(([i, name]) => (
              <span key={name} className="client"><i>{i}</i>{name}</span>
            ))}
            <span className="client any">+ any MCP client</span>
          </div>
          <div className="ways4">
            <Link className="way" href="/mcp">
              <span className="lbl">Hosted MCP</span>
              <h3>Connect by URL</h3>
              <p>Add one URL to your client. Log in only when you need private data.</p>
              <div className="code"><b>https://</b>mcp.brainkb.org/mcp</div>
            </Link>
            <div className="way">
              <span className="lbl">Local MCP</span>
              <h3>Run it yourself</h3>
              <p>Run the MCP server locally and point it at your own BrainKB.</p>
              <div className="code">MCP_TRANSPORT=<b>stdio</b></div>
            </div>
            <Link className="way" href="/skills">
              <span className="lbl">Agent skills</span>
              <h3>Teach your agent</h3>
              <p>Skills for BrainKB, StructSense and SynthScholar, installed in one step.</p>
              <div className="code"><b>npx</b> brainkb install</div>
            </Link>
            <div className="way">
              <span className="lbl">API</span>
              <h3>Plain HTTP</h3>
              <p>Search and read public spaces with no token; open standards (RDF, PROV-O).</p>
              <div className="code">GET <b>/api/search</b>?q=purkinje</div>
            </div>
          </div>
        </section>

        <section className="section" id="provenance">
          <SectionTitle eyebrow="Provenance" title={["Every fact", "has a history."]}>
            Trust comes from being able to check. Every triple in BrainKB records who added it, when, by which
            process, and the evidence behind it, as W3C PROV-O you can query.
          </SectionTitle>
          <div className="prov">
            <ProvenanceTrace />
            <div className="prov-points">
              {PROV_POINTS.map((p) => (
                <div key={p.title} className="dec-item">
                  <i className="di" aria-hidden="true">{p.di}</i>
                  <h4>{p.title}</h4>
                  <p>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="pipe-h">
            <h3>How a fact gets here</h3>
            <span>Provenance recorded at every step</span>
          </div>
          <div className="flow">
            {STEPS.map((s, n) => (
              <div key={s.lbl} className="step">
                <span className="n">{String(n + 1).padStart(2, "0")}</span>
                <span className="lbl">{s.lbl}</span>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta">
          <div>
            <h2>
              Stop digging through PDFs.
              <br />
              Ask the graph.
            </h2>
            <p>Open to read, yours to run, shared with the community when you choose.</p>
          </div>
          <div className="actions">
            <FocusSearchLink className="btn primary">Search BrainKB</FocusSearchLink>
            <a className="btn" href="#agents">Connect your agent</a>
            <a className="btn" href="#decentralized">Run it locally</a>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
