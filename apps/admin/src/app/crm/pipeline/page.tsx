"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { api, type Deal, type Pipeline, type PipelineStage, type StageType } from "@/lib/api";

const STAGE_TYPE_BADGE: Record<StageType, string> = {
  DEFAULT: "",
  WON: "bg-emerald-500/20 text-emerald-300",
  LOST: "bg-red-500/20 text-red-300",
};

export default function CrmPipelinePage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <PipelineBoard />
      </DashboardShell>
    </AuthGuard>
  );
}

type DealsByStage = Record<string, Deal[]>;

function toDealsByStage(stages: PipelineStage[]): DealsByStage {
  const map: DealsByStage = {};
  for (const stage of stages) map[stage.id] = [...stage.deals].sort((a, b) => a.order - b.order);
  return map;
}

function findStageOfDeal(dealsByStage: DealsByStage, dealId: string): string | undefined {
  return Object.keys(dealsByStage).find((stageId) => dealsByStage[stageId].some((d) => d.id === dealId));
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

function contactLabel(contact: Deal["contact"]): string | null {
  if (!contact) return null;
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return name || contact.email;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function PipelineBoard() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineId, setPipelineId] = useState<string>("");
  const [dealsByStage, setDealsByStage] = useState<DealsByStage>({});
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [addingDealStageId, setAddingDealStageId] = useState<string | null>(null);
  const [addingStage, setAddingStage] = useState(false);
  const [pendingDeleteDeal, setPendingDeleteDeal] = useState<Deal | null>(null);
  const [deletingDeal, setDeletingDeal] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(() => {
    api
      .getPipelines()
      .then((all) => {
        setPipelines(all);
        const current = all.find((p) => p.id === pipelineId) ?? all.find((p) => p.isDefault) ?? all[0];
        if (current) {
          setPipelineId(current.id);
          setStages(current.stages);
          setDealsByStage(toDealsByStage(current.stages));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load pipelines"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(load, [load]);

  function selectPipeline(id: string) {
    const p = pipelines.find((pp) => pp.id === id);
    if (!p) return;
    setPipelineId(id);
    setStages(p.stages);
    setDealsByStage(toDealsByStage(p.stages));
  }

  const totalsByStage = useMemo(() => {
    const totals: Record<string, { count: number; value: number; currency: string }> = {};
    for (const stage of stages) {
      const deals = dealsByStage[stage.id] ?? [];
      totals[stage.id] = { count: deals.length, value: deals.reduce((sum, d) => sum + d.value, 0), currency: deals[0]?.currency ?? "USD" };
    }
    return totals;
  }, [stages, dealsByStage]);

  function handleDragStart(event: DragStartEvent) {
    const dealId = String(event.active.id);
    const stageId = findStageOfDeal(dealsByStage, dealId);
    if (!stageId) return;
    setActiveDeal(dealsByStage[stageId].find((d) => d.id === dealId) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const activeStage = findStageOfDeal(dealsByStage, activeId);
    const overStage = dealsByStage[overId] ? overId : findStageOfDeal(dealsByStage, overId);
    if (!activeStage || !overStage || activeStage === overStage) return;

    setDealsByStage((prev) => {
      const activeItems = [...prev[activeStage]];
      const overItems = [...prev[overStage]];
      const activeIndex = activeItems.findIndex((d) => d.id === activeId);
      if (activeIndex === -1) return prev;
      const overIndex = overItems.findIndex((d) => d.id === overId);
      const [moved] = activeItems.splice(activeIndex, 1);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      overItems.splice(insertAt, 0, moved);
      return { ...prev, [activeStage]: activeItems, [overStage]: overItems };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const stageId = dealsByStage[overId] ? overId : findStageOfDeal(dealsByStage, overId);
    if (!stageId) return;

    setDealsByStage((prev) => {
      const items = prev[stageId] ?? [];
      const activeIndex = items.findIndex((d) => d.id === activeId);
      if (activeIndex === -1) return prev;
      const overIndex = dealsByStage[overId] ? items.length - 1 : items.findIndex((d) => d.id === overId);
      const reordered = arrayMove(items, activeIndex, Math.max(0, overIndex));
      const newIndex = reordered.findIndex((d) => d.id === activeId);

      // The server is the source of truth for `status` here — moving into a
      // WON/LOST/DEFAULT stage auto-syncs it (Automated Deal Stage Trigger),
      // so the local optimistic update is patched with whatever it returns
      // rather than assuming the pre-drag status still holds.
      api
        .reorderDeal(activeId, stageId, newIndex)
        .then((updated) => {
          setDealsByStage((cur) => ({
            ...cur,
            [stageId]: (cur[stageId] ?? []).map((d) => (d.id === activeId ? { ...d, status: updated.status } : d)),
          }));
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to move deal");
          load();
        });

      return { ...prev, [stageId]: reordered };
    });
  }

  async function addDeal(stageId: string, title: string, value: string) {
    try {
      await api.createDeal({ title, value: value ? Number(value) : 0, stageId });
      setAddingDealStageId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal");
    }
  }

  async function addStage(name: string, stageType: StageType) {
    try {
      await api.createPipelineStage(pipelineId, { name, stageType });
      setAddingStage(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create stage");
    }
  }

  async function changeStageType(stageId: string, stageType: StageType) {
    try {
      await api.updatePipelineStage(stageId, { stageType });
      setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, stageType } : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stage");
    }
  }

  async function confirmDeleteDeal() {
    if (!pendingDeleteDeal) return;
    setDeletingDeal(true);
    try {
      await api.deleteDeal(pendingDeleteDeal.id);
      const dealId = pendingDeleteDeal.id;
      setDealsByStage((prev) => {
        const next: DealsByStage = {};
        for (const [stageId, deals] of Object.entries(prev)) next[stageId] = deals.filter((d) => d.id !== dealId);
        return next;
      });
      setPendingDeleteDeal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete deal");
    } finally {
      setDeletingDeal(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="mt-1 text-sm text-zinc-300">Drag deals between stages to move them through your sales process.</p>
        </div>
        {pipelines.length > 1 && (
          <select
            value={pipelineId}
            onChange={(e) => selectPipeline(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-6 flex flex-1 gap-4 overflow-x-auto pb-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          {stages
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage[stage.id] ?? []}
                totals={totalsByStage[stage.id]}
                addingDeal={addingDealStageId === stage.id}
                onStartAddDeal={() => setAddingDealStageId(stage.id)}
                onCancelAddDeal={() => setAddingDealStageId(null)}
                onAddDeal={(title, value) => addDeal(stage.id, title, value)}
                onChangeStageType={(stageType) => changeStageType(stage.id, stageType)}
                onDeleteDeal={setPendingDeleteDeal}
              />
            ))}

          <DragOverlay>{activeDeal && <DealCardBody deal={activeDeal} dragging />}</DragOverlay>
        </DndContext>

        <div className="w-72 shrink-0">
          {addingStage ? (
            <NewStageForm onCancel={() => setAddingStage(false)} onSubmit={addStage} />
          ) : (
            <button
              type="button"
              onClick={() => setAddingStage(true)}
              className="w-full rounded-xl border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-400 hover:border-amber-400 hover:text-amber-400"
            >
              + Add Stage
            </button>
          )}
        </div>
      </div>

      {pendingDeleteDeal && (
        <ConfirmDeleteModal
          title="Delete Deal?"
          message={`Are you sure you want to delete "${pendingDeleteDeal.title}"? This action cannot be undone.`}
          busy={deletingDeal}
          onConfirm={confirmDeleteDeal}
          onCancel={() => setPendingDeleteDeal(null)}
        />
      )}
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  totals,
  addingDeal,
  onStartAddDeal,
  onCancelAddDeal,
  onAddDeal,
  onChangeStageType,
  onDeleteDeal,
}: {
  stage: PipelineStage;
  deals: Deal[];
  totals: { count: number; value: number; currency: string } | undefined;
  addingDeal: boolean;
  onStartAddDeal: () => void;
  onCancelAddDeal: () => void;
  onAddDeal: (title: string, value: string) => void;
  onChangeStageType: (stageType: StageType) => void;
  onDeleteDeal: (deal: Deal) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      data-testid={`stage-column-${stage.id}`}
      data-stage-name={stage.name}
      className="flex w-72 shrink-0 flex-col rounded-xl border border-white/[0.08] bg-zinc-900/50 shadow-xl shadow-black/20"
    >
      <div className="flex items-center justify-between rounded-t-xl border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full ring-4 ring-white/[0.04]" style={{ backgroundColor: stage.color ?? "#71717a" }} />
          <span className="text-sm font-semibold">{stage.name}</span>
        </div>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-zinc-300">{totals?.count ?? 0}</span>
      </div>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
        {totals && totals.count > 0 ? (
          <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
            {formatMoney(totals.value, totals.currency)}
          </span>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
        <select
          value={stage.stageType}
          onChange={(e) => onChangeStageType(e.target.value as StageType)}
          title="Automated Deal Stage Trigger — deals dragged here inherit this status"
          className={`rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[11px] focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${STAGE_TYPE_BADGE[stage.stageType]}`}
        >
          <option value="DEFAULT">Active</option>
          <option value="WON">Won</option>
          <option value="LOST">Lost</option>
        </select>
      </div>

      <div
        ref={setNodeRef}
        data-testid={`stage-dropzone-${stage.id}`}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 p-2 transition-colors duration-200 ${isOver ? "bg-indigo-500/5" : ""}`}
      >
        <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <SortableDealCard key={deal.id} deal={deal} onDeleteDeal={onDeleteDeal} />
          ))}
        </SortableContext>

        {addingDeal ? (
          <NewDealForm onCancel={onCancelAddDeal} onSubmit={onAddDeal} />
        ) : (
          <button
            type="button"
            onClick={onStartAddDeal}
            className="rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-500 transition-colors hover:border-indigo-500/50 hover:text-indigo-400"
          >
            + Add Deal
          </button>
        )}
      </div>
    </div>
  );
}

function SortableDealCard({ deal, onDeleteDeal }: { deal: Deal; onDeleteDeal: (deal: Deal) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} data-testid={`deal-card-${deal.id}`} {...attributes} {...listeners}>
      <DealCardBody deal={deal} onDeleteDeal={onDeleteDeal} />
    </div>
  );
}

function DealCardBody({ deal, dragging, onDeleteDeal }: { deal: Deal; dragging?: boolean; onDeleteDeal?: (deal: Deal) => void }) {
  const name = contactLabel(deal.contact);
  return (
    <div
      className={`cursor-grab rounded-xl border p-3 text-sm shadow-sm transition-all duration-200 active:cursor-grabbing ${
        dragging
          ? "rotate-2 border-indigo-500/60 bg-zinc-900 shadow-2xl shadow-indigo-500/20"
          : "border-white/[0.08] bg-zinc-950 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-[0_8px_24px_rgba(99,102,241,0.15)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">{deal.title}</div>
        <div className="flex shrink-0 items-center gap-1">
          {deal.status !== "OPEN" && (
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                deal.status === "WON" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-red-500/20 bg-red-500/10 text-red-300"
              }`}
            >
              {deal.status}
            </span>
          )}
          {!dragging && onDeleteDeal && (
            <button
              type="button"
              title="Delete deal"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteDeal(deal);
              }}
              className="flex h-5 w-5 items-center justify-center rounded text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <div className="mt-1 text-xs font-semibold text-indigo-400">{formatMoney(deal.value, deal.currency)}</div>
      {(name || deal.contact?.company) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {name && deal.contactId && (
            <Link
              href={`/crm/contacts/${deal.contactId}`}
              className="text-xs text-zinc-400 hover:text-indigo-400"
              onClick={(e) => dragging && e.preventDefault()}
            >
              {name}
            </Link>
          )}
          {deal.contact?.company && (
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
              {deal.contact.company}
            </span>
          )}
        </div>
      )}
      <div className="mt-2 text-[11px] text-zinc-600">Updated {timeAgo(deal.updatedAt)}</div>
    </div>
  );
}

function NewDealForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (title: string, value: string) => void }) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit(title.trim(), value);
      }}
      className="flex flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-950 p-2"
    >
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deal title" className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none" />
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value" type="number" min="0" className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none" />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-md bg-amber-400 px-2 py-1.5 text-xs font-semibold text-zinc-950">
          Add
        </button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400">
          Cancel
        </button>
      </div>
    </form>
  );
}

function NewStageForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (name: string, stageType: StageType) => void }) {
  const [name, setName] = useState("");
  const [stageType, setStageType] = useState<StageType>("DEFAULT");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit(name.trim(), stageType);
      }}
      className="flex flex-col gap-2 rounded-xl border border-zinc-700 bg-zinc-950 p-3"
    >
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Stage name" className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none" />
      <select
        value={stageType}
        onChange={(e) => setStageType(e.target.value as StageType)}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
      >
        <option value="DEFAULT">Active</option>
        <option value="WON">Won</option>
        <option value="LOST">Lost</option>
      </select>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-md bg-amber-400 px-2 py-1.5 text-xs font-semibold text-zinc-950">
          Add
        </button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-400">
          Cancel
        </button>
      </div>
    </form>
  );
}
