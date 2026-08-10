import { prisma, Prisma } from "@marwa/db";
import { sendMail } from "../lib/mailer";
import { renderTemplate } from "../lib/emailTemplates";

/**
 * Event-driven runner for AutomationWorkflow rows. `nodes`/`edges` are the
 * exact React Flow graph the visual editor produced — this walks that same
 * graph directly rather than compiling it into a separate representation,
 * so what an admin sees in the editor is always what actually ran.
 *
 * Delay/Wait steps don't hold a live in-memory timer (a server restart
 * would lose it) — instead a WorkflowExecutionLog row is written with
 * status "PENDING" and a future `executedAt`, and a lightweight polling
 * scheduler (startWorkflowScheduler, below) resumes it once that time
 * arrives. This matches the rest of this codebase's "no external job queue"
 * philosophy (see Post.publishedAt / PostStatus.SCHEDULED for the same
 * pattern applied to scheduled publishing).
 */

interface WorkflowNode {
  id: string;
  type: string; // "trigger" | "action" | "condition" | "delay"
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null; // "true" | "false" on a condition node's two outputs
}

export interface TriggerContext {
  contactId?: string | null;
  formId?: string;
  tag?: string;
  dealId?: string | null;
  toStageType?: string;
}

function asNodes(json: unknown): WorkflowNode[] {
  return Array.isArray(json) ? (json as WorkflowNode[]) : [];
}
function asEdges(json: unknown): WorkflowEdge[] {
  return Array.isArray(json) ? (json as WorkflowEdge[]) : [];
}

/**
 * Fire-and-forget — called from the routes that produce a trigger event
 * (form submit, a tag added to a Contact, a Deal dragged to a new stage).
 * Deliberately never awaited by the caller: a slow or failing automation
 * must never delay or break the request that triggered it. Per-node
 * failures are captured in WorkflowExecutionLog, not thrown back here.
 */
export function dispatchTrigger(triggerType: string, context: TriggerContext): void {
  runTrigger(triggerType, context).catch((err) => {
    console.error(`[workflow] Failed to dispatch trigger "${triggerType}":`, err);
  });
}

async function runTrigger(triggerType: string, context: TriggerContext): Promise<void> {
  const workflows = await prisma.automationWorkflow.findMany({ where: { isActive: true, triggerType } });

  for (const workflow of workflows) {
    if (!triggerMatches(workflow.triggerData, triggerType, context)) continue;

    const nodes = asNodes(workflow.nodes);
    const edges = asEdges(workflow.edges);
    const triggerNode = nodes.find((n) => n.type === "trigger");
    if (!triggerNode) continue;

    const startIds = edges.filter((e) => e.source === triggerNode.id).map((e) => e.target);
    for (const nodeId of startIds) {
      await executeFrom(workflow.id, nodes, edges, nodeId, context.contactId ?? null);
    }
  }
}

/** An empty/unset triggerData means "fire on every occurrence of this trigger type" — a configured filter (a specific form, tag, or target stage type) narrows that down. */
function triggerMatches(triggerData: unknown, triggerType: string, context: TriggerContext): boolean {
  const data = (triggerData ?? {}) as Record<string, unknown>;
  if (triggerType === "FORM_SUBMITTED" && data.formId) return data.formId === context.formId;
  if (triggerType === "TAG_ADDED" && data.tag) return data.tag === context.tag;
  if (triggerType === "DEAL_STAGE_CHANGED" && data.toStageType) return data.toStageType === context.toStageType;
  return true;
}

async function executeFrom(workflowId: string, nodes: WorkflowNode[], edges: WorkflowEdge[], nodeId: string, contactId: string | null): Promise<void> {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return;

  if (node.type === "delay") {
    const delayMs = Math.max(0, Number(node.data.delayMs) || 0);
    await prisma.workflowExecutionLog.create({
      data: { workflowId, contactId, status: "PENDING", currentNode: node.id, executedAt: new Date(Date.now() + delayMs) },
    });
    return; // resumed by the poller once executedAt has passed — see resumeDueDelays
  }

  const log = await prisma.workflowExecutionLog.create({ data: { workflowId, contactId, status: "PENDING", currentNode: node.id } });

  let conditionResult: boolean | null = null;
  try {
    if (node.type === "condition") {
      conditionResult = await evaluateCondition(node, contactId);
    } else if (node.type === "action") {
      await runAction(node, contactId);
    }
    await prisma.workflowExecutionLog.update({ where: { id: log.id }, data: { status: "SUCCESS" } });
  } catch (err) {
    await prisma.workflowExecutionLog.update({
      where: { id: log.id },
      data: { status: "FAILED", error: err instanceof Error ? err.message : "Unknown error" },
    });
    return; // don't continue down the graph past a failed step
  }

  const outgoing = edges.filter((e) => e.source === node.id);
  const targets = node.type === "condition" ? outgoing.filter((e) => e.sourceHandle === (conditionResult ? "true" : "false")) : outgoing;

  for (const edge of targets) {
    await executeFrom(workflowId, nodes, edges, edge.target, contactId);
  }
}

async function runAction(node: WorkflowNode, contactId: string | null): Promise<void> {
  const actionType = String(node.data.actionType ?? "");

  switch (actionType) {
    case "SEND_EMAIL": {
      if (!contactId) throw new Error("This step requires a contact, but none was available in this trigger's context.");
      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      if (!contact) throw new Error("Contact not found");

      const templateId = String(node.data.templateId ?? "");
      const template = await prisma.automationEmailTemplate.findUnique({ where: { id: templateId } });
      if (!template) throw new Error("The email template configured on this step no longer exists");

      const vars = { firstName: contact.firstName ?? "", lastName: contact.lastName ?? "", email: contact.email, company: contact.company ?? "" };
      const result = await sendMail({ to: contact.email, subject: renderTemplate(template.subject, vars), html: renderTemplate(template.htmlBody, vars) });
      if (result.status === "failed") throw new Error(result.detail);

      await prisma.contactActivity.create({ data: { contactId, type: "WORKFLOW_EMAIL_SENT", title: `Automation email sent: ${template.name}` } });
      break;
    }

    case "ADD_TAG": {
      if (!contactId) throw new Error("This step requires a contact, but none was available in this trigger's context.");
      const tag = String(node.data.tag ?? "").trim();
      if (!tag) throw new Error("No tag is configured on this step");

      const contact = await prisma.contact.findUnique({ where: { id: contactId } });
      if (!contact) throw new Error("Contact not found");

      if (!contact.tags.includes(tag)) {
        await prisma.contact.update({ where: { id: contactId }, data: { tags: { push: tag } } });
        // Chains into any workflow watching for this tag, same as if a
        // human had applied it by hand in the CRM.
        dispatchTrigger("TAG_ADDED", { contactId, tag });
      }
      break;
    }

    case "MOVE_DEAL_STAGE": {
      if (!contactId) throw new Error("This step requires a contact, but none was available in this trigger's context.");
      const stageId = String(node.data.stageId ?? "");
      if (!stageId) throw new Error("No target stage is configured on this step");

      const deal = await prisma.deal.findFirst({ where: { contactId, status: "OPEN" }, orderBy: { createdAt: "desc" } });
      if (!deal) throw new Error("This contact has no open deal to move");

      await prisma.deal.update({ where: { id: deal.id }, data: { stageId } });
      break;
    }

    case "UPDATE_CONTACT_FIELD": {
      if (!contactId) throw new Error("This step requires a contact, but none was available in this trigger's context.");
      const field = String(node.data.field ?? "");
      if (!field) throw new Error("No field is configured on this step");
      const value = node.data.value;

      const SCALAR_FIELDS = new Set(["firstName", "lastName", "phone", "company", "status"]);
      if (SCALAR_FIELDS.has(field)) {
        await prisma.contact.update({ where: { id: contactId }, data: { [field]: value } });
      } else {
        const contact = await prisma.contact.findUnique({ where: { id: contactId } });
        const customFields = (contact?.customFields as Record<string, unknown> | null) ?? {};
        await prisma.contact.update({ where: { id: contactId }, data: { customFields: { ...customFields, [field]: value } as Prisma.InputJsonValue } });
      }
      break;
    }

    default:
      throw new Error(`Unknown action type: "${actionType}"`);
  }
}

async function evaluateCondition(node: WorkflowNode, contactId: string | null): Promise<boolean> {
  if (!contactId) return false;
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return false;

  const field = String(node.data.field ?? "");
  const operator = String(node.data.operator ?? "equals");
  const compareValue = String(node.data.value ?? "");

  const actual: unknown =
    field === "tags" ? contact.tags : ((contact as unknown as Record<string, unknown>)[field] ?? (contact.customFields as Record<string, unknown> | null)?.[field]);

  switch (operator) {
    case "equals":
      return String(actual ?? "") === compareValue;
    case "not_equals":
      return String(actual ?? "") !== compareValue;
    case "contains":
      return Array.isArray(actual) ? actual.includes(compareValue) : String(actual ?? "").includes(compareValue);
    case "greater_than":
      return Number(actual) > Number(compareValue);
    case "less_than":
      return Number(actual) < Number(compareValue);
    default:
      return false;
  }
}

// ── Delay scheduler ───────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000;

/** Called once from server.ts at boot. */
export function startWorkflowScheduler(): void {
  setInterval(() => {
    resumeDueDelays().catch((err) => console.error("[workflow] Scheduler tick failed:", err));
  }, POLL_INTERVAL_MS);
}

async function resumeDueDelays(): Promise<void> {
  const due = await prisma.workflowExecutionLog.findMany({
    where: { status: "PENDING", executedAt: { lte: new Date() } },
    include: { workflow: true },
  });

  for (const log of due) {
    if (!log.currentNode) continue;
    const nodes = asNodes(log.workflow.nodes);
    const edges = asEdges(log.workflow.edges);

    await prisma.workflowExecutionLog.update({ where: { id: log.id }, data: { status: "SUCCESS" } });

    const nextIds = edges.filter((e) => e.source === log.currentNode).map((e) => e.target);
    for (const nodeId of nextIds) {
      await executeFrom(log.workflowId, nodes, edges, nodeId, log.contactId);
    }
  }
}
