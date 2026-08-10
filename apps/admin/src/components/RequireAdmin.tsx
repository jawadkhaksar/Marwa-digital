"use client";

import type { ReactNode } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";

/**
 * Wrap ADMIN-only page content (Users, Settings) with this, inside
 * AuthGuard. Client-side only — a defense-in-depth UX nicety so an EDITOR
 * account sees a clear message instead of a page full of requests failing
 * with 403s; the real enforcement is requireRole("ADMIN") in packages/api's
 * server.ts.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useCurrentUser();

  if (loading) return null;

  if (user?.role !== "ADMIN") {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-6 text-sm text-amber-200">
        This section is only available to Admin accounts. Contact an administrator if you need access.
      </div>
    );
  }

  return <>{children}</>;
}
