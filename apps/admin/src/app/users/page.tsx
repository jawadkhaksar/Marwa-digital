"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { RequireAdmin } from "@/components/RequireAdmin";
import { api, type AdminUser, type UserRole } from "@/lib/api";

type FormState = {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  password: string;
};

const EMPTY_FORM: FormState = { email: "", name: "", role: "EDITOR", password: "" };

export default function UsersPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <RequireAdmin>
          <UsersContent />
        </RequireAdmin>
      </DashboardShell>
    </AuthGuard>
  );
}

function UsersContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getUsers().then(setUsers).catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  function startEdit(user?: AdminUser) {
    setError(null);
    if (!user) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({ id: user.id, email: user.email, name: user.name, role: user.role, password: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);

    try {
      if (form.id) {
        await api.updateUser(form.id, {
          name: form.name,
          role: form.role,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        if (!form.password) {
          setError("A password is required for new admins.");
          setSaving(false);
          return;
        }
        await api.createUser({ email: form.email, name: form.name, role: form.role, password: form.password });
      }
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: AdminUser) {
    try {
      await api.updateUser(user.id, { active: !user.active });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this admin account?")) return;
    try {
      await api.deleteUser(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button onClick={() => startEdit()} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300">
          + Add New
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-3 font-semibold">{form.id ? "Edit User" : "New User"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <LabeledInput
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              required
              disabled={Boolean(form.id)}
            />
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              >
                <option value="ADMIN">Admin</option>
                <option value="EDITOR">Editor</option>
              </select>
            </div>
            <LabeledInput
              label={form.id ? "New Password (leave blank to keep)" : "Password"}
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
              {saving ? "Savingâ€¦" : "Save"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Last Login</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-zinc-800">
                <td className="px-4 py-2">{u.role === "ADMIN" ? "Admin" : "Editor"}</td>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(u)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      u.active ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-700/40 text-zinc-400"
                    }`}
                  >
                    {u.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => startEdit(u)} className="mr-2 text-xs text-amber-400 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="text-xs text-red-400 hover:underline">
                    Delete
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

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <input
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none disabled:opacity-50"
      />
    </div>
  );
}
