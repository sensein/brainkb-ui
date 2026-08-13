"use client";

/**
 * BrainKB design system — tokens, fonts, icons, and the <Theme> wrapper.
 *
 */

import React from "react";

export const TOKENS = {
  light: {
    bg: "oklch(0.985 0.004 85)",
    surface: "oklch(1 0 0)",
    surfaceAlt: "oklch(0.965 0.006 85)",
    border: "oklch(0.88 0.008 85)",
    borderStrong: "oklch(0.78 0.012 85)",
    text: "oklch(0.20 0.012 220)",
    textMuted: "oklch(0.48 0.010 220)",
    textSubtle: "oklch(0.62 0.008 220)",
    primary: "oklch(0.32 0.045 195)",
    primaryInk: "oklch(0.98 0.004 85)",
    accent: "oklch(0.62 0.11 170)",
    agent: "oklch(0.58 0.13 165)",
    evidence: "oklch(0.55 0.14 285)",
    publication: "oklch(0.62 0.12 65)",
    danger: "oklch(0.55 0.18 28)",
    grid: "oklch(0.20 0.012 220 / 0.05)",
  },
  dark: {
    bg: "oklch(0.19 0.022 200)",
    surface: "oklch(0.23 0.025 200)",
    surfaceAlt: "oklch(0.26 0.028 200)",
    border: "oklch(0.34 0.025 200)",
    borderStrong: "oklch(0.42 0.028 200)",
    text: "oklch(0.96 0.006 85)",
    textMuted: "oklch(0.74 0.012 200)",
    textSubtle: "oklch(0.58 0.015 200)",
    primary: "oklch(0.68 0.13 170)",
    primaryInk: "oklch(0.18 0.022 200)",
    accent: "oklch(0.74 0.14 170)",
    agent: "oklch(0.74 0.14 165)",
    evidence: "oklch(0.72 0.13 285)",
    publication: "oklch(0.78 0.12 75)",
    danger: "oklch(0.68 0.18 28)",
    grid: "oklch(1 0 0 / 0.04)",
  },
  teal: {
    bg: "oklch(0.97 0.012 180)",
    surface: "oklch(1 0 0)",
    surfaceAlt: "oklch(0.94 0.018 180)",
    border: "oklch(0.86 0.022 180)",
    borderStrong: "oklch(0.74 0.030 180)",
    text: "oklch(0.22 0.035 200)",
    textMuted: "oklch(0.44 0.025 200)",
    textSubtle: "oklch(0.58 0.020 200)",
    primary: "oklch(0.38 0.065 190)",
    primaryInk: "oklch(0.98 0.008 85)",
    accent: "oklch(0.55 0.12 170)",
    agent: "oklch(0.52 0.13 165)",
    evidence: "oklch(0.50 0.14 285)",
    publication: "oklch(0.58 0.12 65)",
    danger: "oklch(0.55 0.18 28)",
    grid: "oklch(0.22 0.035 200 / 0.06)",
  },
} as const;

export type ThemeName = keyof typeof TOKENS;

export const FONTS = {
  display: '"Instrument Serif", "Times New Roman", Georgia, serif',
  body: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, Consolas, monospace',
};

export function Theme({
  theme = "light",
  children,
  style,
  className = "",
}: {
  theme?: ThemeName;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const t = TOKENS[theme] || TOKENS.light;
  const vars: Record<string, string> = {};
  Object.entries(t).forEach(([k, v]) => {
    vars[`--bkb-${k}`] = v;
  });
  return (
    <div
      className={`bkb ${className}`}
      style={{ ...(vars as React.CSSProperties), background: t.bg, color: t.text, ...style }}
    >
      {children}
    </div>
  );
}

type IconProps = {
  name: string;
  size?: number;
  style?: React.CSSProperties;
};

export const Icon: React.FC<IconProps> = ({ name, size = 16, style }) => {
  const paths: Record<string, React.ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    graph: (
      <>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="12" cy="18" r="2.5" />
        <path d="M7.5 7.5 10 16M16.5 7.5 14 16M8 6h8" />
      </>
    ),
    home: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
    dash: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
    agent: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
        <circle cx="6" cy="6" r="1.5" fill="currentColor" />
        <circle cx="18" cy="6" r="1.5" fill="currentColor" />
      </>
    ),
    evidence: (
      <>
        <path d="M9 4h6l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
        <path d="M14 4v4h5M8 13h8M8 17h5" />
      </>
    ),
    pub: <path d="M4 5a2 2 0 0 1 2-2h9v18H6a2 2 0 0 1-2-2zM15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />,
    project: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    person: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="14" r="4" />
        <path d="m11 11 9-9m-3 3 2 2m-4 0 2 2" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    upload: <path d="M12 16V4m-5 5 5-5 5 5M4 20h16" />,
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    down: <path d="m6 9 6 6 6-6" />,
    up: <path d="m18 15-6-6-6 6" />,
    plus: <path d="M12 5v14m-7-7h14" />,
    check: <path d="m5 12 5 5L20 7" />,
    x: <path d="M6 6l12 12M18 6 6 18" />,
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    filter: <path d="M3 5h18l-7 8v7l-4-2v-5z" />,
    sparkle: <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6" />,
    flow: (
      <>
        <rect x="2" y="4" width="6" height="6" rx="1" />
        <rect x="16" y="4" width="6" height="6" rx="1" />
        <rect x="9" y="14" width="6" height="6" rx="1" />
        <path d="M8 7h8M6 10v3a1 1 0 0 0 1 1h2M18 10v3a1 1 0 0 1-1 1h-2" />
      </>
    ),
    doc: (
      <>
        <path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M14 3v4h5M9 13h6M9 17h4" />
      </>
    ),
    sync: (
      <>
        <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
        <path d="M3 3v5h5M3 12a9 9 0 0 0 15 6.7L21 16" />
        <path d="M21 21v-5h-5" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
    star: <path d="m12 3 3 6 6 .9-4.5 4.3 1 6.3-5.5-3-5.5 3 1-6.3L3 9.9 9 9z" />,
    bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    play: <path d="M6 4v16l14-8z" fill="currentColor" />,
    pause: (
      <>
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </>
    ),
    chevron: <path d="m9 6 6 6-6 6" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="1" />
        <path d="M4 16V5a1 1 0 0 1 1-1h11" />
      </>
    ),
    bell: (
      <>
        <path d="M6 10a6 6 0 0 1 12 0v5l2 3H4l2-3z" />
        <path d="M10 21h4" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v5h1" />
      </>
    ),
    dots: (
      <>
        <circle cx="5" cy="12" r="1.2" fill="currentColor" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        <circle cx="19" cy="12" r="1.2" fill="currentColor" />
      </>
    ),
    sort: <path d="M8 4v16m0 0-3-3m3 3 3-3M16 20V4m0 0-3 3m3-3 3 3" />,
    lock: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    shield: <path d="M12 3 4 6v6c0 4.5 3.4 8.6 8 9 4.6-.4 8-4.5 8-9V6z" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {paths[name] || null}
    </svg>
  );
};

export const Logo: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 24, style }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
    <circle cx="8" cy="8" r="2.5" fill="var(--bkb-primary)" />
    <circle cx="24" cy="8" r="2.5" fill="var(--bkb-evidence)" />
    <circle cx="16" cy="24" r="2.5" fill="var(--bkb-agent)" />
    <circle cx="16" cy="14" r="1.5" fill="var(--bkb-publication)" />
    <path d="M8 8 L16 14 M24 8 L16 14 M16 14 L16 24" stroke="var(--bkb-textMuted)" strokeWidth="1" />
  </svg>
);

