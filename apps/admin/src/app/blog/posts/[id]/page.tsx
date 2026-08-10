"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImagePicker } from "@/components/ImagePicker";
import { RevisionHistoryModal } from "@/components/RevisionHistoryModal";
import { api, type Category, type Tag, type PostStatus, type PageEditorMode, type AdminUser } from "@/lib/api";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
const EMPTY_LAYOUT = { version: 1 as const, nodes: [] };

const POST_FORMATS = [
  { value: "STANDARD", label: "Standard" },
  { value: "GALLERY", label: "Gallery" },
  { value: "VIDEO", label: "Video" },
  { value: "QUOTE", label: "Quote" },
];

/**
 * Staging & Scheduled Publishing for the classic post editor — snapshots the
 * form's current `content` into stagedContent (leaving whatever's live
 * untouched) via POST /api/admin/posts/:id/stage, distinct from this page's
 * own Status dropdown + Save button (which still writes straight to the
 * live post, unchanged). See PublishStatusControls.tsx for the Page
 * Builder's equivalent.
 */
function PostStagingControls({ postId, content, slug }: { postId: string; content: string; slug: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function handleStage() {
    withBusy(async () => {
      await api.stagePost(postId, { content });
      setMessage("Staged draft saved — production is unaffected until you publish it.");
    });
  }

  function handlePublishStaged() {
    withBusy(async () => {
      await api.publishPost(postId);
      setMessage("Staged draft published.");
    });
  }

  async function handlePreview() {
    try {
      const { token, slug: postSlug } = await api.getPostPreviewToken(postId);
      window.open(`${WEB_URL}/blog/${postSlug}?previewToken=${token}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create a preview link");
    }
  }

  function handleSchedule() {
    if (!scheduleValue) return;
    withBusy(async () => {
      await api.schedulePost(postId, new Date(scheduleValue).toISOString());
      setMessage("Staged draft scheduled.");
      setScheduling(false);
    });
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Staging &amp; Scheduled Publishing</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleStage} disabled={busy} className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">
          Save as Staged Draft
        </button>
        <button type="button" onClick={handlePreview} className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800">
          Staging Preview Link
        </button>
        <div className="relative">
          <button type="button" onClick={() => setScheduling((v) => !v)} className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800">
            Schedule…
          </button>
          {scheduling && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-950 p-3 shadow-2xl">
              <label className="mb-1 block text-[11px] text-zinc-500">Publish staged draft at</label>
              <input
                type="datetime-local"
                value={scheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none [color-scheme:dark]"
              />
              <button type="button" onClick={handleSchedule} disabled={busy || !scheduleValue} className="mt-2 w-full rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
                Schedule
              </button>
            </div>
          )}
        </div>
        <button type="button" onClick={handlePublishStaged} disabled={busy} className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50">
          Publish Staged
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-emerald-400">{message}</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <p className="mt-2 text-[11px] text-zinc-600">/blog/{slug || "…"}</p>
    </div>
  );
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "post";
}

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  featuredImage: string;
  editorMode: PageEditorMode;
  content: string;
  authorId: string;
  categoryIds: string[];
  tagIds: string[];
  status: PostStatus;
  publishedAt: string; // datetime-local value
  isFeatured: boolean;
  format: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  slug: "",
  excerpt: "",
  featuredImage: "",
  editorMode: "CLASSIC",
  content: "",
  authorId: "",
  categoryIds: [],
  tagIds: [],
  status: "DRAFT",
  publishedAt: "",
  isFeatured: false,
  format: "STANDARD",
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  ogImage: "",
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostEditorPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <PostEditorContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function PostEditorContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === "new";

  const [form, setForm] = useState<FormState | null>(isNew ? EMPTY_FORM : null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [authors, setAuthors] = useState<AdminUser[]>([]);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [readingTime, setReadingTime] = useState<number | null>(null);
  const [slugForPreview, setSlugForPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [aiSeoLoading, setAiSeoLoading] = useState(false);
  const [aiSeoError, setAiSeoError] = useState<string | null>(null);

  async function handleAiGenerateSeo() {
    if (!form) return;
    setAiSeoLoading(true);
    setAiSeoError(null);
    try {
      const result = await api.aiGenerateSeo({ title: form.title, content: form.excerpt || form.content });
      setForm((f) => (f ? { ...f, metaTitle: result.metaTitle, metaDescription: result.metaDescription } : f));
    } catch (err) {
      setAiSeoError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setAiSeoLoading(false);
    }
  }

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
    api.getTags().then(setTags).catch(() => {});
    api.getUsers().then(setAuthors).catch(() => {});
  }, []);

  // Writing Settings' Default Post Category/Format — only applied to a
  // brand-new, still-untouched post, never overwrites an existing one.
  useEffect(() => {
    if (!isNew) return;
    api
      .getSettings()
      .then((settings) => {
        setForm((f) =>
          f
            ? {
                ...f,
                categoryIds: settings.defaultPostCategoryId ? [settings.defaultPostCategoryId] : f.categoryIds,
                format: settings.defaultPostFormat || f.format,
              }
            : f
        );
      })
      .catch(() => {});
  }, [isNew]);

  const loadPost = useCallback(() => {
    if (isNew) return;
    api
      .getPost(params.id)
      .then((p) => {
        setForm({
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt ?? "",
          featuredImage: p.featuredImage ?? "",
          editorMode: p.editorMode,
          content: p.content ?? "",
          authorId: p.author?.id ?? "",
          categoryIds: p.categories.map((c) => c.id),
          tagIds: p.tags.map((t) => t.id),
          status: p.status,
          publishedAt: toDatetimeLocal(p.publishedAt),
          isFeatured: p.isFeatured,
          format: p.format,
          metaTitle: p.metaTitle ?? "",
          metaDescription: p.metaDescription ?? "",
          canonicalUrl: p.canonicalUrl ?? "",
          ogImage: p.ogImage ?? "",
        });
        setReadingTime(p.readingTime);
        setSlugForPreview(p.slug);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load post"));
  }, [isNew, params.id]);

  useEffect(loadPost, [loadPost]);

  function updateTitle(title: string) {
    setForm((f) => (f ? { ...f, title, slug: slugTouched ? f.slug : slugify(title) } : f));
  }

  function toggleId(key: "categoryIds" | "tagIds", id: string) {
    setForm((f) => {
      if (!f) return f;
      const set = new Set(f[key]);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...f, [key]: Array.from(set) };
    });
  }

  async function save(nextStatus?: PostStatus) {
    if (!form) return;
    setSaving(true);
    setError(null);

    const status = nextStatus ?? form.status;
    if (status === "SCHEDULED" && !form.publishedAt) {
      setError("Set a publish date/time for a scheduled post.");
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title,
      slug: form.slug.trim() || slugify(form.title),
      excerpt: form.excerpt || null,
      editorMode: form.editorMode,
      content: form.content,
      layout: form.editorMode === "BUILDER" ? EMPTY_LAYOUT : undefined,
      featuredImage: form.featuredImage || null,
      authorId: form.authorId || null,
      categoryIds: form.categoryIds,
      tagIds: form.tagIds,
      status,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      isFeatured: form.isFeatured,
      format: form.format,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      canonicalUrl: form.canonicalUrl || null,
      ogImage: form.ogImage || null,
    };

    try {
      if (isNew) {
        const created = await api.createPost(payload);
        router.replace(`/blog/posts/${created.id}`);
      } else {
        const updated = await api.updatePost(params.id, payload);
        setForm((f) => (f ? { ...f, status: updated.status } : f));
        setReadingTime(updated.readingTime);
        setSlugForPreview(updated.slug);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew || !confirm("Delete this post?")) return;
    try {
      await api.deletePost(params.id);
      router.replace("/blog/posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    }
  }

  if (!form) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <Link href="/blog/posts" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← All Posts
        </Link>
        <div className="flex items-center gap-4">
          {!isNew && (
            <button type="button" onClick={() => setRevisionsOpen(true)} className="text-xs text-zinc-500 hover:text-amber-400 hover:underline">
              Revision History
            </button>
          )}
          {!isNew && slugForPreview && (
            <a href={`${WEB_URL}/blog/${slugForPreview}`} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-amber-400 hover:underline">
              Preview →
            </a>
          )}
        </div>
      </div>
      <h1 className="mt-2 text-2xl font-semibold">{isNew ? "Add New Post" : "Edit Post"}</h1>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm((f) => (f ? { ...f, slug: e.target.value } : f));
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">{WEB_URL}/blog/{form.slug || slugify(form.title)}</p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Excerpt</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => setForm((f) => (f ? { ...f, excerpt: e.target.value } : f))}
            rows={2}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
        </div>

        <ImagePicker
          label="Featured Image"
          images={form.featuredImage ? [form.featuredImage] : []}
          onChange={(images) => setForm((f) => (f ? { ...f, featuredImage: images[images.length - 1] ?? "" } : f))}
          category="blog"
        />

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Content Editor</label>
          <div className="flex gap-1 rounded-lg border border-zinc-700 bg-zinc-950 p-1 text-xs">
            {(["CLASSIC", "BUILDER"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setForm((f) => (f ? { ...f, editorMode: mode } : f))}
                className={`flex-1 rounded-md py-1.5 font-semibold transition-colors ${
                  form.editorMode === mode ? "bg-amber-400 text-white" : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {mode === "CLASSIC" ? "Classic / Rich Text" : "Visual Builder"}
              </button>
            ))}
          </div>
        </div>

        {form.editorMode === "CLASSIC" ? (
          <RichTextEditor value={form.content} onChange={(content) => setForm((f) => (f ? { ...f, content } : f))} />
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 p-4 text-sm text-zinc-400">
            {isNew ? (
              <>Save this post once to switch to the Visual Builder canvas for its body content.</>
            ) : (
              <>
                This post&apos;s body will render as an empty Visual Builder canvas. Full block-editing for posts (the
                same canvas used for Pages) isn&apos;t wired into this editor yet — ask to have it added as a follow-up
                if you need it. Classic mode above is fully functional in the meantime.
              </>
            )}
          </div>
        )}

        {readingTime !== null && <p className="text-xs text-zinc-500">Estimated reading time: {readingTime} min (auto-calculated on save)</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Author</label>
            <select
              value={form.authorId}
              onChange={(e) => setForm((f) => (f ? { ...f, authorId: e.target.value } : f))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            >
              <option value="">— None —</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => (f ? { ...f, status: e.target.value as PostStatus } : f))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            >
              <option value="DRAFT">Draft</option>
              <option value="STAGED">Staged / Preview Ready</option>
              <option value="PUBLISHED">Published</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
          </div>
        </div>

        {!isNew && <PostStagingControls postId={params.id} content={form.content} slug={form.slug} />}

        {(form.status === "SCHEDULED" || form.status === "PUBLISHED") && (
          <div>
            <label className="mb-1 block text-xs text-zinc-400">
              {form.status === "SCHEDULED" ? "Publish At (required)" : "Published At"}
            </label>
            <input
              type="datetime-local"
              value={form.publishedAt}
              onChange={(e) => setForm((f) => (f ? { ...f, publishedAt: e.target.value } : f))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => (f ? { ...f, isFeatured: e.target.checked } : f))} />
          Featured (shown in the blog listing&apos;s hero banner)
        </label>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Format</label>
          <select
            value={form.format}
            onChange={(e) => setForm((f) => (f ? { ...f, format: e.target.value } : f))}
            className="w-48 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            {POST_FORMATS.map((fmt) => (
              <option key={fmt.value} value={fmt.value}>
                {fmt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Categories</label>
            <div className="flex flex-col gap-1 rounded-lg border border-zinc-700 bg-zinc-950 p-2 max-h-40 overflow-y-auto">
              {categories.length === 0 && <p className="text-xs text-zinc-600">No categories yet.</p>}
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-xs text-zinc-300">
                  <input type="checkbox" checked={form.categoryIds.includes(c.id)} onChange={() => toggleId("categoryIds", c.id)} />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Tags</label>
            <div className="flex flex-col gap-1 rounded-lg border border-zinc-700 bg-zinc-950 p-2 max-h-40 overflow-y-auto">
              {tags.length === 0 && <p className="text-xs text-zinc-600">No tags yet.</p>}
              {tags.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-xs text-zinc-300">
                  <input type="checkbox" checked={form.tagIds.includes(t.id)} onChange={() => toggleId("tagIds", t.id)} />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-400">SEO</h3>
            <button
              type="button"
              onClick={handleAiGenerateSeo}
              disabled={aiSeoLoading || !(form.excerpt || form.content)}
              className="flex items-center gap-1 rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/10 disabled:opacity-50"
            >
              {aiSeoLoading ? "Generating…" : "✨ Auto-Generate with AI"}
            </button>
          </div>
          {aiSeoError && <p className="mb-2 text-xs text-red-400">{aiSeoError}</p>}
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">SEO Title</label>
              <input
                type="text"
                value={form.metaTitle}
                onChange={(e) => setForm((f) => (f ? { ...f, metaTitle: e.target.value } : f))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">SEO Description</label>
              <textarea
                value={form.metaDescription}
                onChange={(e) => setForm((f) => (f ? { ...f, metaDescription: e.target.value } : f))}
                rows={2}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Canonical URL</label>
              <input
                type="text"
                value={form.canonicalUrl}
                onChange={(e) => setForm((f) => (f ? { ...f, canonicalUrl: e.target.value } : f))}
                placeholder="Leave blank to use this post's own URL"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
            </div>
            <ImagePicker
              label="OG Image (social share preview)"
              images={form.ogImage ? [form.ogImage] : []}
              onChange={(images) => setForm((f) => (f ? { ...f, ogImage: images[images.length - 1] ?? "" } : f))}
              category="blog"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-zinc-800 pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => save("DRAFT")}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("PUBLISHED")}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Publish"}
          </button>
          {!isNew && (
            <button type="button" onClick={handleDelete} className="ml-auto text-sm text-red-400 hover:underline">
              Delete Post
            </button>
          )}
        </div>
      </div>

      {revisionsOpen && !isNew && (
        <RevisionHistoryModal entityType="POST" entityId={params.id} onClose={() => setRevisionsOpen(false)} onRestored={loadPost} />
      )}
    </div>
  );
}
