"use client";

/**
 * ReviewActionsDropdown — split-button retry control for failed/cancelled reviews.
 *
 * Mirrors aep-knowledge-synthesis/ui/src/pages/PRISMAReview.tsx (~lines 1836–1898),
 * adapted to brainkb-ui's bkb-* design tokens and the local Icon component.
 *
 * The primary button performs the most useful default action:
 *   - "Resume from step N" when a checkpoint exists (last_completed_step > 0)
 *   - "Retry" otherwise
 *
 * The dropdown caret reveals all four options:
 *   1. Resume from step N         (resume: true) — only shown when step > 0
 *   2. Full restart               (resume: false)
 *   3. Retry (use cache)          (enable_cache: true)
 *   4. Retry (fresh search)       (enable_cache: false)
 */

import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/app/components/ui/dropdown-menu";
import { Icon } from "@/src/app/components/design-system";

type RetryBody = { enable_cache?: boolean; resume?: boolean };

type Props = {
  /** Step the pipeline last checkpointed at; 0 / undefined → no checkpoint. */
  lastCompletedStep?: number;
  /** True while a retry mutation is in flight (disables the buttons). */
  isPending: boolean;
  /** Caller wires this to `useRetryReview().mutate` for a specific reviewId. */
  onRetry: (body?: RetryBody) => void;
};

export function ReviewActionsDropdown({
  lastCompletedStep,
  isPending,
  onRetry,
}: Props) {
  const step = lastCompletedStep ?? 0;
  const canResume = step > 0;

  // Default click on the primary button = the most useful action: resume if
  // we have a checkpoint, otherwise plain retry.
  const primaryAction = () => {
    onRetry(canResume ? { resume: true } : undefined);
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "stretch" }}>
      {/* Primary button — left half of the split control */}
      <button
        className="bkb-btn bkb-btn-ghost"
        onClick={primaryAction}
        disabled={isPending}
        style={{
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          borderRight: "none",
        }}
        aria-label={canResume ? `Resume from step ${step}` : "Retry"}
      >
        <Icon name={canResume ? "play" : "history"} size={11} />
        {canResume ? `Resume from step ${step}` : "Retry"}
      </button>

      {/* Caret — right half opens the menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="bkb-btn bkb-btn-ghost"
            disabled={isPending}
            style={{
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              padding: "0 8px",
            }}
            aria-label="More retry options"
          >
            <Icon name="down" size={11} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canResume && (
            <DropdownMenuItem onClick={() => onRetry({ resume: true })}>
              <Icon name="play" size={12} />
              <span style={{ marginLeft: 8 }}>Resume from step {step}</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onRetry({ resume: false })}>
            <Icon name="history" size={12} />
            <span style={{ marginLeft: 8 }}>Full restart</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRetry({ enable_cache: true })}>
            <span style={{ marginLeft: 20 }}>Retry (use cache)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRetry({ enable_cache: false })}>
            <span style={{ marginLeft: 20 }}>Retry (fresh search)</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
