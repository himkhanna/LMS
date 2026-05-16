"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Auth } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await Auth.login(email, password);
      saveSession(res.accessToken, email);
      router.push("/admin/users");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Admin sign in</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Password-based sign-in for administrators only. Regular users sign in with{" "}
          <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">Microsoft</Link>.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-sm">
            <span className="block pb-1 text-[var(--muted)]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded border border-[var(--border)] bg-white px-3 py-2 text-[var(--text)]"
            />
          </label>
          <label className="block text-sm">
            <span className="block pb-1 text-[var(--muted)]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded border border-[var(--border)] bg-white px-3 py-2 text-[var(--text)]"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full rounded bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}
        </form>
      </div>
    </div>
  );
}
