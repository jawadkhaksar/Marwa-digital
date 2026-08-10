"use client";

import { useState, type FormEvent } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { ImagePicker } from "@/components/ImagePicker";
import { useActiveOrganization } from "@/lib/useActiveOrganization";
import { api, type OrgMembershipEntry, type OrgRole, type Organization } from "@/lib/api";

const ORG_ROLES: OrgRole[] = ["OWNER", "ADMIN", "MEMBER", "CLIENT"];

export default function WorkspacesPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <WorkspacesContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function WorkspacesContent() {
  const { organizations, loading, reload, switchOrganization } = useActiveOrganization();
  const [selected, setSelected] = useState<Organization | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createOrganization({ name: newName.trim() });
      setNewName("");
      setCreating(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Agency Workspaces</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Separate client sites into isolated workspaces — pages, posts, contacts, pipelines, and automations stay scoped to
            whichever workspace is active in the sidebar switcher.
          </p>
        </div>
        <button onClick={() => setCreating((v) => !v)} className="rounded-lg bg-[var(--brand,#fbbf24)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          New Workspace
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {creating && (
        <form onSubmit={handleCreate} className="mt-4 flex max-w-md items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-zinc-400">Workspace Name</label>
            <input
              autoFocus
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Acme Travel Co."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
          <button type="submit" disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
            {saving ? "Creating…" : "Create"}
          </button>
        </form>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!loading && organizations.length === 0 && (
          <p className="text-sm text-zinc-500">
            No workspaces yet — every page, contact, and workflow lives in the default global view until you create one.
          </p>
        )}
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => setSelected(org)}
            className="flex flex-col items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-left hover:border-zinc-700"
          >
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: org.primaryColor ?? "#71717a" }} />
              <span className="font-semibold text-zinc-100">{org.name}</span>
            </div>
            <span className="text-xs text-zinc-500">/{org.slug}</span>
            <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] uppercase text-zinc-400">{org.role}</span>
          </button>
        ))}
      </div>

      {selected && (
        <WorkspaceDetailModal
          organization={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            reload();
          }}
          onSwitchTo={() => switchOrganization(selected.id)}
        />
      )}
    </div>
  );
}

function WorkspaceDetailModal({
  organization,
  onClose,
  onUpdated,
  onSwitchTo,
}: {
  organization: Organization;
  onClose: () => void;
  onUpdated: () => void;
  onSwitchTo: () => void;
}) {
  const canManage = organization.role === "OWNER" || organization.role === "ADMIN";
  const [name, setName] = useState(organization.name);
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl);
  const [primaryColor, setPrimaryColor] = useState(organization.primaryColor ?? "#3b82f6");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [members, setMembers] = useState<OrgMembershipEntry[] | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("MEMBER");
  const [inviting, setInviting] = useState(false);

  function loadMembers() {
    api.getOrganizationMembers(organization.id).then(setMembers).catch((err) => setError(err instanceof Error ? err.message : "Failed to load members"));
  }

  async function handleSaveBranding(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateOrganization(organization.id, { name, logoUrl, primaryColor });
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save workspace settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      await api.inviteOrganizationMember(organization.id, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail("");
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm("Remove this member's access to the workspace?")) return;
    try {
      await api.removeOrganizationMember(organization.id, userId);
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{organization.name}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            ✕
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <button onClick={onSwitchTo} className="mb-4 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900">
          Switch to this workspace
        </button>

        {canManage && (
          <form onSubmit={handleSaveBranding} className="flex flex-col gap-4 rounded-lg border border-zinc-800 p-4">
            <h3 className="text-sm font-semibold text-zinc-200">White-Labeling</h3>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Workspace Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Logo</label>
              <ImagePicker images={logoUrl ? [logoUrl] : []} onChange={(imgs) => setLogoUrl(imgs[imgs.length - 1] ?? null)} category="branding" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-14 rounded border border-zinc-700 bg-zinc-950" />
                <input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-32 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
            <button type="submit" disabled={saving} className="self-start rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
              {saving ? "Saving…" : "Save Branding"}
            </button>
          </form>
        )}

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Team & Client Access</h3>
            {!members && (
              <button onClick={loadMembers} className="text-xs text-amber-400 hover:underline">
                Load members
              </button>
            )}
          </div>

          {canManage && (
            <form onSubmit={handleInvite} className="mb-3 flex flex-wrap items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] text-zinc-500">Staff Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-zinc-500">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
                >
                  {ORG_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={inviting} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50">
                {inviting ? "Inviting…" : "Grant Access"}
              </button>
            </form>
          )}
          <p className="mb-3 text-xs text-zinc-600">
            Only existing staff accounts (Admin → Users) can be granted workspace access — there is no separate client signup flow.
          </p>

          {members && (
            <div className="overflow-hidden rounded-lg border border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="px-3 py-1.5">Name</th>
                    <th className="px-3 py-1.5">Email</th>
                    <th className="px-3 py-1.5">Role</th>
                    <th className="px-3 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-zinc-500">
                        No members yet.
                      </td>
                    </tr>
                  )}
                  {members.map((m) => (
                    <tr key={m.id} className="border-t border-zinc-800">
                      <td className="px-3 py-1.5">{m.user.name}</td>
                      <td className="px-3 py-1.5 text-xs text-zinc-400">{m.user.email}</td>
                      <td className="px-3 py-1.5 text-xs uppercase text-zinc-400">{m.role}</td>
                      <td className="px-3 py-1.5 text-right">
                        {canManage && (
                          <button onClick={() => handleRemove(m.userId)} className="text-xs text-red-400 hover:underline">
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
