"use client";

/**
 * MarkdownContent — render review synthesis / introduction / conclusion text
 * as proper HTML (headings, bold, italic, lists, tables, blockquotes, hr).
 *
 * The agent emits Markdown for these long-form fields. Rendering them as
 * plain text (whitespace-pre-wrap) was leaking the source syntax (#, **,
 * |, >) to the page, especially on the public review URL where users can't
 * just download the .md export to read it cleanly.
 *
 * Uses react-markdown + remark-gfm for GitHub-flavored markdown (tables,
 * task lists, strikethrough, autolinks). Builds a React tree directly —
 * no dangerouslySetInnerHTML — so this is XSS-safe by construction.
 */

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  children: string;
  /** Optional className passed to the wrapper. */
  className?: string;
  /** Inline styles for the wrapper (e.g. fontSize / lineHeight overrides). */
  style?: React.CSSProperties;
};

export function MarkdownContent({ children, className, style }: Props) {
  return (
    <div className={className} style={{ ...DEFAULT_STYLE, ...style }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings: keep the visual hierarchy distinct without huge fonts —
          // these often appear inside cards that already have their own h2.
          h1: ({ ...p }) => <h2 style={{ fontSize: "1.4em", fontWeight: 600, margin: "0.8em 0 0.4em" }} {...p} />,
          h2: ({ ...p }) => <h3 style={{ fontSize: "1.2em", fontWeight: 600, margin: "0.8em 0 0.3em" }} {...p} />,
          h3: ({ ...p }) => <h4 style={{ fontSize: "1.05em", fontWeight: 600, margin: "0.7em 0 0.25em" }} {...p} />,
          h4: ({ ...p }) => <h5 style={{ fontSize: "1em",    fontWeight: 600, margin: "0.6em 0 0.2em"  }} {...p} />,
          // Paragraphs + lists with breathing room
          p:  ({ ...p }) => <p  style={{ margin: "0.6em 0" }} {...p} />,
          ul: ({ ...p }) => <ul style={{ margin: "0.5em 0", paddingLeft: "1.5em" }} {...p} />,
          ol: ({ ...p }) => <ol style={{ margin: "0.5em 0", paddingLeft: "1.5em" }} {...p} />,
          li: ({ ...p }) => <li style={{ margin: "0.2em 0" }} {...p} />,
          // Blockquote
          blockquote: ({ ...p }) => (
            <blockquote
              style={{
                margin: "0.8em 0",
                padding: "0.4em 0.9em",
                borderLeft: "3px solid var(--bkb-accent, #4a4a4a)",
                background: "var(--bkb-surfaceAlt, #f5f5f0)",
                color: "var(--bkb-textMuted, #4a4a4a)",
                borderRadius: "0 4px 4px 0",
              }}
              {...p}
            />
          ),
          // Inline + block code
          code: ({ ...p }) => (
            <code
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "0.9em",
                background: "var(--bkb-surfaceAlt, #f0f0eb)",
                padding: "0.1em 0.35em",
                borderRadius: 3,
              }}
              {...p}
            />
          ),
          pre: ({ ...p }) => (
            <pre
              style={{
                margin: "0.8em 0",
                padding: "0.8em 1em",
                background: "var(--bkb-surfaceAlt, #f5f5f0)",
                border: "1px solid var(--bkb-border, #e5e5e0)",
                borderRadius: 6,
                fontSize: "0.85em",
                lineHeight: 1.5,
                overflowX: "auto",
              }}
              {...p}
            />
          ),
          // GFM tables — give them visible borders and a touch of padding
          // so the cells don't run together.
          table: ({ ...p }) => (
            <div style={{ overflowX: "auto", margin: "0.8em 0" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: "0.95em",
                }}
                {...p}
              />
            </div>
          ),
          th: ({ ...p }) => (
            <th
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderBottom: "2px solid var(--bkb-border, #e5e5e0)",
                background: "var(--bkb-surfaceAlt, #f5f5f0)",
                fontWeight: 600,
              }}
              {...p}
            />
          ),
          td: ({ ...p }) => (
            <td
              style={{
                padding: "6px 10px",
                borderBottom: "1px solid var(--bkb-border, #e5e5e0)",
                verticalAlign: "top",
              }}
              {...p}
            />
          ),
          // Horizontal rule — agent uses --- between sections
          hr: () => (
            <hr
              style={{
                margin: "1.4em 0",
                border: "none",
                borderTop: "1px solid var(--bkb-border, #e5e5e0)",
              }}
            />
          ),
          // Links open in a new tab; keep the visual subtle
          a: ({ ...p }) => (
            <a
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--bkb-accent, #1a73e8)", textDecoration: "underline" }}
              {...p}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

const DEFAULT_STYLE: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.65,
  color: "var(--bkb-text, #1a1a1a)",
  wordBreak: "break-word",
};
