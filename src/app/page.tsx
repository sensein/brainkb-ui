"use client";

/**
 * Home — landing page (editorial direction).
 *
 * Narrative order: Hero → What is BrainKB (what it is) → AbstractAtlas (what
 * users can explore) → Use Cases (where it applies) → BrainKB Tools (which
 * tools enable it) → Video (how it works) → Structured Models (what models
 * support it) → Powered by AI agents (technical credibility).
 * All copy is content-managed from config-home.yaml; the /api/statistics flow
 * is preserved.
 */

import yaml from "@/src/config/yaml/config-home.yaml";
import toolsLib from "@/src/config/yaml/tools-libraries.yaml";
import { useEffect, useState } from "react";
import {
  Brain, Database, FileText, Users, Sparkles, ExternalLink, Network, CheckCircle,
  FileCheck, Code, Layers as LayersIcon, BookOpen, Search, UsersRound, Globe, FolderTree,
  FileSearch, FileJson, Tag, MessageSquare, Eye, AlertCircle, Play,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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

// ─── Section primitives ──────────────────────────────────────────────────

function SectionTitle({ children, size = 46 }: { children: React.ReactNode; size?: number }) {
  return (
    <h2
      style={{
        fontFamily: FONTS.display,
        fontSize: `clamp(30px, 6vw, ${size}px)`,
        lineHeight: 1.06,
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
    <p style={{ fontSize: 16, color: "var(--bkb-textMuted)", lineHeight: 1.65, margin: "16px 0 0", maxWidth: 720 }}>
      {children}
    </p>
  );
}

function Eyebrow({ children, color = "var(--bkb-accent)" }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 12,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
        fontWeight: 600,
        marginBottom: 18,
      }}
    >
      {children}
    </div>
  );
}

// Underlined accent link used in section headers ("View all … →").
function MoreLink({ href, children, external = true }: { href: string; children: React.ReactNode; external?: boolean }) {
  const style: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--bkb-accent)",
    textDecoration: "none",
    borderBottom: "2px solid color-mix(in oklch, var(--bkb-accent), transparent 60%)",
    paddingBottom: 2,
    whiteSpace: "nowrap",
  };
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{children}</a>
  ) : (
    <Link href={href} style={style}>{children}</Link>
  );
}

// VideoPlayer — lightweight YouTube facade. Shows the thumbnail + a play
// button; only loads the (autoplaying) iframe once the user clicks, so the
// landing page stays fast even with several videos.
function VideoPlayer({ id, title, onPlay }: { id: string; title?: string; onPlay?: () => void }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingTop: "56.25%",
        borderRadius: 14,
        overflow: "hidden",
        background: "linear-gradient(135deg, #14241c, #0d1813)",
        boxShadow: "0 18px 40px -18px rgba(0,0,0,0.45)",
      }}
    >
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title || "Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      ) : (
        <button
          onClick={() => {
            onPlay?.();
            setPlaying(true);
          }}
          aria-label={`Play ${title || "video"}`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            border: 0,
            padding: 0,
            cursor: "pointer",
            background: "transparent",
            display: "block",
          }}
        >
          {/* thumbnail (plain img — external host, no next/image config needed).
              maxresdefault only exists for HD videos / once processed, so fall
              back to hqdefault, which YouTube always generates. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
            alt=""
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fallback) {
                img.dataset.fallback = "1";
                img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
              }
            }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }}
          />
          {title && (
            <span
              style={{
                position: "absolute",
                top: 22,
                left: 26,
                right: 26,
                textAlign: "left",
                fontFamily: FONTS.display,
                fontSize: 18,
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </span>
          )}
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 66,
              height: 66,
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
            }}
          >
            <Play style={{ width: 24, height: 24, marginLeft: 3 }} fill="#d12c2c" color="#d12c2c" />
          </span>
        </button>
      )}
    </div>
  );
}

// Status pill styling for use-case rows
const STATUS_PILL: Record<string, { label: string; fg: string; bg: string }> = {
  available: { label: "Available", fg: "#0f7a52", bg: "color-mix(in oklch, #1db981, transparent 86%)" },
  partially_available: { label: "Partially available", fg: "#1d6fb8", bg: "color-mix(in oklch, #2b8fe0, transparent 86%)" },
  in_development: { label: "In development", fg: "#b4451f", bg: "color-mix(in oklch, #e0682b, transparent 86%)" },
  in_review: { label: "In review", fg: "#9a6a12", bg: "color-mix(in oklch, #e0a52b, transparent 84%)" },
  coming_soon: { label: "Coming soon", fg: "var(--bkb-textMuted)", bg: "color-mix(in oklch, var(--bkb-textMuted), transparent 88%)" },
};

// Shared accent palette for tool badges (falls back when YAML omits `color`)
const TOOL_COLORS = ["#0f7a52", "#2563eb", "#b45309", "#7c3aed"];

// VideoCarousel — featured player on the left, copy on the right. With more
// than one video it auto-advances (pausing once the viewer interacts or hits
// play); the headline/description swap to match the active video.
function VideoCarousel({
  videos,
  eyebrow,
  headline,
  description,
  buttonText,
}: {
  videos: any[];
  eyebrow?: string;
  headline?: string;
  description?: string;
  buttonText?: string;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = videos.length;

  useEffect(() => {
    if (paused || n <= 1) return;
    const t = setInterval(() => setActive((a) => (a + 1) % n), 6500);
    return () => clearInterval(t);
  }, [paused, n]);

  const cur = videos[active] || {};
  const go = (i: number) => {
    setPaused(true);
    setActive(((i % n) + n) % n);
  };

  const navBtn: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: "1px solid var(--bkb-border)",
    background: "var(--bkb-surface)",
    color: "var(--bkb-text)",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div className="home-2col" style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 56, alignItems: "center" }}>
      <VideoPlayer key={active} id={cur.youtube_id} title={cur.title} onPlay={() => setPaused(true)} />
      <div>
        {/* eyebrow + headline are fixed; only the video and its description cycle */}
        <Eyebrow>{eyebrow || "See It in Action"}</Eyebrow>
        <SectionTitle size={40}>{headline || "See It in Action"}</SectionTitle>
        {(cur.description || description) && (
          <p style={{ fontSize: 16, color: "var(--bkb-textMuted)", lineHeight: 1.7, margin: "16px 0 28px" }}>
            {cur.description || description}
          </p>
        )}
        <a
          href={`https://youtu.be/${cur.youtube_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bkb-btn bkb-btn-primary"
          style={{ textDecoration: "none" }}
        >
          {buttonText || "Watch on YouTube"} →
        </a>

        {n > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 32 }}>
            <button onClick={() => go(active - 1)} aria-label="Previous video" style={navBtn}>←</button>
            <div style={{ display: "flex", gap: 8 }}>
              {videos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  aria-label={`Go to video ${i + 1}`}
                  style={{
                    width: i === active ? 26 : 9,
                    height: 9,
                    borderRadius: 999,
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                    transition: "all .3s ease",
                    background: i === active ? "var(--bkb-accent)" : "var(--bkb-border)",
                  }}
                />
              ))}
            </div>
            <button onClick={() => go(active + 1)} aria-label="Next video" style={navBtn}>→</button>
            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: "var(--bkb-textSubtle)", marginLeft: 4 }}>
              {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>
    </div>
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

  const videos: any[] = Array.isArray(yaml.videos?.items) ? yaml.videos.items : [];

  // "open-source tools" counts everything on the Tools & Libraries page —
  // the flagship apps plus the Python libraries.
  const tl: any = toolsLib;
  const openSourceCount =
    (Array.isArray(tl.tools) ? tl.tools.length : 0) +
    (Array.isArray(tl.libraries) ? tl.libraries.length : 0);

  const heroStats = [
    { value: openSourceCount, label: "open-source tools", href: "/tools-and-libraries" },
    { value: Array.isArray(yaml.usecases?.cases) ? yaml.usecases.cases.length : 0, label: "active use cases" },
    { value: "Multi-agent", label: "orchestration" },
  ];

  return (
    <div style={{ background: "#f0eee9" }}>
      <Theme theme="light" style={{ background: "transparent" }}>
        <BkbHero stats={heroStats} />

        {/* ── What is BrainKB (what it is) ─────────────────────────── */}
        {yaml.whatisbrainkb && (
          <section className="home-pad home-pad-y" style={{ padding: "104px 64px", maxWidth: 1200, margin: "0 auto" }}>
            <div className="home-2col" style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 72, alignItems: "start", marginBottom: 64 }}>
              <div>
                <Eyebrow>{yaml.whatisbrainkb.eyebrow || "What is BrainKB"}</Eyebrow>
                <SectionTitle>{yaml.whatisbrainkb.headline || yaml.whatisbrainkb.title || "What is BrainKB?"}</SectionTitle>
              </div>
              <p style={{ fontSize: 17, color: "var(--bkb-textMuted)", lineHeight: 1.7, margin: 0, paddingTop: 6 }}>
                {yaml.whatisbrainkb.description || yaml.whatisbrainkb.subtitle}
              </p>
            </div>
            <div className="home-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid var(--bkb-border)" }}>
              {Array.isArray(yaml.whatisbrainkb.bullet_points) &&
                yaml.whatisbrainkb.bullet_points.map((p: any, i: number) => (
                  <div key={i} style={{ padding: "30px 30px 0", borderLeft: i ? "1px solid var(--bkb-border)" : "none" }}>
                    <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: "var(--bkb-accent)", marginBottom: 24 }}>
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em", margin: "0 0 10px" }}>
                      {p.heading}
                    </h3>
                    <p style={{ fontSize: 13.5, color: "var(--bkb-textMuted)", lineHeight: 1.6, margin: 0 }}>{p.title}</p>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* ── AbstractAtlas (what users can explore) ───────────────── */}
        {yaml.abstractatlas && (
          <section style={{ background: "linear-gradient(135deg, #e7efe9 0%, #eef2ed 100%)", borderTop: "1px solid var(--bkb-border)", borderBottom: "1px solid var(--bkb-border)" }}>
            <div className="home-pad home-pad-y home-2col" style={{ padding: "104px 64px", maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 64, alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--bkb-accent)", fontWeight: 600 }}>
                    {yaml.abstractatlas.eyebrow || "Explore"}
                  </span>
                  {yaml.abstractatlas.badge && (
                    <span style={{ fontFamily: FONTS.mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--bkb-publication)", border: "1px solid color-mix(in oklch, var(--bkb-publication), transparent 55%)", borderRadius: 999, padding: "2px 9px" }}>
                      {yaml.abstractatlas.badge}
                    </span>
                  )}
                </div>
                <SectionTitle size={42}>{yaml.abstractatlas.title}</SectionTitle>
                {yaml.abstractatlas.description && (
                  <p style={{ fontSize: 16, color: "var(--bkb-textMuted)", lineHeight: 1.7, margin: "18px 0 28px", maxWidth: 520 }}>
                    {yaml.abstractatlas.description}
                  </p>
                )}
                <a
                  href={yaml.abstractatlas.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bkb-btn bkb-btn-primary"
                  style={{ textDecoration: "none" }}
                >
                  {yaml.abstractatlas.button_text || "Open AbstractAtlas"} →
                </a>
              </div>
              <a
                href={yaml.abstractatlas.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid var(--bkb-border)",
                  background: "#fff",
                  boxShadow: "0 24px 50px -26px rgba(0,0,0,0.25)",
                  padding: 8,
                }}
              >
                <Image
                  src={yaml.abstractatlas.image}
                  alt="AbstractAtlas — interactive map of the neuroscience literature"
                  width={1200}
                  height={680}
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: 10 }}
                />
              </a>
            </div>
          </section>
        )}

        {/* ── Use Cases (where it applies) ─────────────────────────── */}
        {yaml.usecases && (
          <section className="home-pad home-pad-y" style={{ padding: "104px 64px", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ maxWidth: 720, marginBottom: 48 }}>
              <Eyebrow color="#b4451f">{yaml.usecases.eyebrow || "In Practice"}</Eyebrow>
              <SectionTitle>{yaml.usecases.title || "Use Cases"}</SectionTitle>
              <SectionLead>{yaml.usecases.subtitle}</SectionLead>
            </div>

            <div className="bkb-card" style={{ padding: 0, borderRadius: 16, overflow: "hidden" }}>
              {Array.isArray(yaml.usecases.cases) &&
                yaml.usecases.cases.map((c: any, i: number) => {
                  const pill = STATUS_PILL[c.status] || STATUS_PILL.coming_soon;
                  const href = c.use_link || c.discussion_link || null;
                  const linkExternal = href?.startsWith?.("http");
                  return (
                    <div
                      key={i}
                      className="home-usecase-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "110px minmax(190px, 1fr) 1.4fr 150px 64px",
                        gap: 24,
                        alignItems: "center",
                        padding: "26px 32px",
                        borderTop: i ? "1px solid var(--bkb-border)" : "none",
                      }}
                    >
                      <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: "var(--bkb-textSubtle)", letterSpacing: "0.06em" }}>
                        {`Case ${String(i + 1).padStart(2, "0")}`}
                      </div>
                      <h3 style={{ fontFamily: FONTS.display, fontSize: 21, fontWeight: 400, letterSpacing: "-0.01em", margin: 0 }}>{c.title}</h3>
                      <p style={{ fontSize: 13.5, color: "var(--bkb-textMuted)", lineHeight: 1.55, margin: 0 }}>{c.description}</p>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 999, color: pill.fg, background: pill.bg, whiteSpace: "nowrap" }}>
                          {pill.label}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {href && (
                          <Link
                            href={href}
                            target={linkExternal ? "_blank" : "_self"}
                            rel={linkExternal ? "noopener noreferrer" : ""}
                            style={{ fontSize: 13, fontWeight: 600, color: "var(--bkb-accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            View <span>→</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {yaml.usecases.how_it_works && (
              <div
                className="home-hiw"
                style={{
                  marginTop: 28,
                  background: "linear-gradient(135deg, #14241c, #0e1a14)",
                  borderRadius: 20,
                  padding: "48px 52px",
                  display: "grid",
                  gridTemplateColumns: "1.25fr 1fr 1fr 1fr",
                  gap: 40,
                }}
              >
                <div>
                  <h3 style={{ fontFamily: FONTS.display, fontSize: 27, fontWeight: 400, color: "#f0eee9", margin: "0 0 14px", letterSpacing: "-0.01em" }}>
                    {yaml.usecases.how_it_works.title}
                  </h3>
                  <p style={{ fontSize: 13.5, color: "rgba(240,238,233,0.6)", lineHeight: 1.6, margin: 0 }}>{yaml.usecases.how_it_works.subtitle}</p>
                </div>
                {Array.isArray(yaml.usecases.how_it_works.phases) &&
                  yaml.usecases.how_it_works.phases.map((ph: any, i: number) => (
                    <div key={i}>
                      <div style={{ fontFamily: FONTS.mono, fontSize: 11.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#3ecf8e", marginBottom: 14 }}>
                        {`${String(i + 1).padStart(2, "0")} · ${ph.label}`}
                      </div>
                      <p style={{ fontSize: 13.5, color: "rgba(240,238,233,0.75)", lineHeight: 1.6, margin: 0 }}>{ph.description}</p>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}

        {/* ── BrainKB Tools (which tools enable it) ────────────────── */}
        {yaml.tools && (
          <section style={{ background: "var(--bkb-surface)", borderTop: "1px solid var(--bkb-border)", borderBottom: "1px solid var(--bkb-border)" }}>
            <div className="home-pad home-pad-y" style={{ padding: "104px 64px", maxWidth: 1200, margin: "0 auto" }}>
              <div style={{ marginBottom: 56 }}>
                <Eyebrow>{yaml.tools.eyebrow || "The Toolkit"}</Eyebrow>
                <SectionTitle>{yaml.tools.title || "BrainKB Tools"}</SectionTitle>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 40, marginTop: 18, flexWrap: "wrap" }}>
                  <p style={{ fontSize: 16, color: "var(--bkb-textMuted)", lineHeight: 1.65, margin: 0, maxWidth: 640 }}>{yaml.tools.subtitle}</p>
                  {yaml.tools.more_link && (
                    <MoreLink href={yaml.tools.more_link} external={false}>
                      {yaml.tools.more_text || "View all tools"} →
                    </MoreLink>
                  )}
                </div>
              </div>
              <div className="home-2col" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 22 }}>
                {Array.isArray(yaml.tools.items) &&
                  yaml.tools.items.map((t: any, i: number) => {
                    const isExternal = t.link?.startsWith?.("http");
                    const isComingSoon = !t.link || t.link === "#";
                    const color = t.color || TOOL_COLORS[i % TOOL_COLORS.length];
                    // Mixed-orientation logos: horizontal wordmarks fill width and
                    // stay short; square/stacked logos fill the tile height so the
                    // two kinds carry comparable visual weight.
                    const isSquareLogo = t.logo_orientation === "square";
                    const logoImgStyle: React.CSSProperties = isSquareLogo
                      ? { width: "auto", height: "150px", maxWidth: "70%", objectFit: "contain" }
                      : { width: "auto", height: "auto", maxWidth: "94%", maxHeight: 150, objectFit: "contain" };
                    const Inner = (
                      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        {t.category && (
                          <div style={{ fontFamily: FONTS.mono, fontSize: 11, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--bkb-textSubtle)", marginBottom: 18, textAlign: "right" }}>
                            {t.category}
                          </div>
                        )}
                        {/* logo — no box; orientation-aware sizing */}
                        <div
                          style={{
                            height: 96,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            marginBottom: 22,
                          }}
                        >
                          {t.logo ? (
                            <Image src={t.logo} alt={t.name} width={280} height={150} style={logoImgStyle} />
                          ) : (
                            <span style={{ fontFamily: FONTS.display, fontSize: 28, color }}>{t.name}</span>
                          )}
                        </div>
                        <p style={{ fontSize: 14, color: "var(--bkb-textMuted)", lineHeight: 1.65, margin: "0 0 20px", flex: 1 }}>{t.description}</p>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isComingSoon ? "var(--bkb-textSubtle)" : "var(--bkb-accent)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                          {isComingSoon ? (
                            <>{t.link_text || "Coming soon"}</>
                          ) : (
                            <>
                              {t.link_text || "Learn more"}
                              {isExternal ? <ExternalLink className="w-3.5 h-3.5" /> : <span>→</span>}
                            </>
                          )}
                        </div>
                      </div>
                    );
                    const cardStyle: React.CSSProperties = {
                      padding: 30,
                      borderRadius: 16,
                      textDecoration: "none",
                      color: "inherit",
                      display: "block",
                      height: "100%",
                      background: "var(--bkb-surfaceAlt)",
                    };
                    return isComingSoon ? (
                      <div key={i} className="bkb-card" style={cardStyle}>{Inner}</div>
                    ) : (
                      <Link
                        key={i}
                        href={t.link}
                        target={isExternal ? "_blank" : "_self"}
                        rel={isExternal ? "noopener noreferrer" : ""}
                        className="bkb-card"
                        style={cardStyle}
                      >
                        {Inner}
                      </Link>
                    );
                  })}
              </div>
            </div>
          </section>
        )}

        {/* ── See It in Action (how it works) ──────────────────────── */}
        {videos.length > 0 && (
          <section className="home-pad home-pad-y" style={{ padding: "104px 64px", maxWidth: 1200, margin: "0 auto" }}>
            <VideoCarousel
              videos={videos}
              eyebrow={yaml.videos.eyebrow}
              headline={yaml.videos.headline || yaml.videos.title}
              description={yaml.videos.description}
              buttonText={yaml.videos.button_text}
            />
          </section>
        )}

        {/* ── Structured Models (what models support it) ───────────── */}
        <section style={{ background: "var(--bkb-surface)", borderTop: "1px solid var(--bkb-border)", borderBottom: "1px solid var(--bkb-border)" }}>
          <div className="home-pad home-pad-y" style={{ padding: "104px 64px", maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ marginBottom: 48 }}>
              <Eyebrow>Foundations</Eyebrow>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 32, flexWrap: "wrap" }}>
                <SectionTitle>{structuedModelHeaderTitle || "Structured Models"}</SectionTitle>
                <MoreLink href="https://sensein.group/brainkbdocs/">View all models →</MoreLink>
              </div>
              <p style={{ fontSize: 16, color: "var(--bkb-textMuted)", lineHeight: 1.65, margin: "16px 0 0", maxWidth: 660 }}>
                These models provide the shared structure behind BrainKB&apos;s graph, tools, and use cases.
              </p>
            </div>
            <div className="home-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {Array.isArray(yaml.structuredmodelsbox) &&
                yaml.structuredmodelsbox.map((m: any, i: number) => {
                  const external = m.links?.startsWith?.("http");
                  const coming = m.links === "#";
                  const Inner = (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                      <div style={{ fontFamily: FONTS.mono, fontSize: 15, color: "#b4451f", marginBottom: 18 }}>&lt;/&gt;</div>
                      <h3 style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: 400, letterSpacing: "-0.01em", margin: "0 0 10px", lineHeight: 1.2 }}>{m.title}</h3>
                      <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.55, margin: "0 0 18px", flex: 1 }}>{m.description}</p>
                      <div style={{ fontSize: 13, fontWeight: 600, color: coming ? "var(--bkb-textSubtle)" : "var(--bkb-accent)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {coming ? (
                          "Coming soon"
                        ) : (
                          <>
                            Read more {external ? <ExternalLink className="w-3.5 h-3.5" /> : <span>→</span>}
                          </>
                        )}
                      </div>
                    </div>
                  );
                  const cs: React.CSSProperties = {
                    padding: 24,
                    borderRadius: 14,
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                    height: "100%",
                    background: "var(--bkb-surfaceAlt)",
                  };
                  return coming ? (
                    <div key={i} className="bkb-card" style={cs}>{Inner}</div>
                  ) : (
                    <Link
                      key={i}
                      href={m.links}
                      target={external ? "_blank" : "_self"}
                      rel={external ? "noopener noreferrer" : ""}
                      className="bkb-card"
                      style={cs}
                    >
                      {Inner}
                    </Link>
                  );
                })}
            </div>
          </div>
        </section>

        {/* ── Powered by AI agents (technical credibility, dark) ───── */}
        <section style={{ background: "linear-gradient(160deg, #15271e 0%, #0c1611 60%)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="home-pad home-pad-y" style={{ padding: "104px 64px", maxWidth: 1200, margin: "0 auto" }}>
            <div className="home-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>
              <div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#3ecf8e", fontWeight: 600, marginBottom: 18 }}>
                  {yaml.publications?.eyebrow || "Under the Hood"}
                </div>
                <h2 style={{ fontFamily: FONTS.display, fontSize: "clamp(30px, 6vw, 44px)", fontWeight: 400, color: "#f0eee9", letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0 }}>
                  {yaml.publications?.title || "Powered by advanced AI agents."}
                </h2>
                <p style={{ fontSize: 16, color: "rgba(240,238,233,0.7)", lineHeight: 1.7, margin: "20px 0 0", maxWidth: 480 }}>
                  {yaml.publications?.description}
                </p>
              </div>
              {yaml.publications?.citation && (
                <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 18, padding: 36, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3ecf8e", marginBottom: 18 }}>
                    {(yaml.publications.citation.label || "Research Citation").replace(/:\s*$/, "")}
                  </div>
                  <p style={{ fontFamily: FONTS.mono, fontSize: 13.5, color: "rgba(240,238,233,0.85)", lineHeight: 1.7, margin: "0 0 24px" }}>
                    {yaml.publications.citation.text}
                  </p>
                  <a
                    href={yaml.publications.citation.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1db981", color: "#0c1611", fontWeight: 600, fontSize: 14, padding: "11px 20px", borderRadius: 10, textDecoration: "none" }}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> {yaml.publications.citation.button_text || "See research paper"} →
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Use BrainKB from your AI assistant (MCP) — CTA band that flows
            from the dark AI-agents section into the dark footer ───── */}
        <section style={{ background: "#0c1611", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="home-pad home-pad-y" style={{ padding: "84px 64px", maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#3ecf8e", fontWeight: 600, marginBottom: 18 }}>
              Model Context Protocol
            </div>
            <h2 style={{ fontFamily: FONTS.display, fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 400, color: "#f0eee9", letterSpacing: "-0.02em", lineHeight: 1.12, margin: "0 auto", maxWidth: 720 }}>
              Drive BrainKB from your AI assistant
            </h2>
            <p style={{ fontSize: 16, color: "rgba(240,238,233,0.7)", lineHeight: 1.7, margin: "18px auto 30px", maxWidth: 600 }}>
              Connect Claude — or any MCP client — and ingest, search, and explore the knowledge
              graph in natural language, as yourself and under your own permissions.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "center" }}>
              <a
                href="/mcp"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1db981", color: "#0c1611", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 10, textDecoration: "none" }}
              >
                Explore the MCP →
              </a>
              <code
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 13,
                  color: "rgba(240,238,233,0.85)",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "11px 16px",
                  maxWidth: "100%",
                  overflowX: "auto",
                  whiteSpace: "nowrap",
                }}
              >
                claude mcp add --transport http brainkb https://mcp.brainkb.org/mcp
              </code>
            </div>
          </div>
        </section>
      </Theme>
    </div>
  );
}
