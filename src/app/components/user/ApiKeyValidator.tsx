"use client";

import { FONTS, Icon } from "@/src/app/components/design-system";

/**
 * UI for the OpenRouter API key configuration.
 *
 * Restyled to use the bkb design tokens (.bkb-card, .bkb-input, .bkb-btn,
 * --bkb-* CSS vars) so it visually matches the dashboard. Logic stays in
 * useApiKeyValidator; this component is purely presentational.
 *
 * The same key is reused across SIE, Resource extraction, and the dashboard
 * via the shared sessionStorage slot defined in useApiKeyValidator.ts.
 */
export function ApiKeyValidatorUI({
  apiKey,
  onApiKeyChange,
  isApiKeyValid,
  isValidatingKey,
  apiKeyError,
  successMessage,
  onValidate,
  onClear,
  warningMessage,
  sharedKeyStatus,
}: {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  isApiKeyValid: boolean;
  isValidatingKey: boolean;
  apiKeyError: string | null;
  successMessage: string | null;
  onValidate: () => void;
  onClear: () => void;
  warningMessage?: string;
  /** Effective key state — drives the "using shared key" banner. */
  sharedKeyStatus?: { source: "personal" | "shared" | "none"; last_4: string | null };
}) {
  const usingShared = sharedKeyStatus?.source === "shared" && !apiKey.trim();
  return (
    <>
      <div className="bkb-card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <h2
              style={{
                fontFamily: FONTS.display,
                fontSize: 20,
                margin: 0,
                letterSpacing: "-0.01em",
                fontWeight: 400,
              }}
            >
              OpenRouter API key
            </h2>
            <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", marginTop: 4 }}>
              Configured once — reused across NER extraction, resource extraction, and the dashboard.
            </div>
          </div>
          {isApiKeyValid && !usingShared && (
            <span
              className="bkb-chip"
              style={{ borderColor: "var(--bkb-accent)", color: "var(--bkb-accent)", background: "transparent" }}
            >
              <Icon name="check" size={11} /> Validated
            </span>
          )}
          {usingShared && (
            <span
              className="bkb-chip"
              style={{ borderColor: "var(--bkb-primary)", color: "var(--bkb-primary)", background: "transparent" }}
            >
              <Icon name="shield" size={11} /> Shared admin key in use
            </span>
          )}
        </div>

        {usingShared && (
          <div
            style={{
              padding: "10px 12px",
              marginBottom: 12,
              fontSize: 12,
              color: "var(--bkb-text)",
              background: "color-mix(in oklch, var(--bkb-primary), transparent 92%)",
              border: "1px solid color-mix(in oklch, var(--bkb-primary), transparent 70%)",
              borderRadius: 6,
              lineHeight: 1.5,
            }}
          >
            Your workflows are using the <strong>shared admin-provided</strong> OpenRouter key
            {sharedKeyStatus?.last_4 ? <> (<span style={{ fontFamily: FONTS.mono }}>•••• {sharedKeyStatus.last_4}</span>)</> : null}.
            Paste your own key below and validate to override it for this session.
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={usingShared ? "Paste your own key to override the shared one…" : "sk-or-v1-…"}
            className="bkb-input"
            style={{ flex: "1 1 280px", fontFamily: FONTS.mono }}
          />
          <button
            type="button"
            onClick={onValidate}
            disabled={isValidatingKey || !apiKey.trim()}
            className="bkb-btn bkb-btn-primary"
          >
            {isValidatingKey ? <Icon name="sync" size={12} /> : <Icon name="check" size={12} />}
            {isValidatingKey ? "Validating…" : "Validate"}
          </button>
          {isApiKeyValid && apiKey.trim() && !usingShared && (
            <button
              type="button"
              onClick={onClear}
              className="bkb-btn bkb-btn-ghost"
              style={{ borderColor: "var(--bkb-danger)", color: "var(--bkb-danger)" }}
            >
              <Icon name="x" size={12} /> Clear
            </button>
          )}
        </div>

        {apiKeyError && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              fontSize: 12,
              color: "var(--bkb-danger)",
              background: "color-mix(in oklch, var(--bkb-danger), transparent 92%)",
              border: "1px solid color-mix(in oklch, var(--bkb-danger), transparent 70%)",
              borderRadius: 6,
            }}
          >
            {apiKeyError}
          </div>
        )}
        {isApiKeyValid && !usingShared && (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--bkb-accent)" }}>
            ✓ {successMessage || "API key validated. You can now process documents."}
          </div>
        )}
      </div>

      {!isApiKeyValid && warningMessage && (
        <div
          className="bkb-card"
          style={{
            padding: 14,
            marginBottom: 20,
            background: "color-mix(in oklch, var(--bkb-publication), transparent 92%)",
            borderColor: "color-mix(in oklch, var(--bkb-publication), transparent 65%)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--bkb-publication)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="info" size={12} /> {warningMessage}
          </div>
        </div>
      )}
    </>
  );
}
