"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getActiveOrganizationId, setActiveOrganizationId, type Organization } from "@/lib/api";

/**
 * Loads every workspace the signed-in user belongs to and tracks which one
 * is active (persisted in localStorage — see lib/api.ts's
 * getActiveOrganizationId/setActiveOrganizationId, sent as the
 * `x-organization-id` header on every request from then on). No
 * Organizations ever created = an empty list here, and every admin route
 * keeps behaving exactly as it did before workspaces existed — see
 * packages/api/src/middleware/tenant.ts.
 */
export function useActiveOrganization() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Split from `reload` below so the mount effect doesn't call a function
  // that synchronously calls setState (react-hooks/set-state-in-effect) —
  // `loading` already starts `true`, so the initial fetch needs no
  // synchronous setLoading(true) of its own, only the "set" of the results.
  const fetchOrganizations = useCallback(() => {
    return api
      .getOrganizations()
      .then((orgs) => {
        setOrganizations(orgs);
        const stored = getActiveOrganizationId();
        // The stored workspace may have been deleted or the user removed
        // from it since last visit — fall back to no workspace selected
        // (the global view) rather than silently sending a header the
        // server will 403 on.
        if (stored && !orgs.some((o) => o.id === stored)) {
          setActiveOrganizationId(null);
          setActiveId(null);
        } else {
          setActiveId(stored);
        }
      })
      .catch(() => setOrganizations([]))
      .finally(() => setLoading(false));
  }, []);

  // Manual re-fetch (e.g. after creating a workspace) — safe to call from
  // event handlers, just not from an effect body (see fetchOrganizations above).
  const reload = useCallback(() => {
    setLoading(true);
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const switchOrganization = useCallback((organizationId: string | null) => {
    setActiveOrganizationId(organizationId);
    setActiveId(organizationId);
    // Every list/detail query on the page currently open was fetched under
    // the previous workspace's scope — reloading is the simplest way to
    // guarantee nothing stale from another workspace stays on screen.
    window.location.reload();
  }, []);

  const activeOrganization = organizations.find((o) => o.id === activeId) ?? null;

  return { organizations, activeOrganization, loading, switchOrganization, reload };
}
