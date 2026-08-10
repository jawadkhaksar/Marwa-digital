"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type BackupType, type SystemBackup, type SystemBackupListResult } from "@/lib/api";

const BACKUP_TYPES: { value: BackupType; label: string; description: string }[] = [
  { value: "FULL", label: "Create Full Backup", description: "Database content + /uploads media" },
  { value: "DATABASE_ONLY", label: "Database Dump Only", description: "Content & configuration, no media files" },
  { value: "UPLOADS_ONLY", label: "Uploads Only", description: "Media library files only" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const STATUS_STYLES: Record<SystemBackup["status"], string> = {
  PENDING: "border border-blue-500/40 bg-blue-500/15 text-blue-300",
  COMPLETED: "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  FAILED: "border border-red-500/40 bg-red-500/15 text-red-300",
};

export default function SystemBackupsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <BackupsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function BackupsContent() {
  const [result, setResult] = useState<SystemBackupListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState<BackupType | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<SystemBackup | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [restoreDone, setRestoreDone] = useState<string | null>(null);

  const load = useCallback(() => {
    api.getBackups().then(setResult).catch((err) => setError(err instanceof Error ? err.message : "Failed to load backups"));
  }, []);
  useEffect(load, [load]);

  async function handleGenerate(type: BackupType) {
    setGenerating(type);
    setError(null);
    try {
      await api.generateBackup(type);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate backup");
    } finally {
      setGenerating(null);
    }
  }

  async function handleDownload(backup: SystemBackup) {
    try {
      await api.downloadBackup(backup);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function handleDelete(backup: SystemBackup) {
    if (!confirm(`Delete backup "${backup.filename}"? This cannot be undone.`)) return;
    setBusyId(backup.id);
    try {
      await api.deleteBackup(backup.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete backup");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore() {
    if (!confirmRestore) return;
    setBusyId(confirmRestore.id);
    setError(null);
    try {
      await api.restoreBackup(confirmRestore.id);
      setRestoreDone(confirmRestore.filename);
      setConfirmRestore(null);
      setRestoreConfirmText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Backups &amp; Disaster Recovery</h1>
      <p className="mt-1 text-sm text-zinc-300">
        Snapshot the site&apos;s content, configuration, and media library, and restore from a previous snapshot if something goes wrong.
      </p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {restoreDone && (
        <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Restored from &quot;{restoreDone}&quot;. Refresh any open admin pages to see the restored data.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Total Backups</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">{result?.total ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Last Backup</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">
            {result?.lastBackupAt ? new Date(result.lastBackupAt).toLocaleDateString() : "Never"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Storage Used</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">{formatBytes(result?.totalStorageBytes ?? 0)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {BACKUP_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => handleGenerate(t.value)}
            disabled={generating !== null}
            title={t.description}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
          >
            {generating === t.value ? "Generating…" : t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2">Filename</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Size</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {(!result || result.items.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  No backups yet — create one above.
                </td>
              </tr>
            )}
            {result?.items.map((b) => (
              <tr key={b.id} className="border-t border-zinc-800">
                <td className="px-4 py-2 font-mono text-xs">{b.filename}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">{b.type.replace("_", " ")}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">{new Date(b.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">{formatBytes(b.fileSize)}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[b.status]}`}>{b.status}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => handleDownload(b)} disabled={b.status !== "COMPLETED"} className="mr-3 text-xs text-amber-400 hover:underline disabled:opacity-40">
                    Download
                  </button>
                  <button
                    onClick={() => setConfirmRestore(b)}
                    disabled={b.status !== "COMPLETED" || busyId === b.id}
                    className="mr-3 text-xs text-blue-400 hover:underline disabled:opacity-40"
                  >
                    Restore
                  </button>
                  <button onClick={() => handleDelete(b)} disabled={busyId === b.id} className="text-xs text-red-400 hover:underline disabled:opacity-40">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setConfirmRestore(null)}>
          <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-zinc-950 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-red-400">Restore System State?</h2>
            <p className="mt-2 text-sm text-zinc-300">
              This will <strong>overwrite the current database content</strong> with the snapshot from{" "}
              <span className="font-mono text-xs">{confirmRestore.filename}</span>. This cannot be undone. Type{" "}
              <span className="font-mono">RESTORE</span> to confirm.
            </p>
            <input
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
              placeholder="RESTORE"
              className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmRestore(null);
                  setRestoreConfirmText("");
                }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={restoreConfirmText !== "RESTORE" || busyId === confirmRestore.id}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-40"
              >
                {busyId === confirmRestore.id ? "Restoring…" : "Restore System State"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
