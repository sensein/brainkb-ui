/**
 * Skills — public marketing page for the agent skills that feed BrainKB.
 *
 * Content is taken from sensein/agent_skills (each skill's SKILL.md / README),
 * not invented here: keep it in sync when those skills change. Uses the Home
 * page's design (the `.lp` classes in components/marketing/landing/landing.css).
 */

import Link from "next/link";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { dmSans, plexMono } from "../components/marketing/fonts";
import SkillsDemo from "./SkillsDemo";
import SkillInstall from "./SkillInstall";
import "../components/marketing/landing/landing.css";

const SKILLS_REPO = "https://github.com/sensein/agent_skills";

const SKILLS = [
  {
    name: "StructSense",
    icon: "◆",
    role: "EXTRACT",
    summary: "Turns unstructured text and PDFs into validated, ontology-grounded records.",
    points: [
      "Named entities and source-stated relations, with aliases resolved to stable entities",
      "Research resources, your own JSON schema, or ABCD/HBCD study results",
      "Cell types mapped to Allen Institute (AIT) taxonomies",
      "Ontology mapping and a judge review loop before output",
    ],
    out: "Entity JSON · validated Turtle",
    href: `${SKILLS_REPO}/tree/main/skills/structsense`,
  },
  {
    name: "SynthScholar",
    icon: "▤",
    role: "REVIEW",
    summary: "Runs and queries PRISMA systematic reviews, with the audit trail kept intact.",
    points: [
      "Guided protocol intake (PICO, eligibility, databases, risk of bias), validated before a run",
      "Bring your own PDFs, or DOIs fetched open access first, then through your institutional access",
      "Screening, charting, appraisal and synthesis",
      "Query what was read in full text and why papers were excluded",
    ],
    out: "Markdown · SLR-ontology Turtle",
    href: `${SKILLS_REPO}/tree/main/skills/synthscholar`,
  },
] as const;

const STEPS = [
  { lbl: "INSTALL", title: "Add the skills", desc: "npx for SynthScholar, one script for StructSense, into your agent's skills folder." },
  { lbl: "ASK", title: "Ask in plain language", desc: "Point your agent at a paper, a folder of PDFs or a review question." },
  { lbl: "EXTRACT", title: "Get evidence-backed records", desc: "Every entity and claim keeps the sentence and source it came from." },
  { lbl: "INGEST", title: "Send them to BrainKB", desc: "Validated Turtle goes into your space over MCP, with provenance recorded." },
];

const WHY = [
  { di: "⌂", title: "Runs where you work", desc: "Skills run inside your own agent, on your machine. Papers and drafts don't have to leave it." },
  { di: "⚿", title: "Your model, your keys", desc: "The pipeline is model-agnostic: Claude, GPT, Gemini, or a local model." },
  { di: "❝", title: "Source on every record", desc: "Extracted facts keep their evidence, so you and reviewers can check each claim." },
  { di: "✓", title: "Validated before hand-off", desc: "Turtle output is validated first, so what you ingest into BrainKB is well-formed." },
];

const AGENTS = [["✳", "Claude Code"], ["›_", "Codex"], ["◇", "Any SKILL.md agent"]];

export default function SkillsPage() {
  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />

      <main className="wrap">
        <section className="hero page">
          <div className="hero-copy">
            <span className="eyebrow">Extraction tools · agent skills</span>
            <h1>Turn papers into structured data.</h1>
            <p className="lead">
              Ready-made skills you install into your AI assistant, so it can read papers for you, pull out what
              matters, and record where each piece came from. The output is structured and traceable, ready to
              ingest into BrainKB.
            </p>
            <div className="hero-actions">
              <a className="btn primary" href="#install">Install the skills</a>
              <a className="btn" href={SKILLS_REPO} target="_blank" rel="noopener noreferrer">View on GitHub ↗</a>
            </div>
            <div className="clients" aria-label="Works with" style={{ margin: "26px 0 0" }}>
              {AGENTS.map(([i, name]) => (
                <span key={name} className="client"><i>{i}</i>{name}</span>
              ))}
            </div>
          </div>
          <SkillsDemo />
        </section>

        <section className="section flush" id="skills">
          <div className="section-title">
            <div>
              <span className="eyebrow">The skills</span>
              <h2>Extract, then<br />review.</h2>
            </div>
            <p>Two skills that work on their own or together, turning papers into sourced records ready for BrainKB.</p>
          </div>
          <div className="grid2">
            {SKILLS.map((s) => (
              <a key={s.name} className="card" href={s.href} target="_blank" rel="noopener noreferrer">
                <div className="top">
                  <div className="ico" aria-hidden="true">{s.icon}</div>
                  <span className="tag blue">{s.role}</span>
                </div>
                <h3>{s.name}</h3>
                <p className="sum">{s.summary}</p>
                <ul className="checks">
                  {s.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <span className="src-line">Output: {s.out}</span>
                <span className="go">View the skill ↗</span>
              </a>
            ))}
          </div>

          <div className="pipe-h">
            <h3>How it fits together</h3>
            <span>From a PDF to a fact in the graph</span>
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
      </main>

      <section className="band-section" id="install">
        <div className="wrap">
          <div className="install" style={{ marginTop: 0 }}>
            <div>
              <span className="eyebrow">Install</span>
              <h2>One command,<br />any agent.</h2>
              <p style={{ marginTop: 16 }}>
                Each skill is a flat directory with a <code>SKILL.md</code>, following the cross-agent Agent Skills
                format. SynthScholar installs with <code>npx synthscholar install</code> or from the repository; StructSense
                installs from the repository with its install script. Add <code>--scope project</code> to either to install into
                the current project instead of your user folder.
              </p>
              <a className="go" href={SKILLS_REPO} target="_blank" rel="noopener noreferrer">
                All skills on GitHub ↗
              </a>
            </div>
            <SkillInstall repo={SKILLS_REPO} />
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="section">
          <div className="section-title">
            <div>
              <span className="eyebrow">Why skills</span>
              <h2>Traceable by<br />design.</h2>
            </div>
            <p>The same principles as the rest of BrainKB: open, local when you want it, and sourced.</p>
          </div>
          <div className="grid3 tight blue-items four">
            {WHY.map((w) => (
              <div key={w.title} className="dec-item">
                <i className="di" aria-hidden="true">{w.di}</i>
                <h4>{w.title}</h4>
                <p>{w.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta">
          <div>
            <h2>Extracted it?<br />Put it in the graph.</h2>
            <p>Connect your agent to BrainKB over MCP, or explore what's already there.</p>
          </div>
          <div className="actions">
            <Link className="btn primary" href="/mcp">Connect over MCP</Link>
            <Link className="btn" href="/explore">Explore the graph</Link>
          </div>
        </section>
      </div>

      <MarketingFooter />
    </div>
  );
}
