"use client";

/**
 * Footer — ported from sensein/brainkb-ui-prototype's Landing footer.
 *
 * Wraps itself in <Theme> so the --bkb-* tokens resolve regardless of where
 * the parent renders this (the root layout drops it after every route).
 */

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { FONTS, Theme } from "@/src/app/components/design-system";

const COLUMNS: { h: string; items: { label: string; href?: string }[] }[] = [
//   {
//     h: "Product",
//     items: [
//       { label: "Explorer", href: "/knowledge-base" },
//       { label: "Dashboard", href: "/user/dashboard" },
//       { label: "SPARQL API", href: "/about" },
//       { label: "Changelog", href: "/about" },
//     ],
//   },
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
//       { label: "Team", href: "/about" },
//       { label: "Governance", href: "/about" },
      { label: "Privacy", href: "/privacy-policy" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <Theme theme="light" style={{ background: "#f0eee9" }}>
      <footer
        style={{
          background: "var(--bkb-surface)",
          borderTop: "1px solid var(--bkb-border)",
          padding: "48px 64px 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: 48,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Image src="/brainkb_logo.png" alt="BrainKB" width={32} height={32} priority />
              <div style={{ fontFamily: FONTS.display, fontSize: 22, letterSpacing: "-0.02em" }}>BrainKB</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", lineHeight: 1.6, maxWidth: 320 }}>
              An open neuroscience knowledge graph funded by U24MH130918 (BICAN Knowledgebase).
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.h}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--bkb-textSubtle)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                {col.h}
              </div>
              {col.items.map((it) => (
                <div key={it.label} style={{ padding: "4px 0" }}>
                  {it.href ? (
                    <Link
                      href={it.href}
                      style={{
                        fontSize: 13,
                        color: "var(--bkb-textMuted)",
                        textDecoration: "none",
                      }}
                    >
                      {it.label}
                    </Link>
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--bkb-textMuted)" }}>{it.label}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            maxWidth: 1200,
            margin: "40px auto 0",
            paddingTop: 20,
            borderTop: "1px solid var(--bkb-border)",
            fontSize: 11,
            color: "var(--bkb-textSubtle)",
          }}
        >
          © {year} BrainKB ·{" "}
          <Link
            href="https://sensein.group"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--bkb-textMuted)", textDecoration: "none" }}
          >
            Senseable Intelligence Group
          </Link>
        </div>
      </footer>
    </Theme>
  );
};

export default Footer;
