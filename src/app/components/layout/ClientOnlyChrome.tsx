"use client";

// Client-only imports for the root layout. Next 16 no longer allows
// `ssr: false` in a Server Component, so the layout imports these from here.

import dynamic from "next/dynamic";

// Decides Navbar/Footer vs. standalone marketing pages based on route; see its own doc comment.
export const SiteChrome = dynamic(() => import("./SiteChrome"), { ssr: false });
export const CookieConsentBanner = dynamic(() => import("./CookieConsent"), { ssr: false });
