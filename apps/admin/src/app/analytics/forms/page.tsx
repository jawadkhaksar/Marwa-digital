"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type FormFieldAnalyticsEntry } from "@/lib/api";

export default function FormAnalyticsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <FormAnalyticsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function FormAnalyticsContent() {
  const [forms, setForms] = useState<string[]>([]);
  const [formId, setFormId] = useState("");
  const [fields, setFields] = useState<FormFieldAnalyticsEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.getFormFieldAnalytics(formId || undefined);
        if (cancelled) return;
        setForms(res.forms);
        setFields(res.fields);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load form analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const chartData = [...fields].sort((a, b) => b.abandonmentRate - a.abandonmentRate).slice(0, 15);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Form Field Abandonment</h1>
      <p className="mt-1 text-sm text-zinc-300">Which fields visitors focus on but then leave the form without submitting.</p>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <label className="text-xs text-zinc-500">Form</label>
        <select
          value={formId}
          onChange={(e) => setFormId(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
        >
          <option value="">All Forms</option>
          {forms.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Abandonment Rate by Field</h2>
        {!loading && chartData.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">No field interaction data recorded yet.</p>
        ) : (
          <div className="mt-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#71717a" }} unit="%" />
                <YAxis type="category" dataKey="fieldName" width={120} tick={{ fontSize: 11, fill: "#a1a1aa" }} />
                <Tooltip
                  cursor={{ fill: "rgba(251, 191, 36, 0.06)" }}
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [`${value}%`, "Abandonment Rate"]}
                />
                <Bar dataKey="abandonmentRate" name="Abandonment Rate" fill="#f472b6" radius={[0, 4, 4, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="mt-6 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2">Form</th>
              <th className="px-4 py-2">Field</th>
              <th className="px-4 py-2">Interactions</th>
              <th className="px-4 py-2">Abandonments</th>
              <th className="px-4 py-2">Rate</th>
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  No field interaction data recorded yet.
                </td>
              </tr>
            )}
            {[...fields]
              .sort((a, b) => b.abandonmentRate - a.abandonmentRate)
              .map((f) => (
                <tr key={`${f.formId}-${f.fieldId}`} className="border-t border-zinc-800">
                  <td className="px-4 py-2 text-xs text-zinc-400">{f.formId}</td>
                  <td className="px-4 py-2">{f.fieldName}</td>
                  <td className="px-4 py-2">{f.interactions}</td>
                  <td className="px-4 py-2">{f.abandonments}</td>
                  <td className="px-4 py-2">{f.abandonmentRate}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
