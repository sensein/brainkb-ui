"use client";

/**
 * Provides a TanStack QueryClient to descendants. Mounted at the root layout
 * so any client component (including pages outside /user/synth-scholar) can
 * use react-query hooks if needed in the future.
 *
 * The retry policy keeps default behaviour for queries (1 retry on failure)
 * but disables retries on mutations — mutations represent user-triggered
 * write actions and a silent retry can paper over surfaced errors.
 */

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000 },
          mutations: { retry: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
