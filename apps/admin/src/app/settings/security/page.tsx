"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, ApiError, type SessionUser } from "@/lib/api";

function passwordStrength(pw: string): { label: string; colorClass: string; textClass: string; score: number } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { label: "Weak", colorClass: "bg-red-500", textClass: "text-red-400", score };
  if (score <= 3) return { label: "Okay", colorClass: "bg-amber-400", textClass: "text-amber-300", score };
  return { label: "Strong", colorClass: "bg-emerald-500", textClass: "text-emerald-400", score };
}

export default function SecuritySettingsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <SecuritySettingsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function SecuritySettingsContent() {
  const [me, setMe] = useState<SessionUser | null>(null);

  const load = () => api.getMe().then(setMe).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Security</h1>
      <p className="mt-1 text-sm text-zinc-300">Manage your own password and two-factor authentication.</p>

      <div className="mt-6 flex flex-col gap-6">
        <PasswordChangeForm />
        <TwoFactorSection me={me} onChange={load} />
      </div>
    </div>
  );
}

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const strength = passwordStrength(newPassword);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">Change Password</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Changing your password signs out any other device currently logged in.</p>
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">Current Password</label>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-400">New Password</label>
        <input
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
        {newPassword && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex h-1 flex-1 gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-full flex-1 rounded-full ${i < strength.score ? strength.colorClass : "bg-zinc-800"}`} />
              ))}
            </div>
            <span className={`text-[11px] font-medium ${strength.textClass}`}>{strength.label}</span>
          </div>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Confirm New Password</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {saved && <p className="text-sm text-emerald-400">Password changed.</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Change Password"}
      </button>
    </form>
  );
}

function TwoFactorSection({ me, onChange }: { me: SessionUser | null; onChange: () => void }) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Two-Factor Authentication</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Require a 6-digit code from an authenticator app (Google Authenticator, 1Password, Authy) in addition to your password.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            me?.twoFactorEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {me?.twoFactorEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <div className="mt-4">
        {me?.twoFactorEnabled ? (
          <button
            onClick={() => setDisableOpen(true)}
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10"
          >
            Disable Two-Factor Authentication
          </button>
        ) : (
          <button
            onClick={() => setSetupOpen(true)}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300"
          >
            Enable Two-Factor Authentication
          </button>
        )}
      </div>

      {setupOpen && (
        <TwoFactorSetupModal
          onClose={() => setSetupOpen(false)}
          onEnabled={() => {
            setSetupOpen(false);
            onChange();
          }}
        />
      )}
      {disableOpen && (
        <TwoFactorDisableModal
          onClose={() => setDisableOpen(false)}
          onDisabled={() => {
            setDisableOpen(false);
            onChange();
          }}
        />
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function TwoFactorSetupModal({ onClose, onEnabled }: { onClose: () => void; onEnabled: () => void }) {
  const [step, setStep] = useState<"loading" | "scan" | "backupCodes" | "error">("loading");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    api
      .setup2fa()
      .then((res) => {
        setQrCodeDataUrl(res.qrCodeDataUrl);
        setSecret(res.secret);
        setStep("scan");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to start setup");
        setStep("error");
      });
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      const res = await api.verify2fa(code);
      setBackupCodes(res.backupCodes);
      setStep("backupCodes");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Incorrect code");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Modal onClose={step === "backupCodes" ? onEnabled : onClose}>
      <h3 className="text-lg font-semibold">Set Up Two-Factor Authentication</h3>

      {step === "loading" && <p className="mt-6 text-sm text-zinc-500">Generating your secret key…</p>}
      {step === "error" && <p className="mt-6 text-sm text-red-400">{error}</p>}

      {step === "scan" && (
        <form onSubmit={handleVerify} className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-zinc-400">1. Scan this QR code with your authenticator app.</p>
          {/* Server-generated data: URL, not a static asset — a plain <img> is correct here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeDataUrl} alt="Two-factor authentication QR code" className="mx-auto h-44 w-44 rounded-lg bg-white p-2" />
          <p className="text-center text-xs text-zinc-500">
            Can&apos;t scan it? Enter this key manually: <span className="font-mono text-zinc-300">{secret}</span>
          </p>

          <p className="text-sm text-zinc-400">2. Enter the 6-digit code it generates.</p>
          <input
            type="text"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-lg tracking-[0.3em] focus:border-amber-400 focus:outline-none"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={verifying}
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Verify & Enable"}
          </button>
        </form>
      )}

      {step === "backupCodes" && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-emerald-400">Two-factor authentication is now enabled.</p>
          <p className="text-sm text-zinc-400">
            Save these one-time backup codes somewhere safe — each can be used once to sign in if you lose access to your authenticator app.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm">
            {backupCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <button onClick={onEnabled} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300">
            I&apos;ve saved my backup codes
          </button>
        </div>
      )}
    </Modal>
  );
}

function TwoFactorDisableModal({ onClose, onDisabled }: { onClose: () => void; onDisabled: () => void }) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.disable2fa(password, code);
      onDisabled();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to disable two-factor authentication");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-semibold">Disable Two-Factor Authentication</h3>
      <p className="mt-1 text-sm text-zinc-400">Confirm your password and a current authentication code to turn this off.</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Password</label>
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Authentication Code or Backup Code</label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          {loading ? "Disabling…" : "Disable Two-Factor Authentication"}
        </button>
      </form>
    </Modal>
  );
}
