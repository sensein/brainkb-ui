"use client";

/**
 * Turns an expired backend credential into one visible, app-wide sign-out.
 *
 * The NextAuth session cookie and the backend JWT it carries have independent
 * lifetimes. When the backend side lapses (refresh token expired or revoked, account
 * deactivated), lib/auth.ts drops the token and sets `session.error =
 * "SessionExpired"` — but the cookie itself is still valid, so `useSession()` keeps
 * reporting `authenticated`. Without this component the user stays "signed in" while
 * every service call fails on its own terms: SynthScholar logs `[Auth] Failed to get
 * auth token for ml`, the knowledge-base pages fail their query-service exchange, the
 * dashboard fails /api/users/me. Same cause, one message per feature, none of them
 * actionable.
 *
 * Mounted once inside SessionProvider (src/app/layout.tsx) so it covers every route.
 */

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function SessionExpiryWatcher() {
  const { data: session, status } = useSession();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if ((session as any)?.error !== "SessionExpired") return;
    setExpired(true);
    // redirect: false — the user keeps their place, and the navbar reverts to the
    // sign-in buttons on its own. Clearing the cookie also stops the loop: the next
    // render has no session, so this effect does not fire again.
    void signOut({ redirect: false });
  }, [session, status]);

  if (!expired) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3
                 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg"
    >
      <span className="text-sm text-amber-900">
        Your session expired. Sign in again to continue.
      </span>
      <button
        onClick={() => setExpired(false)}
        className="text-sm font-medium text-amber-900 underline hover:no-underline"
      >
        Dismiss
      </button>
    </div>
  );
}
