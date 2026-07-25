"use client";

/**
 * Footer — dark editorial treatment that flows out of the landing page's
 * "Powered by AI agents" section. Wraps itself in <Theme> so it renders
 * consistently after every route; colours are hard-set for the dark surface
 * rather than relying on the light --bkb-* tokens.
 */

import React from "react";
import Link from "next/link";
import { FONTS, Theme } from "@/src/app/components/design-system";

const INK = "#f0eee9";
const MUTED = "rgba(240,238,233,0.62)";
const SUBTLE = "rgba(240,238,233,0.42)";
const ACCENT = "#3ecf8e";
const HAIRLINE = "rgba(255,255,255,0.1)";

const COLUMNS: { h: string; items: { label: string; href?: string }[] }[] = [
  {
    h: "Resources",
    items: [
      { label: "Documentation", href: "http://docs.brainkb.org" },
      { label: "Ontologies", href: "https://brain-bican.github.io/models/" },
      { label: "Data sources", href: "/data-release" },
    ],
  },
  {
    h: "About",
    items: [
      { label: "Privacy", href: "/privacy-policy" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <Theme theme="dark" style={{ background: "#0b1410" }}>
      <footer
        style={{
          background: "#0b1410",
          borderTop: `1px solid ${HAIRLINE}`,
          padding: "64px 64px 36px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr 1fr",
            gap: 48,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "#1db981",
                  color: "#0b1410",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONTS.display,
                  fontSize: 20,
                  lineHeight: 1,
                }}
              >
                B
              </div>
              <div style={{ fontFamily: FONTS.display, fontSize: 24, letterSpacing: "-0.02em", color: INK }}>BrainKB</div>
            </div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, maxWidth: 380 }}>
              An open neuroscience knowledge graph supported by U24MH130918 (BICAN Knowledgebase), P41EB019936 (ReproNim), U24MH136628 (BBQS), UM1NS132358 (Brain Connects), and the MIT MGAIC consortium.
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.h}>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 11.5,
                  color: ACCENT,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {col.h}
              </div>
              {col.items.map((it) => (
                <div key={it.label} style={{ padding: "5px 0" }}>
                  {it.href ? (
                    <Link href={it.href} style={{ fontSize: 14, color: MUTED, textDecoration: "none" }}>
                      {it.label}
                    </Link>
                  ) : (
                    <span style={{ fontSize: 14, color: MUTED }}>{it.label}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            maxWidth: 1200,
            margin: "48px auto 0",
            paddingTop: 22,
            borderTop: `1px solid ${HAIRLINE}`,
            fontSize: 12,
            color: SUBTLE,
          }}
        >
          © {year} BrainKB ·{" "}
          <Link
            href="https://sensein.group"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: MUTED, textDecoration: "none" }}
          >
            Senseable Intelligence Group
          </Link>
        </div>
      </footer>
    </Theme>
  );
};

export default Footer;
