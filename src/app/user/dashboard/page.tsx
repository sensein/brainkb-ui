"use client";

/**
 * /user/dashboard — user dashboard.
 *
 * Two tabs: Tools (default) and API keys. The mocked Overview / Multi-agent
 * workflows / Query history / Contributions sections from the prototype were
 * removed because they showed sample data with no real backend wiring.
 *
 * The welcome banner pulls identity + role from /api/users/me via
 * useCurrentUser. The Tools tab batches page-access checks against the
 * usermanagement_service so each workflow card reflects the live access
 * decision for the signed-in user. The API keys tab models a single key
 * per user that is reused across every enabled tool (placeholder until the
 * key issuance endpoint lands).
 */

import React from "react";
import Link from "next/link";
import { FONTS, Icon, Theme } from "@/src/app/components/design-system";
import { useCurrentUser } from "@/src/hooks/useCurrentUser";
import { usePageAccessBatch } from "@/src/hooks/usePageAccess";
import { TOOL_REGISTRY } from "@/src/config/toolRegistry";
import { ENABLE_PAGE_ACCESS_GATE } from "@/src/config/featureFlags";
import { useApiKeyValidator } from "@/src/app/components/user/useApiKeyValidator";
import { ApiKeyValidatorUI } from "@/src/app/components/user/ApiKeyValidator";

type DashTab = "tools" | "keys";

// ─── Tools tab ────────────────────────────────────────────────────────────

function DashTools() {
  // Per-card access check via a single batched call to /api/access/pages.
  // Default behaviour when no entry exists in the backend is "denied" — i.e.
  // every workflow is off until an admin enables it through /admin/page-access.
  // ENABLE_PAGE_ACCESS_GATE=false short-circuits this for local dev.
  // The hook auto-revalidates on tab focus so an admin's grant in another tab
  // shows up here without forcing a reload; the Refresh button is an explicit
  // escape hatch for the same-tab case.
  const keys = TOOL_REGISTRY.map((t) => t.pageKey);
  const { loading, allowedMap, refresh } = usePageAccessBatch(keys);
  const bypass = !ENABLE_PAGE_ACCESS_GATE;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: FONTS.display, fontSize: 24, margin: 0, letterSpacing: "-0.01em", fontWeight: 400 }}>
            Workflow tools
          </h2>
          <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", marginTop: 4 }}>
            Tools are off by default — an admin grants role- or user-level access through the page-access surface.
          </div>
        </div>
        <button
          className="bkb-btn bkb-btn-ghost"
          onClick={refresh}
          disabled={loading}
          title="Re-check tool access — useful right after an admin grants you a new tool."
          style={{ padding: "4px 10px", fontSize: 12 }}
        >
          <Icon name="arrow" size={11} /> {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {TOOL_REGISTRY.map((t) => {
          const allowed = bypass ? true : allowedMap[t.pageKey];
          const ready = bypass ? true : !loading;
          const inner = (
            <div
              className="bkb-card"
              style={{
                padding: 18,
                opacity: ready && !allowed ? 0.55 : 1,
                cursor: ready ? (allowed ? "pointer" : "not-allowed") : "default",
                transition: "all .15s",
                height: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    background: `color-mix(in oklch, ${t.color}, transparent 90%)`,
                    color: t.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={t.icon} size={16} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{t.title}</div>
                <span
                  className="bkb-chip"
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    borderColor: ready
                      ? allowed
                        ? "var(--bkb-accent)"
                        : "var(--bkb-textSubtle)"
                      : "var(--bkb-border)",
                    color: ready ? (allowed ? "var(--bkb-accent)" : "var(--bkb-textMuted)") : "var(--bkb-textMuted)",
                  }}
                >
                  {ready ? (allowed ? "available" : "disabled") : "checking…"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", lineHeight: 1.5, marginBottom: 12 }}>
                {t.description}
              </div>
              <div className="bkb-mono" style={{ fontSize: 10, color: "var(--bkb-textSubtle)" }}>
                {t.pageKey}
              </div>
            </div>
          );
          return allowed ? (
            <Link key={t.pageKey} href={t.href} style={{ textDecoration: "none", color: "inherit" }}>
              {inner}
            </Link>
          ) : (
            <div key={t.pageKey} title="Disabled — request access from an admin">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── API key tab — manage the shared OpenRouter key ──────────────────────

function DashKeys() {
  const v = useApiKeyValidator();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: FONTS.display, fontSize: 24, margin: 0, letterSpacing: "-0.01em", fontWeight: 400 }}>
            API key
          </h2>
          <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", marginTop: 4, maxWidth: 640 }}>
            Configure your OpenRouter API key once here. It is reused by every workflow tool the admin has enabled
            for you (NER extraction, Resource extraction, …).
          </div>
        </div>
      </div>

      <ApiKeyValidatorUI
        apiKey={v.apiKey}
        onApiKeyChange={v.setApiKey}
        isApiKeyValid={v.isApiKeyValid}
        isValidatingKey={v.isValidatingKey}
        apiKeyError={v.apiKeyError}
        successMessage={v.successMessage}
        onValidate={v.validateApiKey}
        onClear={v.handleClear}
        sharedKeyStatus={v.sharedKeyStatus}
        warningMessage="No key configured yet — workflow tools that need it will refuse to run until you validate one."
      />

      <div
        style={{
          fontSize: 11,
          color: "var(--bkb-textSubtle)",
          marginTop: 4,
        }}
      >
        Stored in <span className="bkb-mono">sessionStorage</span> for this browser session only — sign out or close
        the tab to forget it.
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, loading } = useCurrentUser();
  const [tab, setTab] = React.useState<DashTab>("tools");

  const greetingName = React.useMemo(() => {
    if (loading) return "—";
    if (!user) return "Guest";
    if (user.name) return user.name.split(/\s+/)[0];
    return user.email.split("@")[0];
  }, [user, loading]);

  const subtitle = React.useMemo(() => {
    if (!user) return "Sign in to see your tools.";
    const role = user.roles?.[0] ?? "Member";
    return `${role} · ${user.auth_source ?? "—"}`;
  }, [user]);

  return (
    <Theme theme="light" style={{ background: "#f0eee9", minHeight: "calc(100vh - 64px)" }}>
      <div style={{ minHeight: "100%", background: "var(--bkb-bg)" }}>
        <div style={{ background: "var(--bkb-surface)", borderBottom: "1px solid var(--bkb-border)" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px 0" }}>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--bkb-textSubtle)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Dashboard
                </div>
                <h1 style={{ fontFamily: FONTS.display, fontSize: 40, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
                  Welcome back, <em>{greetingName}</em>
                </h1>
                <div style={{ fontSize: 13, color: "var(--bkb-textMuted)", marginTop: 4 }}>{subtitle}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 2, marginBottom: -1 }}>
              {(
                [
                  { id: "tools", l: "Tools" },
                  { id: "keys", l: "API key" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    background: "transparent",
                    color: tab === t.id ? "var(--bkb-text)" : "var(--bkb-textMuted)",
                    borderBottom: `2px solid ${tab === t.id ? "var(--bkb-primary)" : "transparent"}`,
                    fontSize: 13,
                    fontWeight: tab === t.id ? 500 : 400,
                    cursor: "pointer",
                    fontFamily: FONTS.body,
                  }}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 32px" }}>
          {tab === "tools" && <DashTools />}
          {tab === "keys" && <DashKeys />}
        </div>
      </div>
    </Theme>
  );
}
