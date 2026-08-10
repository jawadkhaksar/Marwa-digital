"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(email);
      // Always shown regardless of whether the account exists — the API
      // itself never reveals that, so the UI can't either.
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-zinc-400">Enter your account email and we&apos;ll send you a reset link.</p>

        {sent ? (
          <p className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            If that email has an account, a password reset link has been sent. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Email</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-300 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <a href="/login" className="mt-4 block text-center text-xs text-zinc-500 hover:text-zinc-300">
          ← Back to sign in
        </a>
      </div>
    </main>
  );
}
