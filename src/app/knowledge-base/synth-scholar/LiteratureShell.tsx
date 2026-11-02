"use client";

/**
 * The Literature reviews pages in the site's marketing layout — the same header,
 * page head (eyebrow, title, lead), DM Sans type and footer as Explore, Use with AI
 * and the other top-menu pages. SiteChrome treats /knowledge-base/synth-scholar/*
 * as standalone so these pages aren't also wrapped in the app shell, whose
 * headings use the serif display face.
 */

import React from "react";
import Link from "next/link";
import MarketingHeader from "../../components/marketing/MarketingHeader";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { dmSans, plexMono } from "../../components/marketing/fonts";
import "../../components/marketing/landing/landing.css";
import "./literature.css";

export default function LiteratureShell({
  eyebrow,
  title,
  lead,
  back,
  compact = false,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** A link above the eyebrow, e.g. back to the list. */
  back?: { href: string; label: string };
  /** Smaller title, for a review's own (often long) title. */
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />
      <main className="wrap">
        <section className={`page-head${compact ? " ss-compact" : ""}`}>
          {back && (
            <Link href={back.href} className="ss-back">← {back.label}</Link>
          )}
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {lead && (typeof lead === "string" ? <p className="lead">{lead}</p> : lead)}
        </section>
        <section className="page-body ss-body">{children}</section>
      </main>
      <MarketingFooter />
    </div>
  );
}
