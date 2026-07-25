"use client";

/**
 * ReviewFormGuide — a Dialog that shows ALL field descriptions in one place.
 *
 * Used on the /user/synth-scholar?mode=new page as an alternative to clicking
 * each (i) icon individually. Lets a new user read through every option as a
 * single onboarding document, or come back later to look up a specific field.
 *
 * Renders FIELD_GUIDES grouped by the 6 protocol sections so the layout
 * mirrors the form itself.
 *
 * Implementation note: uses Radix primitives directly (mirroring
 * PlanConfirmDialog) rather than the shared ui/dialog.tsx wrapper. The
 * shared wrapper styles the content with the Tailwind `bg-background`
 * token, which isn't defined in BrainKB's theme — that's why an early
 * version of this component rendered transparent over the page.
 */

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FONTS, Icon } from "@/src/app/components/design-system";
import { FIELD_GUIDES, type FieldGuide } from "./fieldGuides";

// Section ordering and the FIELD_GUIDES keys that belong to each. Keep in
// sync with the form sections in user/synth-scholar/page.tsx so the guide
// reads top-to-bottom in the same order the user fills the form.
const SECTIONS: ReadonlyArray<{ title: string; keys: ReadonlyArray<keyof typeof FIELD_GUIDES> }> = [
  {
    title: "Protocol — basics",
    keys: ["title", "objective", "population", "intervention", "comparison", "outcome", "inclusion", "exclusion"],
  },
  {
    title: "Search strategy",
    keys: ["databases", "date_range", "hops"],
  },
  {
    title: "Registration & disclosures",
    keys: ["registration", "protocol_url", "funding", "competing_interests"],
  },
  {
    title: "Risk-of-bias & charting",
    keys: ["rob_tool", "charting_questions", "appraisal_domains"],
  },
  {
    title: "Per-group analysis",
    keys: ["grouping_dimension", "default_group_questions"],
  },
  {
    title: "Run configuration",
    keys: [
      "mode", "model", "consensus_model",
      "max_results", "related_depth", "biorxiv_days",
      "max_articles", "concurrency", "max_plan_iterations",
      "synthesis_style", "data_items",
      "enable_cache", "extract_data", "pause_for_review",
    ],
  },
];

function GuideEntry({ guide }: { guide: FieldGuide }) {
  return (
    <div
      style={{
        padding: "18px 0",
        borderBottom: "1px solid var(--bkb-border)",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--bkb-text)",
          marginBottom: 8,
        }}
      >
        {guide.title}
      </div>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.65,
          color: "var(--bkb-textMuted)",
        }}
      >
        {guide.description}
      </div>
      {guide.link && (
        <a
          href={guide.link.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginTop: 10,
            fontSize: 12,
            color: "var(--bkb-accent)",
            textDecoration: "underline",
          }}
        >
          {guide.link.label ?? "Reference"} ↗
        </a>
      )}
    </div>
  );
}

export function ReviewFormGuide({
  trigger,
}: {
  /** Optional custom trigger; defaults to a small "Open full guide" button. */
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="bkb-btn bkb-btn-ghost"
            style={{
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="evidence" size={12} /> Open full guide
          </button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            // Same recipe as PlanConfirmDialog: moderate dim + heavy blur so
            // the page is clearly pushed back. The dialog box below is fully
            // opaque so it reads as a solid sheet over the dimmed page.
            background: "rgba(20, 24, 32, 0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            // High z-index so the overlay covers the navbar too — otherwise
            // the navbar (sticky, often z-index 30-50) would render on top
            // of the dim and break the modal's "this is the foreground" feel.
            zIndex: 999,
          }}
        />
        <Dialog.Content
          aria-describedby="review-form-guide-description"
          style={{
            position: "fixed",
            // Anchor below the navbar instead of vertically centring. The
            // BrainKB navbar is ~80px tall; centring with maxHeight: 90vh
            // pushed the modal's top behind the navbar, hiding the close
            // button and the header padding. 96px clears the navbar with
            // a small breathing gap.
            top: 96,
            left: "50%",
            transform: "translateX(-50%)",
            // Fully opaque white surface — no alpha, no color-mix, no
            // Tailwind variable that might be undefined in this theme.
            background: "var(--bkb-surface, #ffffff)",
            border: "1px solid var(--bkb-border)",
            borderRadius: 12,
            // Wider so descriptions don't break into 3+ lines per sentence.
            // Caps at 96vw on small screens.
            width: "min(1200px, 96vw)",
            // Height limited so the modal always fits between the navbar
            // (96px from top) and a 32px gap at the bottom of the viewport.
            maxHeight: "calc(100vh - 128px)",
            display: "flex",
            flexDirection: "column",
            boxShadow:
              "0 32px 80px -20px rgba(0, 0, 0, 0.55), 0 12px 30px -8px rgba(0, 0, 0, 0.35)",
            // Aggressively above any navbar / sticky header z-index in the
            // app shell. The Radix overlay sits at 50 below this.
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Sticky header — generous top padding so the title doesn't feel
              cramped against the modal's top edge. */}
          <div
            style={{
              padding: "40px 32px 20px",
              borderBottom: "1px solid var(--bkb-border)",
              background: "var(--bkb-surface, #ffffff)",
              display: "flex",
              alignItems: "start",
              justifyContent: "space-between",
              gap: 16,
              position: "relative",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--bkb-textSubtle)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Field reference
              </div>
              <Dialog.Title
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}
              >
                Review form — full field guide
              </Dialog.Title>
              <Dialog.Description
                id="review-form-guide-description"
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "var(--bkb-textMuted)",
                  lineHeight: 1.55,
                  maxWidth: 720,
                }}
              >
                Every option on the protocol form, grouped by section, with
                authoritative references (PICO, PRISMA, RoB tool docs).
              </Dialog.Description>
            </div>
            {/* Close button — fixed top-right, high-contrast so it's always
                visible. Uses absolute positioning so it doesn't get squashed
                by long titles on narrow viewports. */}
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close guide"
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "var(--bkb-surfaceAlt, #f5f5f0)",
                  border: "1px solid var(--bkb-border)",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--bkb-text)",
                  fontSize: 18,
                  fontWeight: 500,
                  lineHeight: 1,
                  padding: 0,
                  transition: "background 120ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--bkb-border, #e5e5e0)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--bkb-surfaceAlt, #f5f5f0)";
                }}
              >
                <Icon name="x" size={14} />
              </button>
            </Dialog.Close>
          </div>

          {/* Scrollable body */}
          <div
            className="bkb-scroll"
            style={{
              overflowY: "auto",
              padding: "20px 28px 32px",
              flex: 1,
              background: "var(--bkb-surface, #ffffff)",
            }}
          >
            {SECTIONS.map((section) => (
              <section key={section.title} style={{ marginTop: 32 }}>
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--bkb-textSubtle)",
                    paddingBottom: 6,
                    borderBottom: "1px solid var(--bkb-border)",
                  }}
                >
                  {section.title}
                </h3>
                {section.keys.map((k) => {
                  const guide = FIELD_GUIDES[k];
                  if (!guide) return null;
                  return <GuideEntry key={k} guide={guide} />;
                })}
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
