"use client";

import { useEffect, useState } from "react";
import { api, type SessionUser } from "@/lib/api";

export type CurrentUser = SessionUser;

/**
 * Client-side only — for gating nav/UI (hiding the Users link, redirecting
 * EDITOR out of ADMIN-only pages). The real enforcement is server-side
 * (requireRole("ADMIN") in packages/api's server.ts); this hook exists so
 * an EDITOR account isn't shown controls that will 403 anyway.
 */
export function useCurrentUser(): { user: CurrentUser | null; loading: boolean } {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getMe()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
