"use client";

import { useState } from "react";
import Link from "next/link";
import { useActiveOrganization } from "@/lib/useActiveOrganization";

/** Sidebar dropdown for picking the active Agency Workspace — see useActiveOrganization for the persistence/scoping mechanics. */
export function WorkspaceSwitcher() {
  const { organizations, activeOrganization, loading, switchOrganization } = useActiveOrganization();
  const [open, setOpen] = useState(false);

  if (loading || organizations.length === 0) return null;

  return (
    <div className="relative mb-3 px-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-sm text-zinc-200 hover:border-zinc-700"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: activeOrganization?.primaryColor ?? "#71717a" }}
          />
          <span className="truncate">{activeOrganization ? activeOrganization.name : "All Workspaces"}</span>
        </span>
        <span className="text-xs text-zinc-500">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full z-20 mt-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              switchOrganization(null);
            }}
            className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm ${
              !activeOrganization ? "bg-amber-400/20 text-amber-300" : "text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            All Workspaces
          </button>
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => {
                setOpen(false);
                switchOrganization(org.id);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm ${
                activeOrganization?.id === org.id ? "bg-amber-400/20 text-amber-300" : "text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: org.primaryColor ?? "#71717a" }} />
              <span className="truncate">{org.name}</span>
              <span className="ml-auto text-[10px] uppercase text-zinc-500">{org.role}</span>
            </button>
          ))}
          <div className="mt-1 border-t border-zinc-800 pt-1">
            <Link
              href="/workspaces"
              onClick={() => setOpen(false)}
              className="block rounded-md px-2.5 py-1.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            >
              Manage Workspaces…
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
