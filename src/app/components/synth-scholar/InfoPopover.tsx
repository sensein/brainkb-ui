"use client";

/**
 * InfoPopover — small "(i)" affordance that reveals a short description
 * (and an optional reference link) for a form field.
 *
 * Usage:
 *
 *   <label>
 *     Population
 *     <InfoPopover
 *       title="P — Population"
 *       description="Who or what is being studied: condition, demographic, or sample group."
 *       link={{ href: "https://www.cochranelibrary.com/about-pico", label: "PICO at Cochrane" }}
 *     />
 *   </label>
 *
 * Click-triggered (not hover) so it works on touch devices and lets users
 * copy-paste the description / click the link without it disappearing.
 */

import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/app/components/ui/popover";
import { Icon } from "@/src/app/components/design-system";

export type InfoLink = { href: string; label?: string };

type Props = {
  title?: string;
  description: React.ReactNode;
  link?: InfoLink;
  /** Visually hide the icon and use the wrapped child as the trigger. */
  asChild?: boolean;
  children?: React.ReactNode;
};

export function InfoPopover({ title, description, link, asChild, children }: Props) {
  const trigger = asChild ? (
    children
  ) : (
    <button
      type="button"
      className="bkb-info-pop"
      aria-label={title ? `Info: ${title}` : "Field info"}
      style={{
        background: "transparent",
        border: "none",
        cursor: "help",
        padding: 0,
        marginLeft: 6,
        color: "var(--bkb-textSubtle)",
        verticalAlign: "middle",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <Icon name="info" size={13} />
    </button>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="bkb-card"
        style={{
          padding: 12,
          maxWidth: 320,
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--bkb-textMuted)",
          background: "var(--bkb-surface)",
          border: "1px solid var(--bkb-border)",
        }}
        sideOffset={6}
      >
        {title && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--bkb-textSubtle)",
              marginBottom: 6,
            }}
          >
            {title}
          </div>
        )}
        <div>{description}</div>
        {link && (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 8,
              fontSize: 11,
              color: "var(--bkb-accent)",
              textDecoration: "underline",
            }}
          >
            {link.label ?? "Learn more"} ↗
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}
