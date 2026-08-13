"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogIn } from "lucide-react";
import { env } from "@/src/config/env";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.96 3.22 9.16 7.69 10.64.56.1.77-.24.77-.54 0-.27-.01-1.16-.02-2.1-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1.0 1.72 2.64 1.22 3.29.94.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.58 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.77 10.77 0 015.64 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.8 1.16 3.03 0 4.34-2.63 5.3-5.14 5.57.4.35.76 1.03.76 2.08 0 1.5-.01 2.71-.01 3.08 0 .3.2.65.78.54 4.46-1.49 7.68-5.69 7.68-10.64C23.25 5.48 18.27.5 12 .5z" />
    </svg>
  );
}

function OrcidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="512" cy="512" r="512" fill="#A6CE39" />
      <path
        d="M373.7 709.3h-50.4V358.5h50.4v350.8zm74-350.8h136.2c129.7 0 186.7 92.7 186.7 175.5 0 90.1-70.4 175.5-186 175.5H447.7v-351zm50.4 305.6h80.2c114.3 0 140.5-86.8 140.5-130 0-70.4-44.9-130-143.1-130h-77.6v260zM381.6 285.5c0 18-14.7 33.1-33.1 33.1-18.3 0-33.1-15.1-33.1-33.1 0-18.3 14.7-33.1 33.1-33.1 18.3 0 33.1 15.1 33.1 33.1z"
        fill="#fff"
      />
    </svg>
  );
}

function GlobusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#0052A2" />
      <path
        d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 1.5c1.04 0 2.27 1.27 3 3.5H9c.73-2.23 1.96-3.5 3-3.5zM5.5 12c0-.7.1-1.37.27-2H8.1A18 18 0 008 12c0 .68.03 1.34.1 2H5.77a6.5 6.5 0 01-.27-2zm1.05 3.5h2.18c.3 1.34.74 2.5 1.27 3.34A6.55 6.55 0 016.55 15.5zM12 18.5c-1.04 0-2.27-1.27-3-3.5h6c-.73 2.23-1.96 3.5-3 3.5zm3.32-5H8.68a16.5 16.5 0 010-3h6.64a16.5 16.5 0 010 3zm-1.32 5.34c.53-.84.97-2 1.27-3.34h2.18a6.55 6.55 0 01-3.45 3.34zm4.23-4.84H15.9c.07-.66.1-1.32.1-2 0-.68-.03-1.34-.1-2h2.33a6.5 6.5 0 010 4zm-2.55-5.5c-.3-1.34-.74-2.5-1.27-3.34a6.55 6.55 0 013.45 3.34h-2.18zM10 5.16c-.53.84-.97 2-1.27 3.34H6.55A6.55 6.55 0 0110 5.16z"
        fill="#fff"
      />
    </svg>
  );
}

type ProviderInfo = {
  name: "github" | "orcid" | "globus" | string;
  configured: boolean;
  supports_pkce: boolean;
};

const PROVIDER_LABEL: Record<string, string> = {
  github: "GitHub",
  orcid: "ORCID",
  globus: "Globus",
};

function ProviderIcon({ provider, className }: { provider: string; className?: string }) {
  if (provider === "github") return <GithubIcon className={className} />;
  if (provider === "orcid") return <OrcidIcon className={className} />;
  if (provider === "globus") return <GlobusIcon className={className} />;
  return null;
}

async function startOAuthFlow(provider: string) {
  const base = env.userManagementApiBase;
  const redirectAfterLogin = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
  const res = await fetch(
    `${base}/api/auth/${provider}/login?redirect_after_login=${encodeURIComponent(redirectAfterLogin)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to start ${provider} login: ${res.status} ${body}`);
  }
  const data = await res.json();
  if (!data?.authorize_url) throw new Error(`No authorize_url returned for ${provider}`);
  window.location.href = data.authorize_url;
}

export default function SignInButtons() {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${env.userManagementApiBase}/api/auth/providers`, { cache: "no-store" });
        if (!res.ok) throw new Error(`providers: HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setProviders(data?.providers ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load providers");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onPick = async (name: string) => {
    setLoading(name);
    setError(null);
    try {
      await startOAuthFlow(name);
    } catch (e: any) {
      setError(e?.message || `Failed to start ${name} login`);
      setLoading(null);
    }
  };

  // Collapse the slot entirely while loading, when the backend can't be
  // reached, or when no provider is configured. We don't render a placeholder.
  if (providers === null) return null;
  const configured = providers.filter((p) => p.configured);
  if (configured.length === 0) return null;

  const triggerClass =
    "inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 shadow-sm transition-colors focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-60 disabled:cursor-not-allowed";

  // Single provider: render a labeled button directly (no menu).
  if (configured.length === 1) {
    const p = configured[0];
    const label = PROVIDER_LABEL[p.name] ?? p.name;
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => onPick(p.name)}
          disabled={loading !== null}
          className={triggerClass}
          aria-label={`Sign in with ${label}`}
        >
          {loading === p.name ? (
            <Spinner />
          ) : (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/15">
              <ProviderIcon provider={p.name} className="w-3.5 h-3.5" />
            </span>
          )}
          <span>Sign in</span>
        </button>
        {error && <span className="text-[11px] text-red-600 max-w-[220px] text-right">{error}</span>}
      </div>
    );
  }

  // Multiple providers: a single "Sign in" trigger that opens a dropdown.
  return (
    <div ref={wrapperRef} className="relative flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading !== null}
        className={triggerClass}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <LogIn className="w-4 h-4" aria-hidden="true" />
        <span>Sign in</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 min-w-[220px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden z-50"
        >
          <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
            Continue with
          </div>
          <ul className="py-1">
            {configured.map((p) => {
              const label = PROVIDER_LABEL[p.name] ?? p.name;
              const isLoading = loading === p.name;
              return (
                <li key={p.name}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => onPick(p.name)}
                    disabled={loading !== null}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      {isLoading ? <DarkSpinner /> : <ProviderIcon provider={p.name} className="w-4 h-4" />}
                    </span>
                    <span className="flex-1 text-left">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}

function Spinner() {
  return <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />;
}

function DarkSpinner() {
  return <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-200 animate-spin" aria-hidden="true" />;
}
