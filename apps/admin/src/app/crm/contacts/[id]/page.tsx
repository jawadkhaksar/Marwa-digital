"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { SessionReplayerModal } from "@/components/SessionReplayerModal";
import { api, type ContactActivityEntry, type ContactDetail, type ContactStatus } from "@/lib/api";

const STATUSES: ContactStatus[] = ["LEAD", "OPPORTUNITY", "CUSTOMER", "ARCHIVED"];

const ACTIVITY_ICON: Record<string, string> = {
  PAGE_VIEW: "🖥️",
  FORM_SUBMITTED: "📝",
  INQUIRY_SUBMITTED: "✉️",
  STAGE_CHANGED: "🔀",
  NOTE_ADDED: "🗒️",
  DEAL_CREATED: "💼",
  SESSION_RECORDED: "🎥",
};

type TimelineEvent = ContactActivityEntry & { sessionId?: string };

function contactName(c: ContactDetail): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.email;
}

export default function CrmContactDetailPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <ContactDetailContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function ContactDetailContent() {
  const params = useParams<{ id: string }>();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  const load = useCallback(() => {
    api
      .getContact(params.id)
      .then(setContact)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load contact"));
  }, [params.id]);

  useEffect(load, [load]);

  // Recorded sessions surface both as a quick-access list (left sidebar) and
  // as entries woven into the chronological activity timeline (center
  // stream) — merging page visits, form submissions, session recordings,
  // and stage updates into one feed, per the 360° profile spec.
  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!contact) return [];
    const recordingEvents: TimelineEvent[] = contact.sessions
      .filter((s) => s.recording)
      .map((s) => ({
        type: "SESSION_RECORDED",
        title: `Session recorded (${s.recording?.duration ?? 0}s)`,
        description: [s.city, s.country].filter(Boolean).join(", ") || null,
        createdAt: s.createdAt,
        metadata: null,
        sessionId: s.sessionId,
      }));
    return [...contact.timeline, ...recordingEvents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [contact]);

  async function updateStatus(status: ContactStatus) {
    if (!contact) return;
    try {
      await api.updateContact(contact.id, { status });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  async function addTag() {
    if (!contact || !tagInput.trim()) return;
    const tag = tagInput.trim();
    if (contact.tags.includes(tag)) {
      setTagInput("");
      return;
    }
    try {
      await api.updateContact(contact.id, { tags: [...contact.tags, tag] });
      setTagInput("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tag");
    }
  }

  async function removeTag(tag: string) {
    if (!contact) return;
    try {
      await api.updateContact(contact.id, { tags: contact.tags.filter((t) => t !== tag) });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove tag");
    }
  }

  async function addNote() {
    if (!contact || !noteText.trim()) return;
    setSavingNote(true);
    try {
      await api.addContactNote(contact.id, noteText.trim());
      setNoteText("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  }

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!contact) return <p className="text-sm text-zinc-500">Loading…</p>;

  const recordedSessions = contact.sessions.filter((s) => s.recording);

  return (
    <div>
      <Link href="/crm/contacts" className="text-sm text-zinc-500 hover:text-amber-400">
        ← Back to Contacts
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_300px]">
        {/* Left sidebar: contact details, tags, quick stage switcher */}
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 p-4">
          <div>
            <h1 className="text-lg font-semibold">{contactName(contact)}</h1>
            <p className="text-sm text-zinc-400">{contact.email}</p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Pipeline Status</label>
            <select
              value={contact.status}
              onChange={(e) => updateStatus(e.target.value as ContactStatus)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <InfoRow label="Phone" value={contact.phone ?? "—"} />
          <InfoRow label="Company" value={contact.company ?? "—"} />

          <div>
            <label className="mb-1 block text-xs text-zinc-500">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-zinc-500 hover:text-red-400">
                    ×
                  </button>
                </span>
              ))}
              {contact.tags.length === 0 && <span className="text-xs text-zinc-600">No tags</span>}
            </div>
            <div className="mt-2 flex gap-1">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tag…"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs focus:border-amber-400 focus:outline-none"
              />
              <button type="button" onClick={addTag} className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-amber-400">
                +
              </button>
            </div>
          </div>

          {recordedSessions.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Session Recordings</label>
              <div className="flex flex-col gap-1">
                {recordedSessions.map((s) => (
                  <button
                    key={s.sessionId}
                    type="button"
                    onClick={() => setReplaySessionId(s.sessionId)}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 px-2 py-1.5 text-left text-xs text-zinc-300 hover:border-amber-400 hover:text-amber-400"
                  >
                    <span>Watch User Session</span>
                    <span className="text-zinc-500">{s.recording?.duration}s</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: unified activity timeline */}
        <div className="rounded-xl border border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-100">Activity Timeline</h2>
          <div className="mt-2 flex flex-col divide-y divide-zinc-800">
            {timeline.length === 0 && <p className="py-4 text-sm text-zinc-500">No activity recorded yet.</p>}
            {timeline.map((event, i) => (
              <TimelineRow key={i} event={event} onWatchSession={setReplaySessionId} />
            ))}
          </div>
        </div>

        {/* Right sidebar: deals + notes */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-100">Deals</h2>
            <div className="mt-2 flex flex-col gap-2">
              {contact.deals.length === 0 && <p className="text-xs text-zinc-500">No deals yet.</p>}
              {contact.deals.map((deal) => (
                <div key={deal.id} className="rounded-lg border border-zinc-800 p-2 text-xs">
                  <div className="font-medium text-zinc-200">{deal.title}</div>
                  <div className="mt-1 flex items-center justify-between text-zinc-500">
                    <span>
                      {deal.stage.pipeline.name} → {deal.stage.name}
                    </span>
                    <span className="text-amber-400">
                      {deal.currency} {deal.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-100">Notes</h2>
            <div className="mt-2 flex flex-col gap-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal note…"
                rows={3}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={addNote}
                disabled={savingNote || !noteText.trim()}
                className="self-end rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 disabled:opacity-50"
              >
                {savingNote ? "Saving…" : "Add Note"}
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {contact.notes.length === 0 && <p className="text-xs text-zinc-500">No notes yet.</p>}
              {contact.notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-zinc-800 p-2 text-xs">
                  <p className="text-zinc-300">{note.content}</p>
                  <p className="mt-1 text-[11px] text-zinc-600">{new Date(note.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {replaySessionId && <SessionReplayerModal sessionId={replaySessionId} onClose={() => setReplaySessionId(null)} />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="text-sm text-zinc-300">{value}</div>
    </div>
  );
}

function TimelineRow({ event, onWatchSession }: { event: TimelineEvent; onWatchSession: (sessionId: string) => void }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 text-base">{ACTIVITY_ICON[event.type] ?? "•"}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-200">{event.title}</p>
        {event.description && <p className="text-xs text-zinc-500">{event.description}</p>}
        <div className="mt-0.5 flex items-center gap-2">
          <p className="text-[11px] text-zinc-600">{new Date(event.createdAt).toLocaleString()}</p>
          {event.type === "SESSION_RECORDED" && event.sessionId && (
            <button type="button" onClick={() => onWatchSession(event.sessionId!)} className="text-[11px] font-medium text-amber-400 hover:underline">
              Watch Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
