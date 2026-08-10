"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type SetupHelperResponse } from "@/lib/api";

export default function SetupHelperPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <SetupHelperContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function SetupHelperContent() {
  const [data, setData] = useState<SetupHelperResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSetupHelper().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-zinc-500">Loading…</p>;

  const groups = [...new Set(data.checklist.map((c) => c.group))];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Setup Helper</h1>
      <p className="mt-1 text-sm text-zinc-300">
        {data.completedCount} of {data.totalCount} setup steps complete.
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-amber-400 transition-all"
          style={{ width: `${(data.completedCount / data.totalCount) * 100}%` }}
        />
      </div>

      <div className="mt-6 flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group}>
            <h2 className="mb-2 text-sm font-semibold text-zinc-400">{group}</h2>
            <div className="flex flex-col gap-2">
              {data.checklist
                .filter((c) => c.group === group)
                .map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                        item.done ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700/40 text-zinc-500"
                      }`}
                    >
                      {item.done ? "✓" : "✗"}
                    </span>
                    <span className={item.done ? "text-zinc-200" : "text-zinc-400"}>{item.label}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
