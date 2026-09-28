/**
 * Skills — public marketing page for the agent skills that feed BrainKB.
 *
 * Content is taken from sensein/agent_skills (each skill's SKILL.md / README),
 * not invented here: keep it in sync when those skills change.
 */

import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { instrumentSerif, plexSans, plexMono } from "../components/marketing/fonts";
import { COLORS, CARD_SURFACE, CARD_TITLE_FONT } from "../components/marketing/tokens";

const SKILLS_REPO = "https://github.com/sensein/agent_skills";

const SKILLS = [
  {
    name: "StructSense",
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
    <div
      className={`${instrumentSerif.variable} ${plexSans.variable} ${plexMono.variable}`}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: COLORS.pageBg,
        color: COLORS.ink,
        fontFamily: "var(--font-plex-sans), system-ui, sans-serif",
      }}
    >
      <MarketingHeader />

      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "80px 28px 104px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <h1 style={{ margin: 0, font: "400 clamp(34px,4.2vw,52px)/1.05 var(--font-instrument-serif), serif", letterSpacing: "-.02em", color: COLORS.accent }}>
            Turn papers into structured data.
          </h1>
          <p style={{ margin: 0, maxWidth: 900, color: COLORS.body, fontSize: 17, lineHeight: 1.6 }}>
            These are ready-made instruction sets you install into your AI assistant, so it can read
            papers for you, pull out what matters, and record where each piece came from. The output is
            structured and traceable — ready to ingest into BrainKB — and runs with Claude, GPT, Gemini,
            or a model on your own machine.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 20 }}>
          {SKILLS.map((skill) => (
            <div
              key={skill.name}
              style={{ ...CARD_SURFACE, display: "flex", flexDirection: "column", gap: 14 }}
            >
              <h2 style={{ margin: 0, font: CARD_TITLE_FONT, color: COLORS.accentPurple }}>
                {skill.name}
              </h2>
              <p style={{ margin: 0, color: COLORS.ink, fontSize: 15.5, fontWeight: 600, lineHeight: 1.5 }}>
                {skill.summary}
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, color: COLORS.body, fontSize: 15, lineHeight: 1.6 }}>
                {skill.points.map((point) => (
                  <li key={point} style={{ marginBottom: 4 }}>
                    {point}
                  </li>
                ))}
              </ul>
              <a
                href={skill.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: "auto", color: COLORS.accentPurple, fontWeight: 600, fontSize: 15 }}
              >
                View the skill ↗
              </a>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720 }}>
          <h2 style={{ margin: 0, font: "400 26px/1.1 var(--font-instrument-serif), serif", color: COLORS.accent }}>
            Installing them.
          </h2>
          <p style={{ margin: 0, color: COLORS.body, fontSize: 15.5, lineHeight: 1.6 }}>
            Each skill is a flat directory with a <code>SKILL.md</code>, following the cross-agent Agent
            Skills format. Clone the repository and install the ones you want:
          </p>
          <code
            style={{
              display: "block",
              font: "400 13.5px/1.7 var(--font-plex-mono, monospace)",
              background: COLORS.cardBg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: "14px 16px",
              overflowX: "auto",
              whiteSpace: "pre",
            }}
          >
            {`git clone ${SKILLS_REPO}
cd agent_skills
python scripts/install_skills.py --agent claude --skills structsense synthscholar`}
          </code>
          <a
            href={SKILLS_REPO}
            target="_blank"
            rel="noopener noreferrer"
            style={{ alignSelf: "flex-start", color: COLORS.accent, fontWeight: 600, fontSize: 15 }}
          >
            All skills on GitHub ↗
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
