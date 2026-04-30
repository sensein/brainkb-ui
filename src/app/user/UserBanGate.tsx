"use client";

/**
 * UserBanGate — wraps every /user/* page. If the backend reports the user as
 * suspended (403 account_suspended on /api/users/me), shows a clean notice
 * instead of letting individual tool pages 401-storm against their own
 * endpoints. The check piggybacks on `useCurrentUser`, which already runs
 * once per session via the cache, so this gate is essentially free.
 */

import React from "react";
import { useCurrentUser } from "@/src/hooks/useCurrentUser";
import { FONTS } from "@/src/app/components/design-system";

export function UserBanGate({ children }: { children: React.ReactNode }) {
  const { banned } = useCurrentUser();
  if (!banned) return <>{children}</>;
  return (
    <div style={{ maxWidth: 640, margin: "60px auto", padding: "0 36px" }}>
      <div
        className="bkb-card"
        style={{
          padding: 24,
          borderColor: "color-mix(in oklch, var(--bkb-danger), transparent 60%)",
          borderLeft: "3px solid var(--bkb-danger)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "var(--bkb-danger)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          Account suspended
        </div>
        <h1
          style={{
            fontFamily: FONTS.display,
            fontSize: 28,
            margin: 0,
            letterSpacing: "-0.02em",
            fontWeight: 400,
          }}
        >
          Your account has been suspended
        </h1>
        <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, marginTop: 12 }}>
          {banned.reason ? (
            <>An administrator suspended this account with the following reason: <em>{banned.reason}</em></>
          ) : (
            <>An administrator suspended this account.</>
          )}
          {banned.banned_at && (
            <>
              {" "}Effective{" "}
              <span style={{ fontFamily: FONTS.mono }}>
                {new Date(banned.banned_at).toLocaleString()}
              </span>.
            </>
          )}
        </p>
        <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, marginTop: 10 }}>
          You can still view public pages while signed in, but every authenticated action
          (uploads, extractions, profile edits) will be rejected by the backend until the
          suspension is lifted. If you believe this is an error, contact a platform administrator.
        </p>
      </div>
    </div>
  );
}
