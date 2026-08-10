"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";

function passwordStrength(pw: string): { label: string; className: string; score: number } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { label: "Weak", className: "bg-red-500 text-red-400", score };
  if (score <= 3) return { label: "Okay", className: "bg-amber-400 text-amber-300", score };
  return { label: "Strong", className: "bg-emerald-500 text-emerald-400", score };
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
        This reset link is missing its token. Request a new one from the sign-in page.
      </p>
    );
  }

  if (done) {
    return (
      <div className="mt-6">
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          Your password has been reset. Any other signed-in sessions have been logged out.
        </p>
        <a href="/login" className="mt-4 block w-full rounded-lg bg-amber-400 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-amber-300">
          Sign In
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">New Password</label>
        <input
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
        {password && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex h-1 flex-1 gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-full flex-1 rounded-full ${i < strength.score ? strength.className.split(" ")[0] : "bg-zinc-800"}`} />
              ))}
            </div>
            <span className={`text-[11px] font-medium ${strength.className.split(" ")[1]}`}>{strength.label}</span>
          </div>
        )}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Confirm Password</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-300 disabled:opacity-50"
      >
        {loading ? "Resetting…" : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-zinc-400">Choose a strong password you haven&apos;t used before.</p>
        <Suspense fallback={<p className="mt-6 text-sm text-zinc-500">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
