"use client";

/**
 * Multi-select dropdown for one browse-table column: a button that opens a
 * checklist of the column's values with their counts. Stays compact however
 * many values a column grows to, unlike a row of chips.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { COLORS } from "../components/marketing/tokens";

export type FilterOption = { value: string; label: string; count: number };

export default function FilterMenu({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const active = selected.size > 0;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: active ? COLORS.ink : COLORS.cardBg,
          color: active ? COLORS.pageBg : COLORS.body,
          border: `1px solid ${active ? COLORS.ink : COLORS.border}`,
          borderRadius: 999,
          padding: "6px 12px 6px 14px",
          font: "500 12px var(--font-plex-mono)",
          cursor: "pointer",
        }}
      >
        {label}
        {active && <span style={{ opacity: 0.7 }}>· {selected.size}</span>}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div
          role="group"
          aria-label={`Filter by ${label}`}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 20,
            minWidth: 260,
            maxWidth: "min(360px, calc(100vw - 32px))",
            maxHeight: 320,
            overflowY: "auto",
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            padding: 6,
          }}
        >
          {options.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                borderRadius: 6,
                fontSize: 14,
                color: COLORS.body,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => toggle(opt.value)}
                style={{ accentColor: COLORS.accentPurple }}
              />
              <span style={{ flex: 1 }}>{opt.label}</span>
              <span style={{ font: "500 12px var(--font-plex-mono)", color: COLORS.muted }}>{opt.count}</span>
            </label>
          ))}
          {active && (
            <button
              onClick={() => onChange(new Set())}
              style={{
                width: "100%",
                marginTop: 4,
                padding: "7px 10px",
                border: "none",
                borderTop: `1px solid ${COLORS.border}`,
                background: "transparent",
                textAlign: "left",
                fontSize: 13,
                fontWeight: 500,
                color: COLORS.accent,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
