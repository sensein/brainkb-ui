/**
 * Tutorial — how to use each BrainKB tool: what it does, what you need
 * (required vs optional), install, run, outputs and tips. Topics live in
 * TutorialHub.tsx. Uses the Home page's design (the `.lp` classes in
 * components/marketing/landing/landing.css).
 */

import Link from "next/link";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { dmSans, plexMono } from "../components/marketing/fonts";
import TutorialHub from "./TutorialHub";
import "../components/marketing/landing/landing.css";

export default function TutorialPage() {
  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />

      <main className="wrap">
        <section className="page-head">
          <span className="eyebrow">Tutorial</span>
          <h1>Learn the tools.</h1>
          <p className="lead">
            Each tool, step by step: what it does, what you need to run it, how to install and use it, and what you get.
            Pick a topic, then open the section you need.
          </p>
        </section>

        <TutorialHub />

        <section className="cta">
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
