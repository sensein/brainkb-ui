/**
 * Tutorial — how to use each BrainKB tool: what it does, what you need
 * (required vs optional), install, run, examples, outputs and tips. Chapters
 * are YAML files in ./content (see content/README.md), rendered by TutorialHub. Uses the Home page's design (the `.lp`
 * classes in components/marketing/landing/landing.css).
 */

import Link from "next/link";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { dmSans, plexMono } from "../components/marketing/fonts";
import TutorialHub from "./TutorialHub";
import { loadTutorial } from "./content";
import "../components/marketing/landing/landing.css";
import "./tutorial.css";

export default function TutorialPage() {
  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />

      <main className="wrap">
        <TutorialHub topics={loadTutorial()} />

        <section className="cta" style={{ marginTop: 48 }}>
          <div>
            <h2>Want to drive it all<br />from your assistant?</h2>
            <p>Connect Claude, ChatGPT, Cursor or VS Code to BrainKB over MCP.</p>
          </div>
          <div className="actions">
            <Link className="btn primary" href="/mcp">Use with AI</Link>
            <a className="btn" href="https://docs.brainkb.org" target="_blank" rel="noopener noreferrer">Docs ↗</a>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
