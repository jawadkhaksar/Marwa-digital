"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type CollectionDetail, type CollectionField, type CollectionFieldType, type CollectionItem, type CollectionItemStatus } from "@/lib/api";

const FIELD_TYPES: CollectionFieldType[] = ["TEXT", "RICH_TEXT", "NUMBER", "BOOLEAN", "IMAGE", "IMAGE_LIST", "DATE", "SELECT", "REFERENCE", "JSON"];

type FieldFormState = { key: string; label: string; type: CollectionFieldType; required: boolean; selectOptions: string };

const EMPTY_FIELD_FORM: FieldFormState = { key: "", label: "", type: "TEXT", required: false, selectOptions: "" };

export default function CollectionDetailPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <CollectionDetailContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function CollectionDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldForm, setFieldForm] = useState<FieldFormState | null>(null);
  const [editingItem, setEditingItem] = useState<{ id?: string; slug: string; status: CollectionItemStatus; order: number; data: Record<string, unknown> } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getCollection(id).then(setCollection).catch((err) => setError(err.message));
  }, [id]);

  useEffect(load, [load]);

  if (!collection) {
    return (
      <div>
        <Link href="/collections" className="text-sm text-amber-400 hover:underline">
          ← Collections
        </Link>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : <p className="mt-3 text-sm text-zinc-500">Loading…</p>}
      </div>
    );
  }

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    if (!fieldForm) return;
    setSaving(true);
    setError(null);
    try {
      const options = fieldForm.type === "SELECT" ? fieldForm.selectOptions.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
      await api.createCollectionField(id, {
        key: fieldForm.key,
        label: fieldForm.label,
        type: fieldForm.type,
        required: fieldForm.required,
        order: collection!.fields.length,
        options,
      });
      setFieldForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add field");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteField(fieldId: string, label: string) {
    if (!confirm(`Delete the "${label}" field? Existing items keep any data already saved under it, but the editor will stop showing it.`)) return;
    try {
      await api.deleteCollectionField(id, fieldId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete field");
    }
  }

  function startNewItem() {
    setError(null);
    setEditingItem({ slug: "", status: "DRAFT", order: collection!.items.length, data: {} });
  }

  function startEditItem(item: CollectionItem) {
    setError(null);
    setEditingItem({ id: item.id, slug: item.slug ?? "", status: item.status, order: item.order, data: { ...item.data } });
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setSaving(true);
    setError(null);
    const payload = { slug: editingItem.slug || undefined, status: editingItem.status, order: editingItem.order, data: editingItem.data };
    try {
      if (editingItem.id) await api.updateCollectionItem(id, editingItem.id, payload);
      else await api.createCollectionItem(id, payload);
      setEditingItem(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Delete this item?")) return;
    try {
      await api.deleteCollectionItem(id, itemId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  function itemSummary(item: CollectionItem): string {
    const firstTextField = collection!.fields.find((f) => f.type === "TEXT");
    const value = firstTextField ? item.data[firstTextField.key] : undefined;
    return (typeof value === "string" && value) || item.slug || "(untitled)";
  }

  return (
    <div>
      <Link href="/collections" className="text-sm text-amber-400 hover:underline">
        ← Collections
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{collection.name}</h1>
          <p className="mt-1 font-mono text-xs text-zinc-500">collectionKey: {collection.key}</p>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {/* Fields */}
      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Fields</h2>
          <button onClick={() => setFieldForm(fieldForm ? null : { ...EMPTY_FIELD_FORM })} className="text-sm text-amber-400 hover:underline">
            {fieldForm ? "Cancel" : "+ Add field"}
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Defines what data each item in this collection holds — shapes the item form below.</p>

        {fieldForm && (
          <form onSubmit={handleAddField} className="mt-3 grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Key (used in the item&apos;s data)</label>
              <input
                required
                value={fieldForm.key}
                onChange={(e) => setFieldForm({ ...fieldForm, key: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })}
                placeholder="e.g. title"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Label</label>
              <input
                required
                value={fieldForm.label}
                onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                placeholder="e.g. Title"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Type</label>
              <select
                value={fieldForm.type}
                onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value as CollectionFieldType })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {fieldForm.type === "SELECT" && (
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Choices (comma-separated)</label>
                <input
                  value={fieldForm.selectOptions}
                  onChange={(e) => setFieldForm({ ...fieldForm, selectOptions: e.target.value })}
                  placeholder="e.g. Design, Development, Marketing"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={fieldForm.required} onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })} />
              Required
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
                {saving ? "Adding…" : "Add Field"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/50 text-zinc-400">
              <tr>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Required</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {collection.fields.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-zinc-500">
                    No fields yet — add at least a &quot;title&quot; field to get useful cards in the builder.
                  </td>
                </tr>
              )}
              {collection.fields.map((f: CollectionField) => (
                <tr key={f.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2 font-mono text-xs">{f.key}</td>
                  <td className="px-3 py-2">{f.label}</td>
                  <td className="px-3 py-2 text-zinc-400">{f.type}</td>
                  <td className="px-3 py-2">{f.required ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => handleDeleteField(f.id, f.label)} className="text-xs text-red-400 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Items */}
      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Items</h2>
          <button onClick={startNewItem} disabled={collection.fields.length === 0} className="text-sm text-amber-400 hover:underline disabled:opacity-40">
            + Add item
          </button>
        </div>
        {collection.fields.length === 0 && <p className="mt-1 text-xs text-zinc-500">Add at least one field above before adding items.</p>}

        {editingItem && (
          <form onSubmit={handleSaveItem} className="mt-3 grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Slug (optional)</label>
                <input
                  value={editingItem.slug}
                  onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Status</label>
                <select
                  value={editingItem.status}
                  onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as CollectionItemStatus })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Order</label>
                <input
                  type="number"
                  value={editingItem.order}
                  onChange={(e) => setEditingItem({ ...editingItem, order: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {collection.fields.map((field) => (
              <ItemFieldInput
                key={field.id}
                field={field}
                value={editingItem.data[field.key]}
                onChange={(v) => setEditingItem({ ...editingItem, data: { ...editingItem.data, [field.key]: v } })}
              />
            ))}

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
                {saving ? "Saving…" : "Save Item"}
              </button>
              <button type="button" onClick={() => setEditingItem(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/50 text-zinc-400">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {collection.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-zinc-500">
                    No items yet.
                  </td>
                </tr>
              )}
              {collection.items.map((item) => (
                <tr key={item.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2">{itemSummary(item)}</td>
                  <td className="px-3 py-2">
                    <span className={item.status === "PUBLISHED" ? "text-emerald-400" : "text-zinc-500"}>{item.status === "PUBLISHED" ? "Published" : "Draft"}</span>
                  </td>
                  <td className="px-3 py-2">{item.order}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => startEditItem(item)} className="mr-2 text-xs text-amber-400 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} className="text-xs text-red-400 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ItemFieldInput({ field, value, onChange }: { field: CollectionField; value: unknown; onChange: (v: unknown) => void }) {
  const label = `${field.label}${field.required ? " *" : ""}`;

  if (field.type === "BOOLEAN") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
    );
  }

  if (field.type === "RICH_TEXT" || field.type === "JSON") {
    return (
      <div>
        <label className="mb-1 block text-xs text-zinc-400">{label}</label>
        <textarea
          required={field.required}
          rows={4}
          value={typeof value === "string" ? value : value ? JSON.stringify(value) : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
      </div>
    );
  }

  if (field.type === "SELECT") {
    const choices = Array.isArray(field.options) ? (field.options as string[]) : [];
    return (
      <div>
        <label className="mb-1 block text-xs text-zinc-400">{label}</label>
        <select
          required={field.required}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        >
          <option value="">—</option>
          {choices.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "NUMBER") {
    return (
      <div>
        <label className="mb-1 block text-xs text-zinc-400">{label}</label>
        <input
          type="number"
          required={field.required}
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
      </div>
    );
  }

  if (field.type === "DATE") {
    return (
      <div>
        <label className="mb-1 block text-xs text-zinc-400">{label}</label>
        <input
          type="date"
          required={field.required}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
      </div>
    );
  }

  // TEXT, IMAGE, IMAGE_LIST, REFERENCE — plain text input (IMAGE/IMAGE_LIST
  // take a media URL string; a dedicated media picker is the same follow-up
  // as everywhere else a raw URL field precedes one, see Gallery's usage
  // finder note).
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">
        {label}
        {(field.type === "IMAGE" || field.type === "IMAGE_LIST") && <span className="ml-1 text-zinc-600">(image URL)</span>}
      </label>
      <input
        required={field.required}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
      />
    </div>
  );
}
