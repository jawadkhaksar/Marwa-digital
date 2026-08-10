import type { WorkflowEdge, WorkflowNode, WorkflowTriggerType } from "@/lib/api";

// Pre-built starting points offered from the "Use Template" picker on the
// workflows list and inside the builder. Node/edge ids here are stable
// within a template (needed so the edges below can reference them) — a
// fresh, collision-free set of ids is stamped on by instantiateWorkflowTemplate
// at selection time, since a template may be applied more than once per
// session and node id "trigger" is otherwise assumed unique per workflow.
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  triggerType: WorkflowTriggerType;
  triggerData?: Record<string, unknown>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "lead-nurture-welcome-series",
    name: "Lead Nurture & Welcome Series",
    description:
      "Welcomes a new form lead by email, waits a day, then branches based on whether the contact is tagged \"Engaged\" — sends a demo link if so, otherwise a follow-up nudge.",
    icon: "📧",
    triggerType: "FORM_SUBMITTED",
    nodes: [
      { id: "trigger", type: "trigger", data: {}, position: { x: 300, y: 40 } },
      { id: "welcome-email", type: "action", data: { actionType: "SEND_EMAIL", templateId: "", templateHint: "Welcome Email" }, position: { x: 300, y: 160 } },
      { id: "wait-1-day", type: "delay", data: { delayMs: DAY_MS }, position: { x: 300, y: 280 } },
      { id: "engaged-check", type: "condition", data: { field: "tags", operator: "contains", value: "Engaged" }, position: { x: 300, y: 400 } },
      { id: "demo-link-email", type: "action", data: { actionType: "SEND_EMAIL", templateId: "", templateHint: "Demo Link" }, position: { x: 150, y: 540 } },
      { id: "followup-email", type: "action", data: { actionType: "SEND_EMAIL", templateId: "", templateHint: "Follow-up Email" }, position: { x: 450, y: 540 } },
    ],
    edges: [
      { id: "e-trigger-welcome", source: "trigger", target: "welcome-email" },
      { id: "e-welcome-wait", source: "welcome-email", target: "wait-1-day" },
      { id: "e-wait-condition", source: "wait-1-day", target: "engaged-check" },
      { id: "e-condition-demo", source: "engaged-check", sourceHandle: "true", target: "demo-link-email" },
      { id: "e-condition-followup", source: "engaged-check", sourceHandle: "false", target: "followup-email" },
    ],
  },
  {
    id: "instant-lead-to-crm-deal",
    name: "Instant Lead to CRM Deal",
    description: "Turns a form submission straight into a pipeline deal in the \"New Lead\" stage and tags the contact \"Web Inquiry\".",
    icon: "💼",
    triggerType: "FORM_SUBMITTED",
    nodes: [
      { id: "trigger", type: "trigger", data: {}, position: { x: 300, y: 40 } },
      { id: "move-deal-stage", type: "action", data: { actionType: "MOVE_DEAL_STAGE", stageId: "", stageHint: "New Lead" }, position: { x: 300, y: 160 } },
      { id: "add-tag", type: "action", data: { actionType: "ADD_TAG", tag: "Web Inquiry" }, position: { x: 300, y: 280 } },
    ],
    edges: [
      { id: "e-trigger-deal", source: "trigger", target: "move-deal-stage" },
      { id: "e-deal-tag", source: "move-deal-stage", target: "add-tag" },
    ],
  },
  {
    id: "rage-click-retention-alert",
    name: "Rage-Click Retention Alert",
    description: "Flags a frustrated visitor the moment a rage-click is detected — tags them and opens a high-priority \"Support Follow-up\" deal so the team can reach out fast.",
    icon: "😡",
    triggerType: "SESSION_RAGE_CLICK",
    nodes: [
      { id: "trigger", type: "trigger", data: {}, position: { x: 300, y: 40 } },
      { id: "add-tag", type: "action", data: { actionType: "ADD_TAG", tag: "Frustrated Visitor" }, position: { x: 300, y: 160 } },
      { id: "move-deal-stage", type: "action", data: { actionType: "MOVE_DEAL_STAGE", stageId: "", stageHint: "Support Follow-up", priorityHint: "High" }, position: { x: 300, y: 280 } },
    ],
    edges: [
      { id: "e-trigger-tag", source: "trigger", target: "add-tag" },
      { id: "e-tag-deal", source: "add-tag", target: "move-deal-stage" },
    ],
  },
  {
    id: "stale-deal-follow-up",
    name: "Stale Deal Follow-up",
    description: "When a deal's stage changes, waits 3 days and sends a proposal reminder email if it's still sitting there. Point the trigger at your \"Proposal Sent\" stage after applying.",
    icon: "⏰",
    triggerType: "DEAL_STAGE_CHANGED",
    triggerData: { toStageType: undefined, stageHint: "Proposal Sent" },
    nodes: [
      { id: "trigger", type: "trigger", data: {}, position: { x: 300, y: 40 } },
      { id: "wait-3-days", type: "delay", data: { delayMs: 3 * DAY_MS }, position: { x: 300, y: 160 } },
      { id: "reminder-email", type: "action", data: { actionType: "SEND_EMAIL", templateId: "", templateHint: "Proposal Reminder" }, position: { x: 300, y: 280 } },
    ],
    edges: [
      { id: "e-trigger-wait", source: "trigger", target: "wait-3-days" },
      { id: "e-wait-reminder", source: "wait-3-days", target: "reminder-email" },
    ],
  },
];

// Stamps a fresh, collision-free id on every non-trigger node (and updates
// the edges that reference them) so the same template can be applied more
// than once — e.g. after undoing a choice — without id clashes.
export function instantiateWorkflowTemplate(template: WorkflowTemplate): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const suffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  const idMap = new Map<string, string>();
  for (const node of template.nodes) {
    idMap.set(node.id, node.id === "trigger" ? "trigger" : `${node.id}-${suffix}`);
  }

  const nodes = template.nodes.map((node) => ({
    ...node,
    id: idMap.get(node.id)!,
    data: { ...node.data },
  }));

  const edges = template.edges.map((edge) => ({
    ...edge,
    id: `${idMap.get(edge.source)}-${idMap.get(edge.target)}-${edge.sourceHandle ?? "e"}`,
    source: idMap.get(edge.source)!,
    target: idMap.get(edge.target)!,
  }));

  return { nodes, edges };
}
