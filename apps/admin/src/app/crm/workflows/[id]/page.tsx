"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AuthGuard } from "@/components/AuthGuard";
import { WorkflowTemplatePickerModal } from "@/components/WorkflowTemplatePickerModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { instantiateWorkflowTemplate, type WorkflowTemplate } from "@/lib/workflowTemplates";
import { api, type WorkflowTriggerType, type AutomationEmailTemplate, type WorkflowExecutionLogEntry } from "@/lib/api";

const TRIGGER_OPTIONS: { value: WorkflowTriggerType; label: string }[] = [
  { value: "FORM_SUBMITTED", label: "Form Submitted" },
  { value: "TAG_ADDED", label: "Tag Applied" },
  { value: "DEAL_STAGE_CHANGED", label: "Deal Stage Moved" },
  { value: "SESSION_RAGE_CLICK", label: "Session Rage Click" },
];

const ACTION_TYPES = [
  { value: "SEND_EMAIL", label: "Send Email Template" },
  { value: "ADD_TAG", label: "Add Tag" },
  { value: "MOVE_DEAL_STAGE", label: "Move Deal Stage" },
  { value: "UPDATE_CONTACT_FIELD", label: "Update Contact Field" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "is greater than" },
  { value: "less_than", label: "is less than" },
];

let idCounter = 0;
function newNodeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function nodeLabel(type: string, data: Record<string, unknown>): string {
  if (type === "trigger") return "Trigger";
  if (type === "delay") {
    const minutes = Math.round((Number(data.delayMs) || 0) / 60000);
    return minutes > 0 ? `Wait ${minutes}m` : "Wait…";
  }
  if (type === "condition") return data.field ? `If ${data.field} ${data.operator || "equals"} ${data.value ?? ""}` : "Condition…";
  if (type === "action") {
    const found = ACTION_TYPES.find((a) => a.value === data.actionType);
    return found ? found.label : "Action…";
  }
  return type;
}

const NODE_COLORS: Record<string, string> = {
  trigger: "border-amber-400 bg-amber-400/10 text-amber-300",
  action: "border-blue-400 bg-blue-400/10 text-blue-300",
  condition: "border-purple-400 bg-purple-400/10 text-purple-300",
  delay: "border-emerald-400 bg-emerald-400/10 text-emerald-300",
};

function WorkflowNode({ type, data, selected }: NodeProps) {
  const nodeData = data as Record<string, unknown>;
  return (
    <div
      className={`min-w-[170px] rounded-lg border-2 px-3 py-2 text-xs font-medium shadow-md ${NODE_COLORS[type] ?? "border-zinc-700 bg-zinc-900 text-zinc-300"} ${
        selected ? "ring-2 ring-white/60" : ""
      }`}
    >
      {type !== "trigger" && <Handle type="target" position={Position.Top} />}
      <div className="text-[10px] uppercase tracking-wide opacity-70">{type}</div>
      <div className="mt-0.5 truncate">{nodeLabel(type, nodeData)}</div>
      {type === "condition" ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" style={{ left: "30%" }} />
          <Handle type="source" position={Position.Bottom} id="false" style={{ left: "70%" }} />
          <div className="mt-1 flex justify-between text-[9px] opacity-60">
            <span>Yes</span>
            <span>No</span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  );
}

const nodeTypes = { trigger: WorkflowNode, action: WorkflowNode, condition: WorkflowNode, delay: WorkflowNode };

export default function WorkflowEditorPage() {
  return (
    <AuthGuard>
      <div className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
        <ReactFlowProvider>
          <WorkflowEditorContent />
        </ReactFlowProvider>
      </div>
    </AuthGuard>
  );
}

function WorkflowEditorContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>("FORM_SUBMITTED");
  const [triggerData, setTriggerData] = useState<Record<string, unknown>>({});

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<AutomationEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<WorkflowExecutionLogEntry[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.getAutomationEmailTemplates().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const w = await api.getWorkflow(params.id);
        if (cancelled) return;
        setName(w.name);
        setDescription(w.description ?? "");
        setIsActive(w.isActive);
        setTriggerType(w.triggerType);
        setTriggerData(w.triggerData ?? {});
        setNodes(w.nodes.length > 0 ? (w.nodes as unknown as Node[]) : [{ id: "trigger", type: "trigger", data: {}, position: { x: 250, y: 40 } }]);
        setEdges(w.edges as unknown as Edge[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load workflow");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges]);

  function addNode(type: "action" | "condition" | "delay") {
    const defaultData: Record<string, unknown> =
      type === "action" ? { actionType: "SEND_EMAIL" } : type === "condition" ? { field: "status", operator: "equals", value: "" } : { delayMs: 3600000 };
    const node: Node = {
      id: newNodeId(type),
      type,
      data: defaultData,
      position: { x: 250 + Math.random() * 120 - 60, y: 150 + nodes.length * 90 },
    };
    setNodes((nds) => [...nds, node]);
  }

  function updateSelectedNodeData(patch: Record<string, unknown>) {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
  }

  function deleteSelectedNode() {
    if (!selectedNodeId || selectedNodeId === "trigger") return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.updateWorkflow(params.id, {
        name,
        description: description || null,
        isActive,
        triggerType,
        triggerData,
        nodes: nodes as unknown as import("@/lib/api").WorkflowNode[],
        edges: edges as unknown as import("@/lib/api").WorkflowEdge[],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  }

  function applyTemplate(template: WorkflowTemplate) {
    setShowTemplatePicker(false);
    const hasExistingWork = nodes.length > 1 || edges.length > 0;
    if (hasExistingWork && !confirm(`Replace the current canvas with the "${template.name}" template? Unsaved changes will be lost.`)) {
      return;
    }
    const { nodes: templateNodes, edges: templateEdges } = instantiateWorkflowTemplate(template);
    setName(template.name);
    setDescription(template.description);
    setTriggerType(template.triggerType);
    setTriggerData(template.triggerData ?? {});
    setNodes(templateNodes as unknown as Node[]);
    setEdges(templateEdges as unknown as Edge[]);
    setSelectedNodeId(null);
  }

  function openLogs() {
    setShowLogs(true);
    api
      .getWorkflowLogs(params.id, { limit: 50 })
      .then((res) => setLogs(res.items))
      .catch(() => {});
  }

  async function handleDeleteWorkflow() {
    setDeleting(true);
    try {
      await api.deleteWorkflow(params.id);
      router.push("/crm/workflows");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workflow");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  if (loading) return <p className="p-8 text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="flex h-screen flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/crm/workflows" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Workflows
          </Link>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm font-semibold focus:border-amber-400 focus:outline-none"
          />
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-400">Saved</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button onClick={() => setShowTemplatePicker(true)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
            Use Template
          </button>
          <button onClick={openLogs} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
            Logs
          </button>
          <button
            onClick={() => setConfirmingDelete(true)}
            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
          >
            Delete Workflow
          </button>
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-amber-400 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDeleteModal
          title="Delete Workflow?"
          message={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
          busy={deleting}
          onConfirm={handleDeleteWorkflow}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">Trigger</label>
          <select
            value={triggerType}
            onChange={(e) => {
              setTriggerType(e.target.value as WorkflowTriggerType);
              setTriggerData({});
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
          >
            {TRIGGER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {triggerType === "FORM_SUBMITTED" && (
          <TextField label="Form ID (blank = any form)" value={String(triggerData.formId ?? "")} onChange={(v) => setTriggerData({ formId: v || undefined })} />
        )}
        {triggerType === "TAG_ADDED" && (
          <TextField label="Tag (blank = any tag)" value={String(triggerData.tag ?? "")} onChange={(v) => setTriggerData({ tag: v || undefined })} />
        )}
        {triggerType === "DEAL_STAGE_CHANGED" && (
          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">Target stage type (blank = any)</label>
            <select
              value={String(triggerData.toStageType ?? "")}
              onChange={(e) => setTriggerData({ toStageType: e.target.value || undefined })}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
            >
              <option value="">Any stage</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
              <option value="DEFAULT">Default</option>
            </select>
          </div>
        )}
        <div className="flex-1">
          <label className="mb-1 block text-[11px] text-zinc-500">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this workflow do?"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-1 gap-3 overflow-hidden">
        <div className="flex w-40 shrink-0 flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Add Step</h3>
          <button onClick={() => addNode("action")} className="rounded-lg border border-blue-400/40 px-2 py-1.5 text-xs text-blue-300 hover:bg-blue-400/10">
            + Action
          </button>
          <button onClick={() => addNode("condition")} className="rounded-lg border border-purple-400/40 px-2 py-1.5 text-xs text-purple-300 hover:bg-purple-400/10">
            + Condition
          </button>
          <button onClick={() => addNode("delay")} className="rounded-lg border border-emerald-400/40 px-2 py-1.5 text-xs text-emerald-300 hover:bg-emerald-400/10">
            + Wait / Delay
          </button>
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">Drag from a node&apos;s bottom handle to another node&apos;s top handle to connect them.</p>
        </div>

        <div className="flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            colorMode="dark"
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {selectedNode && (
          <div className="w-72 shrink-0 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{selectedNode.type} settings</h3>
              {selectedNode.id !== "trigger" && (
                <button onClick={deleteSelectedNode} className="text-xs text-red-400 hover:underline">
                  Delete
                </button>
              )}
            </div>

            {selectedNode.type === "trigger" && <p className="text-xs text-zinc-500">Configured above the canvas.</p>}

            {selectedNode.type === "action" && (
              <ActionInspector data={selectedNode.data as Record<string, unknown>} templates={templates} onChange={updateSelectedNodeData} />
            )}
            {selectedNode.type === "condition" && <ConditionInspector data={selectedNode.data as Record<string, unknown>} onChange={updateSelectedNodeData} />}
            {selectedNode.type === "delay" && <DelayInspector data={selectedNode.data as Record<string, unknown>} onChange={updateSelectedNodeData} />}
          </div>
        )}
      </div>

      {showTemplatePicker && <WorkflowTemplatePickerModal onClose={() => setShowTemplatePicker(false)} onSelect={applyTemplate} />}

      {showLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowLogs(false)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Execution Log</h3>
              <button onClick={() => setShowLogs(false)} className="text-zinc-500 hover:text-zinc-300">
                ✕
              </button>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1">Time</th>
                  <th className="py-1">Node</th>
                  <th className="py-1">Status</th>
                  <th className="py-1">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-zinc-500">
                      No executions yet.
                    </td>
                  </tr>
                )}
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-zinc-900">
                    <td className="py-1.5 text-zinc-400">{new Date(l.executedAt).toLocaleString()}</td>
                    <td className="py-1.5 font-mono text-zinc-400">{l.currentNode}</td>
                    <td className="py-1.5">
                      <span
                        className={
                          l.status === "SUCCESS" ? "text-emerald-400" : l.status === "FAILED" ? "text-red-400" : "text-amber-400"
                        }
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-1.5 text-red-400">{l.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-zinc-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
      />
    </div>
  );
}

function ActionInspector({
  data,
  templates,
  onChange,
}: {
  data: Record<string, unknown>;
  templates: AutomationEmailTemplate[];
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const actionType = String(data.actionType ?? "SEND_EMAIL");
  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-[11px] text-zinc-500">Action Type</label>
        <select
          value={actionType}
          onChange={(e) => onChange({ actionType: e.target.value })}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
        >
          {ACTION_TYPES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {actionType === "SEND_EMAIL" && (
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">Email Template</label>
          <select
            value={String(data.templateId ?? "")}
            onChange={(e) => onChange({ templateId: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
          >
            <option value="">— Select —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {templates.length === 0 && (
            <p className="mt-1 text-[10px] text-zinc-600">
              No templates yet —{" "}
              <Link href="/crm/automation-email-templates" className="text-amber-400 hover:underline">
                create one
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {actionType === "ADD_TAG" && <TextField label="Tag" value={String(data.tag ?? "")} onChange={(v) => onChange({ tag: v })} />}

      {actionType === "MOVE_DEAL_STAGE" && <TextField label="Target Stage ID" value={String(data.stageId ?? "")} onChange={(v) => onChange({ stageId: v })} />}

      {actionType === "UPDATE_CONTACT_FIELD" && (
        <>
          <TextField label="Field (e.g. firstName, status)" value={String(data.field ?? "")} onChange={(v) => onChange({ field: v })} />
          <TextField label="New Value" value={String(data.value ?? "")} onChange={(v) => onChange({ value: v })} />
        </>
      )}
    </div>
  );
}

function ConditionInspector({ data, onChange }: { data: Record<string, unknown>; onChange: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <TextField label="Contact Field" value={String(data.field ?? "")} onChange={(v) => onChange({ field: v })} />
      <div>
        <label className="mb-1 block text-[11px] text-zinc-500">Operator</label>
        <select
          value={String(data.operator ?? "equals")}
          onChange={(e) => onChange({ operator: e.target.value })}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
        >
          {CONDITION_OPERATORS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <TextField label="Value" value={String(data.value ?? "")} onChange={(v) => onChange({ value: v })} />
      <p className="text-[10px] text-zinc-600">Connect this node&apos;s two bottom handles to the &quot;Yes&quot; and &quot;No&quot; paths.</p>
    </div>
  );
}

function DelayInspector({ data, onChange }: { data: Record<string, unknown>; onChange: (patch: Record<string, unknown>) => void }) {
  const minutes = Math.round((Number(data.delayMs) || 0) / 60000);
  return (
    <div>
      <label className="mb-1 block text-[11px] text-zinc-500">Wait duration (minutes)</label>
      <input
        type="number"
        min={1}
        value={minutes || ""}
        onChange={(e) => onChange({ delayMs: Math.max(1, Number(e.target.value) || 1) * 60000 })}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
      />
    </div>
  );
}
