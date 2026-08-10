"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { WorkflowTemplatePickerModal } from "@/components/WorkflowTemplatePickerModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { instantiateWorkflowTemplate, type WorkflowTemplate } from "@/lib/workflowTemplates";
import { api, type AutomationWorkflow, type WorkflowTriggerType } from "@/lib/api";

const TRIGGER_LABELS: Record<WorkflowTriggerType, string> = {
  FORM_SUBMITTED: "Form Submitted",
  TAG_ADDED: "Tag Applied",
  DEAL_STAGE_CHANGED: "Deal Stage Moved",
  SESSION_RAGE_CLICK: "Session Rage Click",
};

export default function WorkflowsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <WorkflowsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function WorkflowsContent() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const load = useCallback(() => {
    api.getWorkflows().then(setWorkflows).catch((err) => setError(err instanceof Error ? err.message : "Failed to load workflows"));
  }, []);

  useEffect(load, [load]);

  async function handleCreate() {
    setCreating(true);
    try {
      const workflow = await api.createWorkflow({
        name: "New Workflow",
        isActive: false,
        triggerType: "FORM_SUBMITTED",
        nodes: [{ id: "trigger", type: "trigger", data: {}, position: { x: 250, y: 50 } }],
        edges: [],
      });
      router.push(`/crm/workflows/${workflow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workflow");
      setCreating(false);
    }
  }

  async function toggleActive(workflow: AutomationWorkflow) {
    try {
      const updated = await api.updateWorkflow(workflow.id, { isActive: !workflow.isActive });
      setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workflow");
    }
  }

  const [pendingDelete, setPendingDelete] = useState<AutomationWorkflow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteWorkflow(pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workflow");
    } finally {
      setDeleting(false);
    }
  }

  async function handleUseTemplate(template: WorkflowTemplate) {
    setShowTemplatePicker(false);
    setCreating(true);
    try {
      const { nodes, edges } = instantiateWorkflowTemplate(template);
      const workflow = await api.createWorkflow({
        name: template.name,
        description: template.description,
        isActive: false,
        triggerType: template.triggerType,
        triggerData: template.triggerData ?? null,
        nodes,
        edges,
      });
      router.push(`/crm/workflows/${workflow.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workflow from template");
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Marketing Automation</h1>
          <p className="mt-1 text-sm text-zinc-300">No-code workflows that react to form submissions, tags, and deal moves.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplatePicker(true)}
            disabled={creating}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            Use Template
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
          >
            {creating ? "Creating…" : "New Workflow"}
          </button>
        </div>
      </div>

      {showTemplatePicker && (
        <WorkflowTemplatePickerModal onClose={() => setShowTemplatePicker(false)} onSelect={handleUseTemplate} />
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          title="Delete Workflow?"
          message={`Are you sure you want to delete "${pendingDelete.name}"? This action cannot be undone.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Trigger</th>
              <th className="px-4 py-2">Runs</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {workflows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  No workflows yet — create one to automate an email, tag, or deal move.
                </td>
              </tr>
            )}
            {workflows.map((w) => (
              <tr key={w.id} className="border-t border-white/[0.06] transition-colors duration-150 hover:bg-white/[0.02]">
                <td className="px-4 py-2">
                  <Link href={`/crm/workflows/${w.id}`} className="font-medium text-zinc-100 hover:text-amber-400 hover:underline">
                    {w.name}
                  </Link>
                  {w.description && <p className="text-xs text-zinc-500">{w.description}</p>}
                </td>
                <td className="px-4 py-2 text-xs text-zinc-400">{TRIGGER_LABELS[w.triggerType]}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">{w._count?.logs ?? 0}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(w)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${w.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"}`}
                  >
                    {w.isActive ? "Active" : "Paused"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setPendingDelete(w)}
                    title="Delete workflow"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
