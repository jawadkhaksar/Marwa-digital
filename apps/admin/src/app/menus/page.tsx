"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { ImagePicker } from "@/components/ImagePicker";
import { api, type Menu, type MenuItem, type Page, type SiteSettings, type Category } from "@/lib/api";

// Reserved slugs that already have their own dedicated "Home"/"Contact"
// core routes — hidden from the Pages picker so there's exactly one
// obvious way to link to them (the hardcoded core links below).
const CORE_OVERRIDE_SLUGS = new Set(["core-home", "core-contact"]);
const CORE_LINKS = [
  { label: "Home", href: "/" },
  { label: "Blog", href: "/blog" },
  { label: "Contact Us", href: "/contact" },
];

interface ItemWithDepth extends MenuItem {
  depth: number;
}

/** Depth-first flatten: each item followed immediately by its own children, sorted by `order` within each parent group — the display order a nested menu list actually renders in. */
function visualOrder(items: MenuItem[]): ItemWithDepth[] {
  const byParent = new Map<string | null, MenuItem[]>();
  for (const item of items) {
    const key = item.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(item);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order - b.order);

  const result: ItemWithDepth[] = [];
  function walk(parentId: string | null, depth: number) {
    for (const item of byParent.get(parentId) ?? []) {
      result.push({ ...item, depth });
      walk(item.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

export default function MenusPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <MenusContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function MenusContent() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [menuName, setMenuName] = useState("");
  const [autoAddPages, setAutoAddPages] = useState(false);
  const [showInFooter, setShowInFooter] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [creatingMenu, setCreatingMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [checkedPageSlugs, setCheckedPageSlugs] = useState<Set<string>>(new Set());
  const [checkedCategorySlugs, setCheckedCategorySlugs] = useState<Set<string>>(new Set());
  const [showPagesPanel, setShowPagesPanel] = useState(true);
  const [showCategoriesPanel, setShowCategoriesPanel] = useState(false);
  const [showCustomPanel, setShowCustomPanel] = useState(false);

  function loadMenus(selectId?: string) {
    api
      .getMenus()
      .then((list) => {
        setMenus(list);
        const target = selectId ?? selectedMenuId ?? list[0]?.id ?? null;
        if (target) setSelectedMenuId(target);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load menus"));
  }

  // `loadMenus` closes over `selectedMenuId` only to preserve the current
  // selection across a refresh — this should still run once on mount, not
  // every time the selection changes (that would refetch the whole list on
  // every click).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadMenus, []);
  useEffect(() => {
    api.getPages().then(setPages).catch(() => {});
    api.getSettings().then(setSettings).catch(() => {});
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedMenuId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([]);
      setMenuName("");
      return;
    }
    api
      .getMenu(selectedMenuId)
      .then((menu) => {
        setItems(menu.items ?? []);
        setMenuName(menu.name);
        setAutoAddPages(menu.autoAddPages);
        setShowInFooter(menu.showInFooter);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load menu"));
  }, [selectedMenuId]);

  const ordered = useMemo(() => visualOrder(items), [items]);
  const selectablePages = pages.filter((p) => !CORE_OVERRIDE_SLUGS.has(p.slug));

  async function persistReorder(next: MenuItem[]) {
    if (!selectedMenuId) return;
    setItems(next);
    try {
      const menu = await api.reorderMenuItems(
        selectedMenuId,
        next.map((i) => ({ id: i.id, parentId: i.parentId, order: i.order }))
      );
      setItems(menu.items ?? next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reorder items");
    }
  }

  /** Renumbers `order` sequentially (0,1,2…) within each parent group, preserving current relative order. */
  function renumber(list: MenuItem[]): MenuItem[] {
    const counters = new Map<string | null, number>();
    return visualOrder(list).map((item) => {
      const n = counters.get(item.parentId) ?? 0;
      counters.set(item.parentId, n + 1);
      return {
        id: item.id,
        menuId: item.menuId,
        parentId: item.parentId,
        label: item.label,
        href: item.href,
        cssClasses: item.cssClasses,
        openInNewTab: item.openInNewTab,
        active: item.active,
        order: n,
        previewImage: item.previewImage,
      };
    });
  }

  function moveItem(id: string, direction: "up" | "down") {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const siblings = items.filter((i) => i.parentId === item.parentId).sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((i) => i.id === id);
    const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
    if (!swapWith) return;
    const next = items.map((i) => {
      if (i.id === item.id) return { ...i, order: swapWith.order };
      if (i.id === swapWith.id) return { ...i, order: item.order };
      return i;
    });
    persistReorder(renumber(next));
  }

  function indentItem(id: string) {
    const order = ordered;
    const index = order.findIndex((i) => i.id === id);
    if (index <= 0) return;
    const item = order[index];
    if (item.depth > 0) return; // already nested — this system supports one level only
    // Find the previous TOP-LEVEL item to nest under (skip over its existing children).
    let prevTopLevel: ItemWithDepth | null = null;
    for (let i = index - 1; i >= 0; i--) {
      if (order[i].depth === 0) {
        prevTopLevel = order[i];
        break;
      }
    }
    if (!prevTopLevel) return;
    const newSiblingOrder = items.filter((i) => i.parentId === prevTopLevel!.id).length;
    const next = items.map((i) => (i.id === id ? { ...i, parentId: prevTopLevel!.id, order: newSiblingOrder } : i));
    persistReorder(renumber(next));
  }

  function outdentItem(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item || !item.parentId) return;
    const parent = items.find((i) => i.id === item.parentId);
    const newOrder = items.filter((i) => i.parentId === (parent?.parentId ?? null)).length;
    const next = items.map((i) => (i.id === id ? { ...i, parentId: parent?.parentId ?? null, order: newOrder } : i));
    persistReorder(renumber(next));
  }

  async function addItems(newOnes: { label: string; href: string }[]) {
    if (!selectedMenuId || newOnes.length === 0) return;
    setError(null);
    const startOrder = items.filter((i) => !i.parentId).length;
    try {
      const created = await Promise.all(
        newOnes.map((n, idx) => api.createMenuItem(selectedMenuId, { label: n.label, href: n.href, order: startOrder + idx }))
      );
      setItems((prev) => [...prev, ...created]);
      setExpandedItemId(created[created.length - 1]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item(s)");
    }
  }

  async function updateItem(id: string, patch: Partial<MenuItem>) {
    if (!selectedMenuId) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    try {
      await api.updateMenuItem(selectedMenuId, id, patch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item");
    }
  }

  async function removeItem(id: string) {
    if (!selectedMenuId) return;
    if (!confirm("Remove this menu item? Its own sub-items (if any) will move up a level.")) return;
    try {
      await api.deleteMenuItem(selectedMenuId, id);
      const menu = await api.getMenu(selectedMenuId);
      setItems(menu.items ?? []);
      setExpandedItemId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item");
    }
  }

  async function handleSaveMenu() {
    if (!selectedMenuId) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateMenu(selectedMenuId, { name: menuName, autoAddPages });
      loadMenus(selectedMenuId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save menu");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePrimary(checked: boolean) {
    try {
      const updated = await api.updateSettings({ primaryMenuId: checked ? selectedMenuId : null });
      setSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update primary menu");
    }
  }

  async function handleToggleFooter(checked: boolean) {
    if (!selectedMenuId) return;
    setShowInFooter(checked);
    try {
      await api.updateMenu(selectedMenuId, { showInFooter: checked });
      loadMenus(selectedMenuId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update footer assignment");
      setShowInFooter(!checked);
    }
  }

  async function handleCreateMenu() {
    if (!newMenuName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const menu = await api.createMenu({ name: newMenuName.trim() });
      setNewMenuName("");
      setCreatingMenu(false);
      loadMenus(menu.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create menu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMenu() {
    if (!selectedMenuId) return;
    if (!confirm(`Delete "${menuName}"? This can't be undone.`)) return;
    try {
      await api.deleteMenu(selectedMenuId);
      setSelectedMenuId(null);
      loadMenus();
      api.getSettings().then(setSettings).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete menu");
    }
  }

  const isPrimary = settings?.primaryMenuId === selectedMenuId && selectedMenuId !== null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Menus</h1>
          <p className="mt-1 text-sm text-zinc-300">Controls the header navigation and any Nav Menu blocks that reference a menu by name.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMenuId ?? ""}
            onChange={(e) => setSelectedMenuId(e.target.value || null)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m._count?.items ?? 0})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCreatingMenu((s) => !s)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            + New Menu
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {creatingMenu && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <input
            value={newMenuName}
            onChange={(e) => setNewMenuName(e.target.value)}
            placeholder="Menu name (e.g. Footer Menu)"
            className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <button onClick={handleCreateMenu} disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
            Create Menu
          </button>
          <button onClick={() => setCreatingMenu(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
            Cancel
          </button>
        </div>
      )}

      {selectedMenuId && (
        <div className="mt-4 grid grid-cols-[280px_1fr] gap-4">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-zinc-200">Add menu items</h2>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950">
              <button
                type="button"
                onClick={() => setShowPagesPanel((s) => !s)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-zinc-200"
              >
                Pages <span className="text-zinc-500">{showPagesPanel ? "▲" : "▼"}</span>
              </button>
              {showPagesPanel && (
                <div className="border-t border-zinc-800 p-3">
                  <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                    {CORE_LINKS.map((link) => (
                      <label key={link.href} className="flex items-center gap-2 text-xs text-zinc-300">
                        <input
                          type="checkbox"
                          checked={checkedPageSlugs.has(`core:${link.href}`)}
                          onChange={(e) => {
                            const next = new Set(checkedPageSlugs);
                            if (e.target.checked) next.add(`core:${link.href}`);
                            else next.delete(`core:${link.href}`);
                            setCheckedPageSlugs(next);
                          }}
                        />
                        {link.label}
                      </label>
                    ))}
                    {selectablePages.map((p) => (
                      <label key={p.slug} className="flex items-center gap-2 text-xs text-zinc-300">
                        <input
                          type="checkbox"
                          checked={checkedPageSlugs.has(p.slug)}
                          onChange={(e) => {
                            const next = new Set(checkedPageSlugs);
                            if (e.target.checked) next.add(p.slug);
                            else next.delete(p.slug);
                            setCheckedPageSlugs(next);
                          }}
                        />
                        {p.title}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={checkedPageSlugs.size === 0}
                    onClick={() => {
                      const toAdd = [...checkedPageSlugs].map((key) =>
                        key.startsWith("core:")
                          ? { label: CORE_LINKS.find((l) => l.href === key.slice(5))!.label, href: key.slice(5) }
                          : { label: pages.find((p) => p.slug === key)!.title, href: `/${key}` }
                      );
                      addItems(toAdd);
                      setCheckedPageSlugs(new Set());
                    }}
                    className="mt-2 w-full rounded-lg border border-zinc-700 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Add to Menu
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950">
              <button
                type="button"
                onClick={() => setShowCategoriesPanel((s) => !s)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-zinc-200"
              >
                Blog Categories <span className="text-zinc-500">{showCategoriesPanel ? "▲" : "▼"}</span>
              </button>
              {showCategoriesPanel && (
                <div className="border-t border-zinc-800 p-3">
                  <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                    {categories.length === 0 && <p className="text-xs text-zinc-600">No categories yet.</p>}
                    {categories.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-xs text-zinc-300">
                        <input
                          type="checkbox"
                          checked={checkedCategorySlugs.has(c.slug)}
                          onChange={(e) => {
                            const next = new Set(checkedCategorySlugs);
                            if (e.target.checked) next.add(c.slug);
                            else next.delete(c.slug);
                            setCheckedCategorySlugs(next);
                          }}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={checkedCategorySlugs.size === 0}
                    onClick={() => {
                      const toAdd = [...checkedCategorySlugs].map((slug) => {
                        const c = categories.find((x) => x.slug === slug)!;
                        return { label: c.name, href: `/blog?category=${c.slug}` };
                      });
                      addItems(toAdd);
                      setCheckedCategorySlugs(new Set());
                    }}
                    className="mt-2 w-full rounded-lg border border-zinc-700 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Add to Menu
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950">
              <button
                type="button"
                onClick={() => setShowCustomPanel((s) => !s)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-zinc-200"
              >
                Custom Links <span className="text-zinc-500">{showCustomPanel ? "▲" : "▼"}</span>
              </button>
              {showCustomPanel && (
                <div className="border-t border-zinc-800 p-3">
                  <label className="mb-1 block text-[11px] text-zinc-500">URL</label>
                  <input
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://"
                    className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                  />
                  <label className="mb-1 block text-[11px] text-zinc-500">Link Text</label>
                  <input
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={!customUrl || !customLabel}
                    onClick={() => {
                      addItems([{ label: customLabel, href: customUrl }]);
                      setCustomUrl("");
                      setCustomLabel("");
                    }}
                    className="w-full rounded-lg border border-zinc-700 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Add to Menu
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Menu structure</h2>
            <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <label className="mb-1 block text-xs text-zinc-400">Menu Name</label>
              <input
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                className="mb-4 w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />

              {ordered.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                  No items yet — add some from the left panel.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {ordered.map((item) => (
                    <div key={item.id} style={{ marginLeft: item.depth * 28 }}>
                      <div className={`rounded-lg border ${item.active ? "border-zinc-800 bg-zinc-900" : "border-zinc-800/50 bg-zinc-900/40"} px-3 py-2`}>
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                            className="min-w-0 flex-1 truncate text-left text-sm"
                          >
                            <span className={item.active ? "text-zinc-100" : "text-zinc-500 line-through"}>{item.label}</span>
                            {item.depth > 0 && <span className="ml-2 text-[10px] italic text-zinc-500">sub item</span>}
                          </button>
                          <div className="flex shrink-0 items-center gap-0.5 text-zinc-400">
                            <button type="button" title="Move up" onClick={() => moveItem(item.id, "up")} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">↑</button>
                            <button type="button" title="Move down" onClick={() => moveItem(item.id, "down")} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">↓</button>
                            {item.depth === 0 ? (
                              <button type="button" title="Nest under previous item" onClick={() => indentItem(item.id)} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">→</button>
                            ) : (
                              <button type="button" title="Move to top level" onClick={() => outdentItem(item.id)} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">←</button>
                            )}
                            <button type="button" title="Expand" onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-zinc-200">
                              {expandedItemId === item.id ? "▲" : "▼"}
                            </button>
                          </div>
                        </div>

                        {expandedItemId === item.id && (
                          <div className="mt-3 flex flex-col gap-2 border-t border-zinc-800 pt-3">
                            <div>
                              <label className="mb-1 block text-[11px] text-zinc-500">URL</label>
                              <input
                                value={item.href}
                                onChange={(e) => updateItem(item.id, { href: e.target.value })}
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] text-zinc-500">Navigation Label</label>
                              <input
                                value={item.label}
                                onChange={(e) => updateItem(item.id, { label: e.target.value })}
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] text-zinc-500">CSS Classes (optional)</label>
                              <input
                                value={item.cssClasses ?? ""}
                                onChange={(e) => updateItem(item.id, { cssClasses: e.target.value || null })}
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <ImagePicker
                                label="Preview Image (shown in this item's dropdown, next to Sub Item list)"
                                images={item.previewImage ? [item.previewImage] : []}
                                onChange={(images) => updateItem(item.id, { previewImage: images[images.length - 1] ?? null })}
                                category="menus"
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-xs text-zinc-300">
                                <input type="checkbox" checked={item.openInNewTab} onChange={(e) => updateItem(item.id, { openInNewTab: e.target.checked })} />
                                Open in new tab
                              </label>
                              <label className="flex items-center gap-2 text-xs text-zinc-300">
                                <input type="checkbox" checked={item.active} onChange={(e) => updateItem(item.id, { active: e.target.checked })} />
                                Active
                              </label>
                            </div>
                            <button type="button" onClick={() => removeItem(item.id)} className="mt-1 w-fit text-xs text-red-400 hover:underline">
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-3 text-[11px] text-zinc-600">
                Items save automatically. Nesting supports one level (dropdown submenus in the Nav Menu block) — use → to nest under the previous top-level item, ← to promote back out.
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-200">Menu Settings</h3>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={autoAddPages} onChange={(e) => setAutoAddPages(e.target.checked)} />
                Automatically add new top-level pages to this menu
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={isPrimary} onChange={(e) => handleTogglePrimary(e.target.checked)} />
                Use as the site&apos;s primary menu (renders in the header nav)
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={showInFooter} onChange={(e) => handleToggleFooter(e.target.checked)} />
                Show in the footer (replaces the &quot;Quick Links&quot; column)
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={handleSaveMenu} disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
                {saving ? "Saving…" : "Save Menu"}
              </button>
              <button onClick={handleDeleteMenu} className="text-sm text-red-400 hover:underline">
                Delete Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
