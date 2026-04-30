"use client";

/**
 * PlanConfirmDialog — review the AI-generated search strategy before the
 * pipeline proceeds. Built on Radix Dialog (already in deps) styled with
 * brainkb-ui's bkb-* design tokens, NOT shadcn — keeps the surface
 * consistent with the rest of the app.
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

  if (!plan) return null;

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 50,
          }}
        />
        <Dialog.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--bkb-surface)",
            border: "1px solid var(--bkb-border)",
            borderRadius: 8,
            padding: 24,
            width: "min(680px, 92vw)",
            maxHeight: "85vh",
            overflowY: "auto",
            zIndex: 51,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <Dialog.Title style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em", margin: 0 }}>
              Review search plan
            </Dialog.Title>
            <span className="bkb-chip" style={{ fontSize: 10 }}>
              Iteration {iteration} / {maxIterations}
            </span>
          </div>
          <Dialog.Description style={{ fontSize: 13, color: "var(--bkb-textMuted)", marginTop: 6, marginBottom: 16 }}>
            The AI has generated a search strategy. Approve to proceed, or send revisions back for another iteration.
          </Dialog.Description>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {plan.research_question && (
              <Section title="Research question">
                <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", margin: 0 }}>{plan.research_question}</p>
              </Section>
            )}
            <Section title="PubMed queries">
              <QueryList items={plan.pubmed_queries} emptyText="No PubMed queries" />
            </Section>
            {plan.biorxiv_queries.length > 0 && (
              <Section title="bioRxiv / preprint queries">
                <QueryList items={plan.biorxiv_queries} emptyText="None" />
              </Section>
            )}
            {plan.mesh_terms.length > 0 && (
              <Section title="MeSH terms">
                <ChipList items={plan.mesh_terms} />
              </Section>
            )}
            {plan.key_concepts.length > 0 && (
              <Section title="Key concepts">
                <ChipList items={plan.key_concepts} />
              </Section>
            )}
            <Section title="Rationale">
              <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.5, margin: 0 }}>{plan.rationale}</p>
            </Section>
          </div>

          {mode === "revise" && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--bkb-border)" }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Feedback for revision</div>
              <textarea
                className="bkb-input"
                placeholder="e.g. Focus on randomized controlled trials only, include studies from 2015 onwards…"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                disabled={isPending}
                style={{ width: "100%", fontFamily: FONTS.body, resize: "vertical" }}
              />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
            {mode === "review" ? (
              <>
                <button
                  className="bkb-btn bkb-btn-ghost"
                  onClick={() => setMode("revise")}
                  disabled={isPending || iteration >= maxIterations}
                  title={iteration >= maxIterations ? "Max iterations reached" : "Send back with feedback"}
                >
                  <Icon name="arrow" size={11} /> Revise
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
                  <Icon name="check" size={11} /> {isPending ? "Processing…" : "Approve & start"}
                </button>
              </>
            ) : (
              <>
                <button
                  className="bkb-btn bkb-btn-ghost"
                  onClick={() => setMode("review")}
                  disabled={isPending}
                >
                  Back
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
                >
                  {isPending ? "Revising…" : "Submit feedback"}
                </button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--bkb-textSubtle)", marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function QueryList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items.length) {
    return <p style={{ fontSize: 12, color: "var(--bkb-textSubtle)", margin: 0 }}>{emptyText}</p>;
  }
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((q, i) => (
        <li
          key={i}
          className="bkb-mono"
          style={{
            fontSize: 11,
            background: "var(--bkb-surfaceAlt)",
            color: "var(--bkb-textMuted)",
            padding: "4px 8px",
            borderRadius: 4,
          }}
        >
          {q}
        </li>
      ))}
    </ul>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {items.map((t) => (
        <span key={t} className="bkb-chip" style={{ fontSize: 10 }}>
          {t}
        </span>
      ))}
    </div>
  );
}
