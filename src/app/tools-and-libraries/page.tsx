"use client";

/**
 * Tools & Libraries — editorial direction, consistent with the landing page.
 * Header + capabilities, then a single unified grid of flagship apps (with
 * logos) and open-source Python libraries.
 */

import { ExternalLink, Wrench, CheckCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FONTS } from "@/src/app/components/design-system";
import yaml from "@/src/config/yaml/tools-libraries.yaml";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: FONTS.mono, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--bkb-accent)", fontWeight: 600, marginBottom: 18 }}>
      {children}
    </div>
  );
}

const CAPABILITIES = [
  { h: "Knowledge Extraction", d: "Extract structured data from text, PDFs, and other unstructured sources." },
  { h: "Provenance Tracking", d: "Track data lineage and changes across the knowledge graph over time." },
  { h: "Advanced Analytics", d: "Compare, analyze, and reason over structured neuroscience knowledge." },
];

export default function ToolsLibraries() {
  const libraries = yaml.libraries;
  const tools = (yaml as any).tools as any[] | undefined;

  // One unified list: flagship apps (with logos) first, then libraries.
  const items = [
    ...(Array.isArray(tools) ? tools.map((t: any) => ({ ...t, _kind: "tool" })) : []),
    ...(Array.isArray(libraries) ? libraries.map((l: any) => ({ ...l, _kind: "lib" })) : []),
  ];

  return (
    <div style={{ background: "#f0eee9" }}>
      {/* ── Header + capabilities ─────────────────────────────────── */}
      <section className="home-pad home-pad-y" style={{ padding: "96px 64px 64px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ maxWidth: 760 }}>
          <Eyebrow>Open Source</Eyebrow>
          <h1 style={{ fontFamily: FONTS.display, fontSize: "clamp(34px, 7vw, 52px)", lineHeight: 1.05, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
            Tools &amp; libraries for neuroscience research.
          </h1>
          <p style={{ fontSize: 17, color: "var(--bkb-textMuted)", lineHeight: 1.7, margin: "20px 0 0" }}>
            BrainKB provides a set of tools and libraries that facilitate knowledge extraction, structured
            representation, provenance tracking, and advanced analytics. While integrated into the BrainKB
            platform, each is also designed for <strong style={{ color: "var(--bkb-text)" }}>independent use</strong> in
            your own research.
          </p>
        </div>

        <div className="home-3col" style={{ marginTop: 56, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid var(--bkb-border)" }}>
          {CAPABILITIES.map((c, i) => (
            <div key={i} style={{ padding: "30px 30px 0", borderLeft: i ? "1px solid var(--bkb-border)" : "none" }}>
              <CheckCircle style={{ width: 20, height: 20, color: "var(--bkb-accent)", marginBottom: 16 }} />
              <h3 style={{ fontFamily: FONTS.display, fontSize: 21, fontWeight: 400, letterSpacing: "-0.01em", margin: "0 0 10px" }}>{c.h}</h3>
              <p style={{ fontSize: 13.5, color: "var(--bkb-textMuted)", lineHeight: 1.6, margin: 0 }}>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tools & Libraries grid (white) ────────────────────────── */}
      <section style={{ background: "var(--bkb-surface)", borderTop: "1px solid var(--bkb-border)", borderBottom: "1px solid var(--bkb-border)" }}>
        <div className="home-pad home-pad-y" style={{ padding: "96px 64px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ maxWidth: 720, marginBottom: 48 }}>
            <Eyebrow>The Toolkit</Eyebrow>
            <h2 style={{ fontFamily: FONTS.display, fontSize: "clamp(30px, 6vw, 46px)", lineHeight: 1.06, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
              Tools &amp; Libraries
            </h2>
            <p style={{ fontSize: 16, color: "var(--bkb-textMuted)", lineHeight: 1.65, margin: "16px 0 0" }}>
              End-to-end applications and open-source Python libraries built on BrainKB — usable within the platform
              and standalone in your own research.
            </p>
          </div>

          {/* home-2col collapses the 2-up card grid to 1 column on phones so cards aren't cut off */}
          <div className="home-2col" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 22 }}>
            {items.map((it, index) => {
              const isExternal = it.link?.startsWith?.("http");
              const isComingSoon = it._kind === "tool" && (!it.link || it.link === "#");
              const isSquareLogo = it.logo_orientation === "square";
              const typeLabel = it._kind === "lib" ? "Python Library" : "Application";
              const logoStyle: React.CSSProperties = isSquareLogo
                ? { height: "100%", width: "auto", maxWidth: "70%", objectFit: "contain" }
                : { height: "auto", width: "auto", maxHeight: 110, maxWidth: "92%", objectFit: "contain" };
              const linkStyle: React.CSSProperties = {
                fontSize: 13,
                fontWeight: 600,
                color: "var(--bkb-accent)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              };
              return (
                <div
                  key={index}
                  className="bkb-card"
                  style={{ padding: 30, borderRadius: 16, background: "var(--bkb-surfaceAlt)", display: "flex", flexDirection: "column" }}
                >
                  <div style={{ fontFamily: FONTS.mono, fontSize: 11, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--bkb-textSubtle)", marginBottom: 18, textAlign: "right" }}>
                    {typeLabel}
                  </div>

                  {/* media: big logo, or icon + name for libraries */}
                  {it.logo ? (
                    <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "flex-start", marginBottom: 20 }}>
                      <Image src={it.logo} alt={it.name} width={340} height={130} style={logoStyle} />
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, minHeight: 56 }}>
                      <span style={{ width: 48, height: 48, borderRadius: 12, background: "var(--bkb-accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Wrench style={{ width: 22, height: 22 }} />
                      </span>
                      <h3 style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 400, letterSpacing: "-0.01em", margin: 0 }}>{it.name}</h3>
                    </div>
                  )}

                  <p style={{ fontSize: 14, color: "var(--bkb-textMuted)", lineHeight: 1.65, margin: "0 0 20px", flex: 1 }}>{it.description}</p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 22 }}>
                    {it._kind === "tool" &&
                      (isComingSoon ? (
                        <span style={{ ...linkStyle, color: "var(--bkb-textSubtle)" }}>{it.link_text || "Coming soon"}</span>
                      ) : isExternal ? (
                        <a href={it.link} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                          {it.link_text || "Learn more"} <ExternalLink style={{ width: 14, height: 14 }} />
                        </a>
                      ) : (
                        <Link href={it.link} style={linkStyle}>
                          {it.link_text || "Open"} <span>→</span>
                        </Link>
                      ))}
                    {it.link_library && (
                      <a href={it.link_library} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                        Visit library <ExternalLink style={{ width: 14, height: 14 }} />
                      </a>
                    )}
                    {it.link_example && (
                      <a href={it.link_example} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, color: "var(--bkb-textMuted)" }}>
                        View example <ExternalLink style={{ width: 14, height: 14 }} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
