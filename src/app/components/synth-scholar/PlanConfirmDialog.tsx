"use client";

/**
 * PlanConfirmDialog — review the AI-generated search strategy before the
 * pipeline proceeds. Built on Radix Dialog (already in deps) styled with
 * brainkb-ui's bkb-* design tokens, NOT shadcn — keeps the surface
 * consistent with the rest of the app.
 *
 * Layout choices:
 *   • 960px width — wide enough that long PubMed boolean queries don't wrap
 *     into illegibility, and the 92vw cap keeps it responsive.
 *   • Two-column grid for the metadata sections (MeSH / key concepts /
 *     research question / rationale) — leaves the queries (which need width)
 *     stacked full-bleed at the top.
 *   • Solid surface + dark-backdrop overlay with a subtle blur so the page
 *     behind doesn't bleed into the dialog content.
 *   • Sticky title and action footer so long query lists stay scannable as
 *     the body scrolls.
 */

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FONTS, Icon } from "@/src/app/components/design-system";
import type { ReviewPlan } from "@/src/types/synthScholar";

interface PlanConfirmDialogProps {
  open: boolean;
  plan: ReviewPlan | null;
  iteration: number;
  maxIterations: number;
  isPending: boolean;
  onApprove: () => void;
  onRevise: (feedback: string) => void;
}

export function PlanConfirmDialog({
  open,
  plan,
  iteration,
  maxIterations,
  isPending,
  onApprove,
  onRevise,
}: PlanConfirmDialogProps) {
  const [feedback, setFeedback] = React.useState("");
  const [mode, setMode] = React.useState<"review" | "revise">("review");

  // Reset internal state when the dialog opens for a new plan iteration so a
  // user who hit Revise on iteration 1 doesn't see leftover feedback prefilled
  // when iteration 2 arrives.
  React.useEffect(() => {
    if (open) {
      setFeedback("");
      setMode("review");
    }
  }, [open, iteration]);

  if (!plan) return null;

  const totalQueries = plan.pubmed_queries.length + plan.biorxiv_queries.length;
  const reviseDisabled = isPending || iteration >= maxIterations;

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            // Moderate dim with strong blur. The dialog box itself is fully
            // opaque (var(--bkb-surface) below) — the overlay just needs to
            // push the page enough that the eye treats the card as the
            // foreground. Heavy blur scrambles the text behind without
            // requiring an aggressive black wash.
            background: "rgba(20, 24, 32, 0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            zIndex: 50,
          }}
        />
        <Dialog.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          aria-describedby={undefined}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            // Fully opaque, theme-aligned. var(--bkb-surface) is the white
            // surface token used by every other bkb-card on the site — keeps
            // the dialog visually consistent with the rest of the UI.
            // Important: NO alpha or color-mix on this background — the box
            // must read as a solid sheet over the dimmed page.
            background: "var(--bkb-surface)",
            border: "1px solid var(--bkb-border)",
            borderRadius: 12,
            width: "min(960px, 94vw)",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            // Strong shadow lifts the card off the dimmed page.
            boxShadow:
              "0 32px 80px -20px rgba(0, 0, 0, 0.55), 0 12px 30px -8px rgba(0, 0, 0, 0.35)",
            zIndex: 51,
            overflow: "hidden",
          }}
        >
          {/* Sticky header */}
          <div
            style={{
              padding: "20px 28px 16px",
              borderBottom: "1px solid var(--bkb-border)",
              background: "var(--bkb-surface)",
            }}
          >
            <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16 }}>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--bkb-textSubtle)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Plan confirmation
                </div>
                <Dialog.Title
                  style={{
                    fontFamily: FONTS.display,
                    fontSize: 26,
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  Review search plan
                </Dialog.Title>
                <div style={{ fontSize: 13, color: "var(--bkb-textMuted)", marginTop: 6, lineHeight: 1.5 }}>
                  The AI proposed a search strategy. Approve to start the pipeline, or send revisions
                  back for another iteration.
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <span
                  className="bkb-chip"
                  style={{
                    fontSize: 10,
                    borderColor: "var(--bkb-accent)",
                    color: "var(--bkb-accent)",
                  }}
                >
                  Iteration {iteration} / {maxIterations}
                </span>
                <span style={{ fontSize: 11, color: "var(--bkb-textSubtle)" }}>
                  {totalQueries} {totalQueries === 1 ? "query" : "queries"}
                  {plan.mesh_terms.length > 0 && ` · ${plan.mesh_terms.length} MeSH terms`}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable body — explicit opaque surface so no part of the
              dimmed/blurred backdrop peeks through behind the content. */}
          <div
            className="bkb-scroll"
            style={{
              overflowY: "auto",
              padding: "20px 28px",
              flex: 1,
              background: "var(--bkb-surface)",
            }}
          >
            {mode === "revise" ? (
              <ReviseForm
                feedback={feedback}
                onChange={setFeedback}
                isPending={isPending}
                plan={plan}
              />
            ) : (
              <PlanBody plan={plan} />
            )}
          </div>

          {/* Sticky footer with primary actions */}
          <div
            style={{
              padding: "14px 28px",
              borderTop: "1px solid var(--bkb-border)",
              background: "var(--bkb-surfaceAlt)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", lineHeight: 1.4 }}>
              {mode === "review" ? (
                <>
                  Approving locks in this strategy and starts article fetch across{" "}
                  {totalQueries} {totalQueries === 1 ? "query" : "queries"}.
                  {iteration >= maxIterations && (
                    <>
                      {" "}
                      <strong style={{ color: "var(--bkb-publication)" }}>
                        Max revision iterations reached — Approve is the only option.
                      </strong>
                    </>
                  )}
                </>
              ) : (
                <>
                  Tell the agent what to change. It will regenerate the queries, MeSH terms, and
                  rationale.
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {mode === "review" ? (
                <>
                  <button
                    className="bkb-btn bkb-btn-ghost"
                    onClick={() => setMode("revise")}
                    disabled={reviseDisabled}
                    title={iteration >= maxIterations ? "Max iterations reached" : "Send the plan back with feedback"}
                  >
                    <Icon name="sync" size={12} /> Revise
                  </button>
                  <button
                    className="bkb-btn bkb-btn-primary"
                    onClick={() => {
                      onApprove();
                      setFeedback("");
                      setMode("review");
                    }}
                    disabled={isPending}
                  >
                    <Icon name="check" size={12} />{" "}
                    {isPending ? "Processing…" : "Approve & start"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="bkb-btn bkb-btn-ghost"
                    onClick={() => setMode("review")}
                    disabled={isPending}
                  >
                    <Icon name="arrow" size={12} style={{ transform: "rotate(180deg)" }} /> Back
                  </button>
                  <button
                    className="bkb-btn bkb-btn-primary"
                    onClick={() => {
                      if (!feedback.trim()) return;
                      onRevise(feedback.trim());
                      setFeedback("");
                      setMode("review");
                    }}
                    disabled={isPending || !feedback.trim()}
                    title={!feedback.trim() ? "Enter feedback first" : "Submit revision request"}
                  >
                    <Icon name="sync" size={12} />{" "}
                    {isPending ? "Revising…" : "Submit feedback"}
                  </button>
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Review mode body ───────────────────────────────────────────────────

function PlanBody({ plan }: { plan: ReviewPlan }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Research question — full width, prominent. Solid bkb-surfaceAlt
          (the same near-white shade existing bkb-cards use elsewhere) plus
          a left accent rule for visual emphasis. No color-mix tints — keeps
          the dialog interior reading as a single opaque card. */}
      {plan.research_question && (
        <div
          style={{
            padding: 14,
            border: "1px solid var(--bkb-border)",
            borderLeft: "3px solid var(--bkb-accent)",
            borderRadius: 6,
            background: "var(--bkb-surfaceAlt)",
          }}
        >
          <SectionLabel>Research question</SectionLabel>
          <p style={{ fontSize: 14, color: "var(--bkb-text)", margin: "6px 0 0", lineHeight: 1.55 }}>
            {plan.research_question}
          </p>
        </div>
      )}

      {/* Queries — full width, mono-stacked. PubMed strings can be very long. */}
      <div>
        <SectionLabel>
          PubMed queries{" "}
          <span style={{ color: "var(--bkb-textSubtle)", fontWeight: 400, marginLeft: 6 }}>
            ({plan.pubmed_queries.length})
          </span>
        </SectionLabel>
        <QueryList items={plan.pubmed_queries} emptyText="No PubMed queries proposed." />
      </div>

      {plan.biorxiv_queries.length > 0 && (
        <div>
          <SectionLabel>
            bioRxiv / preprint queries{" "}
            <span style={{ color: "var(--bkb-textSubtle)", fontWeight: 400, marginLeft: 6 }}>
              ({plan.biorxiv_queries.length})
            </span>
          </SectionLabel>
          <QueryList items={plan.biorxiv_queries} emptyText="None." />
        </div>
      )}

      {/* Two-column metadata grid: MeSH + Key concepts side by side. */}
      {(plan.mesh_terms.length > 0 || plan.key_concepts.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {plan.mesh_terms.length > 0 && (
            <div>
              <SectionLabel>
                MeSH terms{" "}
                <span style={{ color: "var(--bkb-textSubtle)", fontWeight: 400, marginLeft: 6 }}>
                  ({plan.mesh_terms.length})
                </span>
              </SectionLabel>
              <ChipList items={plan.mesh_terms} accent="primary" />
            </div>
          )}
          {plan.key_concepts.length > 0 && (
            <div>
              <SectionLabel>
                Key concepts{" "}
                <span style={{ color: "var(--bkb-textSubtle)", fontWeight: 400, marginLeft: 6 }}>
                  ({plan.key_concepts.length})
                </span>
              </SectionLabel>
              <ChipList items={plan.key_concepts} accent="muted" />
            </div>
          )}
        </div>
      )}

      {/* Rationale */}
      {plan.rationale && (
        <div>
          <SectionLabel>Rationale</SectionLabel>
          <p
            style={{
              fontSize: 13,
              color: "var(--bkb-textMuted)",
              lineHeight: 1.6,
              margin: "6px 0 0",
              whiteSpace: "pre-wrap",
            }}
          >
            {plan.rationale}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Revise mode body ───────────────────────────────────────────────────

function ReviseForm({
  feedback,
  onChange,
  isPending,
  plan,
}: {
  feedback: string;
  onChange: (v: string) => void;
  isPending: boolean;
  plan: ReviewPlan;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          padding: 14,
          background: "var(--bkb-surfaceAlt)",
          border: "1px solid var(--bkb-border)",
          borderRadius: 6,
          fontSize: 12,
          color: "var(--bkb-textMuted)",
          lineHeight: 1.55,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--bkb-textSubtle)", marginBottom: 6 }}>
          Current strategy summary
        </div>
        <div>
          <strong>Question:</strong> {plan.research_question || "(none)"}
        </div>
        <div style={{ marginTop: 4 }}>
          <strong>Queries:</strong> {plan.pubmed_queries.length} PubMed
          {plan.biorxiv_queries.length > 0 && ` · ${plan.biorxiv_queries.length} bioRxiv`}
        </div>
        {plan.mesh_terms.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <strong>MeSH:</strong> {plan.mesh_terms.slice(0, 6).join(", ")}
            {plan.mesh_terms.length > 6 && ` … (+${plan.mesh_terms.length - 6} more)`}
          </div>
        )}
      </div>

      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
          What should change?
        </label>
        <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginBottom: 8 }}>
          Be specific — the agent rewrites queries, MeSH terms, and rationale based on this. Examples:
          tighten to RCTs only, restrict by date range, drop a database, expand a population.
        </div>
        <textarea
          className="bkb-input"
          value={feedback}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          disabled={isPending}
          autoFocus
          placeholder="e.g. Limit to randomized controlled trials published 2020 onwards. Drop bioRxiv — we only want peer-reviewed. Add explicit MeSH terms for adverse events."
          style={{
            width: "100%",
            fontFamily: FONTS.body,
            fontSize: 13,
            lineHeight: 1.5,
            resize: "vertical",
            minHeight: 140,
          }}
        />
        <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", marginTop: 4, textAlign: "right" }}>
          {feedback.length} character{feedback.length === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--bkb-textSubtle)",
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

function QueryList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items.length) {
    return (
      <p style={{ fontSize: 12, color: "var(--bkb-textSubtle)", margin: "6px 0 0" }}>{emptyText}</p>
    );
  }
  return (
    <ol
      style={{
        listStyle: "none",
        margin: "8px 0 0",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        counterReset: "q",
      }}
    >
      {items.map((q, i) => (
        <li
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "26px 1fr",
            gap: 8,
            alignItems: "start",
            padding: "8px 10px",
            background: "var(--bkb-surfaceAlt)",
            border: "1px solid var(--bkb-border)",
            borderRadius: 6,
          }}
        >
          <span
            className="bkb-mono"
            style={{
              fontSize: 10,
              color: "var(--bkb-textSubtle)",
              padding: "2px 6px",
              background: "var(--bkb-surface)",
              border: "1px solid var(--bkb-border)",
              borderRadius: 4,
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            {i + 1}
          </span>
          <code
            className="bkb-mono"
            style={{
              fontSize: 11.5,
              color: "var(--bkb-text)",
              lineHeight: 1.55,
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {q}
          </code>
        </li>
      ))}
    </ol>
  );
}

function ChipList({ items, accent = "muted" }: { items: string[]; accent?: "primary" | "muted" }) {
  const colors =
    accent === "primary"
      ? { border: "var(--bkb-primary)", color: "var(--bkb-primary)" }
      : { border: "var(--bkb-border)", color: "var(--bkb-textMuted)" };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
      {items.map((t) => (
        <span
          key={t}
          className="bkb-chip"
          style={{ fontSize: 10, borderColor: colors.border, color: colors.color }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
