"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, getToken, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Set only when the account has 2FA enabled — the password step above has
  // already succeeded at that point, and this second form collects the
  // authenticator code (or a backup code) to actually complete sign-in.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.login(email, password);
      if ("twoFactorRequired" in result) {
        setChallengeToken(result.challengeToken);
        setLoading(false);
        return;
      }
      setToken(result.token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeToken) return;
    setError(null);
    setLoading(true);
    try {
      const { token } = await api.loginWith2fa(challengeToken, code);
      setToken(token);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      {challengeToken ? (
        <form onSubmit={handleCodeSubmit} className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h1 className="text-xl font-semibold">Two-Factor Verification</h1>
          <p className="mt-1 text-sm text-zinc-400">Enter the 6-digit code from your authenticator app, or one of your backup codes.</p>

          <div className="mt-6">
            <label htmlFor="code" className="mb-1 block text-xs font-medium text-zinc-400">
              Authentication Code
            </label>
            <input
              id="code"
              type="text"
              inputMode="text"
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-center text-lg tracking-[0.3em] focus:border-amber-400 focus:outline-none"
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            {loading ? "Verifying…" : "Verify & Sign In"}
          </button>
          <button
            type="button"
            onClick={() => {
              setChallengeToken(null);
              setCode("");
              setError(null);
            }}
            className="mt-3 w-full text-center text-xs text-zinc-500 hover:text-zinc-300"
          >
            ← Back to sign in
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h1 className="text-xl font-semibold">
            Marwa <span className="text-amber-400">Digital</span> Admin
          </h1>
          <p className="mt-1 text-sm text-zinc-400">Sign in to manage your site content.</p>

          <div className="mt-6 flex flex-col gap-3">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-zinc-400">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium text-zinc-400">
                  Password
                </label>
                <a href="/forgot-password" className="text-xs text-amber-400 hover:underline">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      )}
    </main>
  );
}
