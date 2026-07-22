"use client";

/**
 * About — editorial direction, consistent with the landing and tools pages.
 * What is BrainKB (numbered columns) → Objectives → Expected Outcomes.
 */

import { Target, Zap } from "lucide-react";
import { FONTS } from "@/src/app/components/design-system";
import yaml from "@/src/config/yaml/about.yaml";

function Eyebrow({ children, color = "var(--bkb-accent)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: FONTS.mono, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color, fontWeight: 600, marginBottom: 18 }}>
      {children}
    </div>
  );
}

function CardGrid({ points, Icon, accent }: { points: any[]; Icon: any; accent: string }) {
  return (
    // `home-3col`: 3-up on desktop → 2-up on tablet → 1-up on phone (globals.css).
    <div className="home-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22 }}>
      {points?.map((p: any, i: number) => (
        <div
          key={i}
          className="bkb-card"
          style={{ padding: 28, borderRadius: 16, background: "var(--bkb-surfaceAlt)", height: "100%", display: "flex", flexDirection: "column" }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: accent,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <Icon style={{ width: 20, height: 20 }} />
          </span>
          <h3 style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: 400, letterSpacing: "-0.01em", margin: "0 0 10px", lineHeight: 1.25 }}>
            {p.title}
          </h3>
          {p.description && (
            <p style={{ fontSize: 13.5, color: "var(--bkb-textMuted)", lineHeight: 1.6, margin: 0 }}>{p.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function About() {
  const sections = yaml.sections;
  const whatIs = sections.find((s) => s.section === "whatisbrainkb");
  const objectives = sections.find((s) => s.section === "objectives");
  const outcomes = sections.find((s) => s.section === "expectedoutcome");

  return (
    <div style={{ background: "#f0eee9" }}>
      {/* ── About / What is BrainKB ───────────────────────────────── */}
      {whatIs && (
        <section className="home-pad home-pad-y" style={{ padding: "96px 64px 72px", maxWidth: 1200, margin: "0 auto" }}>
          <div className="home-2col" style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 72, alignItems: "start", marginBottom: 56 }}>
            <div>
              <Eyebrow>About</Eyebrow>
              <h1 style={{ fontFamily: FONTS.display, fontSize: "clamp(34px, 7vw, 52px)", lineHeight: 1.05, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
                {whatIs.title}
              </h1>
            </div>
            {whatIs.subtitle && (
              <p style={{ fontSize: 17, color: "var(--bkb-textMuted)", lineHeight: 1.7, margin: 0, paddingTop: 6 }}>{whatIs.subtitle}</p>
            )}
          </div>

          {Array.isArray(whatIs.bullet_points) && (
            <div className="home-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid var(--bkb-border)" }}>
              {whatIs.bullet_points.map((p: any, i: number) => (
                <div key={i} style={{ padding: "30px 30px 0", borderLeft: i ? "1px solid var(--bkb-border)" : "none" }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: "var(--bkb-accent)", marginBottom: 22 }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <p style={{ fontSize: 14, color: "var(--bkb-textMuted)", lineHeight: 1.6, margin: 0 }}>{p.title}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Objectives (white) ────────────────────────────────────── */}
      {objectives && (
        <section style={{ background: "var(--bkb-surface)", borderTop: "1px solid var(--bkb-border)", borderBottom: "1px solid var(--bkb-border)" }}>
          <div className="home-pad home-pad-y" style={{ padding: "96px 64px", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ maxWidth: 720, marginBottom: 48 }}>
              <Eyebrow>Mission</Eyebrow>
              <h2 style={{ fontFamily: FONTS.display, fontSize: "clamp(30px, 6vw, 46px)", lineHeight: 1.06, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
                {objectives.title}
              </h2>
              {objectives.subtitle && (
                <p style={{ fontSize: 16, color: "var(--bkb-textMuted)", lineHeight: 1.65, margin: "16px 0 0" }}>{objectives.subtitle}</p>
              )}
            </div>
            <CardGrid points={objectives.bullet_points} Icon={Target} accent="var(--bkb-accent)" />
          </div>
        </section>
      )}

      {/* ── Expected Outcomes (cream) ─────────────────────────────── */}
      {outcomes && (
        <section className="home-pad home-pad-y" style={{ padding: "96px 64px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ maxWidth: 720, marginBottom: 48 }}>
            <Eyebrow color="#b4451f">Outcomes</Eyebrow>
            <h2 style={{ fontFamily: FONTS.display, fontSize: "clamp(30px, 6vw, 46px)", lineHeight: 1.06, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
              {outcomes.title}
            </h2>
            {outcomes.subtitle && (
              <p style={{ fontSize: 16, color: "var(--bkb-textMuted)", lineHeight: 1.65, margin: "16px 0 0" }}>{outcomes.subtitle}</p>
            )}
          </div>
          <CardGrid points={outcomes.bullet_points} Icon={Zap} accent="#b4451f" />
        </section>
      )}
    </div>
  );
}
