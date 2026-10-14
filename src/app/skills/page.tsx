/**
 * Skills — public marketing page for the agent skills that feed BrainKB.
 *
 * Content is taken from sensein/agent_skills (each skill's SKILL.md / README),
 * not invented here: keep it in sync when those skills change. Uses the Home
 * page's design (the `.lp` classes in components/marketing/landing/landing.css).
 */

import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { dmSans, plexMono } from "../components/marketing/fonts";
import "../components/marketing/landing/landing.css";

const SKILLS_REPO = "https://github.com/sensein/agent_skills";

const SKILLS = [
  {
    name: "StructSense",
    icon: "◆",
    summary: "Turns unstructured text and PDFs into validated, ontology-grounded JSON.",
    points: [
      "Named-entity, research-resource, and schema-driven extraction",
      "Optional ontology mapping against BioPortal, OLS, or a local hybrid",
      "Per-item quality scoring and human-in-the-loop review",
    ],
    href: `${SKILLS_REPO}/tree/main/skills/structsense`,
  },
  {
    name: "SynthScholar",
    icon: "▤",
    summary: "Runs and queries PRISMA systematic reviews, with the audit trail kept intact.",
    points: [
      "Guided protocol intake, or a review over PDFs you supply",
      "Missing papers retrieved open-access first, then through your institutional access",
      "Exported as Markdown and SLR-ontology Turtle, ready to ingest into BrainKB",
    ],
    href: `${SKILLS_REPO}/tree/main/skills/synthscholar`,
  },
] as const;

export default function SkillsPage() {
  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />

      <main className="wrap">
        <section className="page-head">
          <span className="eyebrow">Extraction tools · agent skills</span>
          <h1>Turn papers into structured data.</h1>
          <p className="lead">
            These are ready-made instruction sets you install into your AI assistant, so it can read papers for you,
            pull out what matters, and record where each piece came from. The output is structured and traceable,
            ready to ingest into BrainKB, and runs with Claude, GPT, Gemini, or a model on your own machine.
          </p>
        </section>

        <section className="page-body">
          <div className="grid2">
            {SKILLS.map((skill) => (
              <a key={skill.name} className="card" href={skill.href} target="_blank" rel="noopener noreferrer">
                <div className="ico" aria-hidden="true">{skill.icon}</div>
                <h3>{skill.name}</h3>
                <p className="sum">{skill.summary}</p>
                <ul className="checks">
                  {skill.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <span className="go">View the skill ↗</span>
              </a>
            ))}
          </div>

          <div className="install">
            <div>
              <span className="eyebrow">Install</span>
              <h3 style={{ marginTop: 10 }}>Installing them.</h3>
              <p>
                Each skill is a flat directory with a <code>SKILL.md</code>, following the cross-agent Agent Skills
                format. Clone the repository and install the ones you want.
              </p>
              <a className="go" href={SKILLS_REPO} target="_blank" rel="noopener noreferrer">
                All skills on GitHub ↗
              </a>
            </div>
            <pre className="code block">
              {`git clone ${SKILLS_REPO}
cd agent_skills
python scripts/install_skills.py --agent claude --skills structsense synthscholar`}
            </pre>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
