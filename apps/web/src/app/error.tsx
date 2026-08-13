"use client";

import { useEffect } from "react";

/**
 * Route-segment error boundary — catches anything thrown while rendering a
 * Server Component under this tree, most commonly a fetch() to the API
 * failing (backend still booting, or down) since most pages don't wrap their
 * own data fetches in try/catch individually. Without this file, Next shows
 * its raw dev overlay and the page never renders anything at all; with it,
 * a booting/unreachable backend degrades to a retry screen instead of a hard
 * crash, in both dev and production.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <p className="text-sm font-semibold uppercase tracking-widest text-foreground/50">Something went wrong</p>
      <h1 className="max-w-lg text-2xl font-bold">
        {error.message === "fetch failed"
          ? "Couldn't reach the server. It may still be starting up."
          : "This page couldn't be rendered."}
      </h1>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
