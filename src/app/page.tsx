"use client";

/**
 * Home — landing page.
 *
 * Content (Key Features, What is BrainKB, Use Cases, Statistics, Structured
 * Models, Publications) and the YAML / /api/statistics data loading flow are
 * preserved verbatim from the original implementation; only the visual layer
 * was updated to use the bkb design tokens (FONTS.display, --bkb-* colours,
 * .bkb-card, .bkb-btn, .bkb-chip) so this page lines up with the dashboard
 * and admin treatment.
 */

import yaml from "@/src/config/yaml/config-home.yaml";
import { useEffect, useState } from "react";
import {
  Brain, Database, FileText, Users, Sparkles, ExternalLink, Network, CheckCircle,
  FileCheck, Code, Layers as LayersIcon, BookOpen, Search, UsersRound, Globe, FolderTree,
  FileSearch, FileJson, Tag, MessageSquare, Eye, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { BkbHero } from "@/src/app/components/design-system/BkbHero";
import { Theme, FONTS } from "@/src/app/components/design-system";
import "./user/dashboard/fonts.css";

// ─── Icon mapping (preserved from original) ─────────────────────────────

const ICON_MAP: Record<string, any> = {
  brain: Brain,
  database: Database,
  filetext: FileText,
  users: Users,
  code: Code,
  layers: LayersIcon,
  bookopen: BookOpen,
  filecheck: FileCheck,
  network: Network,
  search: Search,
  usersround: UsersRound,
  globe: Globe,
  foldertree: FolderTree,
  filesearch: FileSearch,
  filejson: FileJson,
  tag: Tag,
};
const iconBySlug = (s?: string) => ICON_MAP[s?.toLowerCase() ?? ""] ?? Database;

// ─── Section primitives (visual only — no introduced copy) ───────────────

function SectionTitle({ children, size = 44 }: { children: React.ReactNode; size?: number }) {
  return (
    <h2
      style={{
        fontFamily: FONTS.display,
        fontSize: size,
        lineHeight: 1.05,
        margin: 0,
        letterSpacing: "-0.02em",
        fontWeight: 400,
      }}
    >
      {children}
    </h2>
  );
}

function SectionLead({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 16, color: "var(--bkb-textMuted)", lineHeight: 1.6, margin: "12px 0 0", maxWidth: 720 }}>
      {children}
    </p>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [structuedModelHeaderTitle, setStructuedModelHeaderTitle] = useState("");
  const [structuedModelHeaderSubTitle, setStructuedModelHeaderSubTitle] = useState("");
  const [dataCount, setCountData] = useState<any[]>([]);

  useEffect(() => {
    const sm = yaml.headersboxpage.find((p: any) => p.slug === "structuredmodelsheader");
    setStructuedModelHeaderTitle(sm?.title ?? "");
    setStructuedModelHeaderSubTitle(sm?.subtitle ?? "");

    (async () => {
      try {
        const response = await fetch("/api/statistics");
        const result = await response.json();
        if (result.success && result.data) {
          setCountData(Array.isArray(result.data) ? result.data : []);
        } else {
          setCountData([]);
        }
      } catch {
        setCountData([]);
      }
    })();
  }, []);

  return (
    <div style={{ background: "#f0eee9" }}>
      <Theme theme="light" style={{ background: "transparent" }}>
        <BkbHero />

        {/* ── Key Features ─────────────────────────────────────────── */}
        <section style={{ padding: "96px 64px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ maxWidth: 720, marginBottom: 56 }}>
            <SectionTitle>{yaml.keyfeatures?.title || "Key Features"}</SectionTitle>
            <SectionLead>
              {yaml.keyfeatures?.subtitle ||
                "Powerful tools for neuroscience knowledge extraction and management"}
            </SectionLead>
            <div style={{ fontSize: 12, color: "var(--bkb-textSubtle)", marginTop: 8, fontStyle: "italic" }}>
              Login by clicking the button on the top-right navbar to use these features.
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {Array.isArray(yaml.keyfeatures?.features) &&
              yaml.keyfeatures.features.map((f: any, i: number) => {
                const Icon = iconBySlug(f.icon_slug);
                const accent =
                  f.color_theme === "green"
                    ? "var(--bkb-accent)"
                    : f.color_theme === "purple"
                      ? "var(--bkb-evidence)"
                      : f.color_theme === "publication"
                        ? "var(--bkb-publication)"
                        : "var(--bkb-primary)";
                return (
                  <Link
                    key={i}
                    href={f.link}
                    className="bkb-card"
                    style={{
                      padding: 28,
                      textDecoration: "none",
                      color: "inherit",
                      display: "block",
                      borderTop: `2px solid ${accent}`,
                      borderRadius: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        background: `color-mix(in oklch, ${accent}, transparent 90%)`,
                        color: accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3
                      style={{
                        fontFamily: FONTS.display,
                        fontSize: 22,
                        margin: "0 0 6px",
                        letterSpacing: "-0.01em",
                        fontWeight: 400,
                      }}
                    >
                      {f.title}
                    </h3>
                    <div style={{ fontSize: 12, color: "var(--bkb-textSubtle)", marginBottom: 12 }}>
                      {f.short_description}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, margin: 0 }}>
                      {f.description}
                    </p>
                  </Link>
                );
              })}
          </div>
        </section>

        {/* ── What is BrainKB ──────────────────────────────────────── */}
        <section
          style={{
            padding: "96px 64px",
            background: "var(--bkb-surfaceAlt)",
            borderTop: "1px solid var(--bkb-border)",
            borderBottom: "1px solid var(--bkb-border)",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ maxWidth: 720, marginBottom: 56 }}>
              <SectionTitle>{yaml.whatisbrainkb?.title || "What is BrainKB?"}</SectionTitle>
              <SectionLead>
                {yaml.whatisbrainkb?.subtitle ||
                  "BrainKB is a platform designed to support neuroscience research by structuring and organizing scientific knowledge using knowledge graphs (KGs) for delivering evidence-based insights."}
              </SectionLead>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {Array.isArray(yaml.whatisbrainkb?.bullet_points) &&
                yaml.whatisbrainkb.bullet_points.map((p: any, i: number) => {
                  const Icon = iconBySlug(p.icon_slug);
                  return (
                    <div key={i} className="bkb-card" style={{ padding: 24 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          background: "var(--bkb-surfaceAlt)",
                          color: "var(--bkb-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 14,
                        }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3
                        style={{
                          fontFamily: FONTS.display,
                          fontSize: 18,
                          margin: "0 0 8px",
                          letterSpacing: "-0.01em",
                          fontWeight: 400,
                        }}
                      >
                        {p.heading}
                      </h3>
                      <p style={{ fontSize: 12, color: "var(--bkb-textMuted)", lineHeight: 1.55, margin: 0 }}>
                        {p.title}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        </section>

        {/* ── Use Cases ────────────────────────────────────────────── */}
        {yaml.usecases && (
          <section style={{ padding: "96px 64px", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ maxWidth: 720, marginBottom: 56 }}>
              <SectionTitle>{yaml.usecases.title || "Use Cases"}</SectionTitle>
              <SectionLead>{yaml.usecases.subtitle}</SectionLead>
              {yaml.usecases.description && (
                <div style={{ fontSize: 12, color: "var(--bkb-textSubtle)", marginTop: 8, fontStyle: "italic" }}>
                  {yaml.usecases.description}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              {Array.isArray(yaml.usecases?.cases) &&
                yaml.usecases.cases.map((c: any, i: number) => {
                  const Icon = iconBySlug(c.icon_slug);
                  const isFuture = c.is_future || false;
                  const statusChip = c.status === "available"
                    ? { label: "Available", color: "var(--bkb-accent)" }
                    : c.status === "partially_available"
                      ? { label: "Partially available", color: "var(--bkb-primary)" }
                      : c.status === "in_development"
                        ? { label: "In development", color: "var(--bkb-publication)" }
                        : { label: "Coming soon", color: "var(--bkb-textMuted)" };
                  return (
                    <div
                      key={i}
                      className="bkb-card"
                      style={{
                        padding: 22,
                        borderStyle: isFuture ? "dashed" : "solid",
                        opacity: isFuture ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "start", gap: 14, marginBottom: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 6,
                            background: "var(--bkb-surfaceAlt)",
                            color: "var(--bkb-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3
                            style={{
                              fontFamily: FONTS.display,
                              fontSize: 19,
                              margin: "0 0 2px",
                              letterSpacing: "-0.01em",
                              fontWeight: 400,
                            }}
                          >
                            {c.title}
                          </h3>
                          <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)" }}>{c.case_number}</div>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.55, margin: "0 0 14px" }}>
                        {c.description}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--bkb-textMuted)", marginBottom: 14 }}>
                        {isFuture ? (
                          <span>
                            <CheckCircle className="inline w-3 h-3 mr-1" /> Coming soon
                          </span>
                        ) : (
                          <>
                            <span><CheckCircle className="inline w-3 h-3 mr-1" /> Ingestion process</span>
                            <span><Eye className="inline w-3 h-3 mr-1" /> Public view & interactions</span>
                            <span><MessageSquare className="inline w-3 h-3 mr-1" /> Public feedback</span>
                          </>
                        )}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <span
                          className="bkb-chip"
                          style={{ borderColor: statusChip.color, color: statusChip.color, background: "transparent" }}
                        >
                          {statusChip.label}
                        </span>
                        {c.discussion_link && (
                          <a
                            href={c.discussion_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 12, color: "var(--bkb-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            View discussion <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {(c.status === "available" || c.status === "partially_available") && c.use_link && (
                        <Link
                          href={c.use_link}
                          className="bkb-btn bkb-btn-ghost"
                          style={{ marginTop: 12, width: "100%", justifyContent: "center", textDecoration: "none" }}
                        >
                          {c.use_link_text || "Open"}
                        </Link>
                      )}
                    </div>
                  );
                })}
            </div>

            {yaml.usecases.info_box && (
              <div className="bkb-card" style={{ padding: 24, background: "var(--bkb-surfaceAlt)" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "start" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      background: "var(--bkb-surface)",
                      color: "var(--bkb-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontFamily: FONTS.display,
                        fontSize: 20,
                        margin: "0 0 8px",
                        letterSpacing: "-0.01em",
                        fontWeight: 400,
                      }}
                    >
                      {yaml.usecases.info_box.title}
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, margin: "0 0 14px" }}>
                      {yaml.usecases.info_box.description}
                    </p>
                    {Array.isArray(yaml.usecases?.info_box?.components) && (
                      <ul style={{ margin: "0 0 18px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                        {yaml.usecases.info_box.components.map((comp: any, ci: number) => (
                          <li key={ci} style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.5 }}>
                            <span style={{ color: "var(--bkb-primary)", marginRight: 6 }}>•</span>
                            <strong style={{ color: "var(--bkb-text)" }}>{comp.label}:</strong> {comp.description}
                          </li>
                        ))}
                      </ul>
                    )}
                    {yaml.usecases.info_box.footer_note && (
                      <p style={{ fontSize: 12, color: "var(--bkb-textSubtle)", fontStyle: "italic", margin: 0 }}>
                        {yaml.usecases.info_box.footer_note}
                      </p>
                    )}
                    {yaml.usecases.info_box.discussion_link && (
                      <a
                        href={yaml.usecases.info_box.discussion_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginTop: 10, fontSize: 12, color: "var(--bkb-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        {yaml.usecases.info_box.link_text || "View full planning discussion"} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Statistics ───────────────────────────────────────────── */}
        <section
          style={{
            padding: "96px 64px",
            background: "var(--bkb-surfaceAlt)",
            borderTop: "1px solid var(--bkb-border)",
            borderBottom: "1px solid var(--bkb-border)",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ maxWidth: 720, marginBottom: 56 }}>
              <SectionTitle>Knowledge Graph Metrics</SectionTitle>
              <SectionLead>Number of unique samples from different models.</SectionLead>
              <div style={{ fontSize: 12, color: "var(--bkb-textSubtle)", marginTop: 8, fontStyle: "italic" }}>
                As of November 2025
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 1,
                background: "var(--bkb-border)",
                border: "1px solid var(--bkb-border)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {Array.isArray(dataCount) &&
                dataCount.map((count, i) => {
                  const meta = yaml.boxiconsstatisticscount[i] ?? {};
                  const Icon = iconBySlug(meta.icon_slug);
                  const accent = ["var(--bkb-primary)", "var(--bkb-evidence)", "var(--bkb-publication)", "var(--bkb-agent)"][i % 4];
                  return (
                    <div key={i} style={{ background: "var(--bkb-surface)", padding: "28px 24px" }}>
                      <Icon className="w-5 h-5" style={{ color: accent, marginBottom: 14 }} />
                      <div
                        style={{
                          fontFamily: FONTS.display,
                          fontSize: 44,
                          letterSpacing: "-0.02em",
                          color: accent,
                          fontWeight: 400,
                          lineHeight: 1,
                        }}
                      >
                        {count || "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", marginTop: 8 }}>{meta.name}</div>
                      {meta.short_description && (
                        <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", marginTop: 4, lineHeight: 1.5 }}>
                          {meta.short_description}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </section>

        {/* ── Structured Models ────────────────────────────────────── */}
        <section style={{ padding: "96px 64px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ maxWidth: 720, marginBottom: 56 }}>
            <SectionTitle>{structuedModelHeaderTitle || "Structured Models"}</SectionTitle>
            <p
              style={{ fontSize: 16, color: "var(--bkb-textMuted)", lineHeight: 1.6, margin: "12px 0 0", maxWidth: 720 }}
              dangerouslySetInnerHTML={{
                __html: structuedModelHeaderSubTitle || "Structured models used in BrainKB.",
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {Array.isArray(yaml.structuredmodelsbox) &&
              yaml.structuredmodelsbox.map((m: any, i: number) => {
                const Icon = iconBySlug(m.icon_slug);
                return (
                  <Link
                    key={i}
                    href={m.links}
                    target={m.links?.startsWith?.("http") ? "_blank" : "_self"}
                    rel={m.links?.startsWith?.("http") ? "noopener noreferrer" : ""}
                    className="bkb-card"
                    style={{
                      padding: 22,
                      textDecoration: "none",
                      color: "inherit",
                      display: "block",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        background: "var(--bkb-surfaceAlt)",
                        color: "var(--bkb-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 14,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3
                      style={{
                        fontFamily: FONTS.display,
                        fontSize: 18,
                        margin: "0 0 8px",
                        letterSpacing: "-0.01em",
                        fontWeight: 400,
                      }}
                    >
                      {m.title}
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--bkb-textMuted)", lineHeight: 1.55, margin: "0 0 14px", minHeight: 48 }}>
                      {m.description}
                    </p>
                    <div style={{ fontSize: 12, color: "var(--bkb-primary)", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 500 }}>
                      {m.links === "#" ? "Coming soon" : "Read more"} →
                    </div>
                  </Link>
                );
              })}
          </div>
        </section>

        {/* ── Publications ─────────────────────────────────────────── */}
        <section
          style={{
            padding: "96px 64px",
            background: "var(--bkb-surfaceAlt)",
            borderTop: "1px solid var(--bkb-border)",
          }}
        >
          <div style={{ maxWidth: 1000, margin: "0 auto" }} className="bkb-card">
            <div style={{ padding: "40px 44px" }}>
              <SectionTitle size={32}>
                {yaml.publications?.title || "Powered by Advanced AI Agents"}
              </SectionTitle>
              <p style={{ fontSize: 15, color: "var(--bkb-textMuted)", lineHeight: 1.65, margin: "12px 0 0" }}>
                {yaml.publications?.description}
              </p>
              {yaml.publications?.citation && (
                <div
                  style={{
                    marginTop: 28,
                    padding: 22,
                    background: "var(--bkb-surfaceAlt)",
                    borderLeft: "3px solid var(--bkb-evidence)",
                    borderRadius: 4,
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                    {yaml.publications.citation.label}
                  </div>
                  <p style={{ fontSize: 14, color: "var(--bkb-text)", lineHeight: 1.65, margin: "0 0 16px" }}>
                    {yaml.publications.citation.text}
                  </p>
                  <a
                    href={yaml.publications.citation.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bkb-btn bkb-btn-primary"
                    style={{ textDecoration: "none" }}
                  >
                    <Sparkles className="w-3 h-3" /> {yaml.publications.citation.button_text || "See research paper"}
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      </Theme>
    </div>
  );
}
