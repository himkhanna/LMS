"use client";

import { useState } from "react";
import Image from "next/image";
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
    <div className="-mx-4 -my-6 min-h-[calc(100vh-140px)]">
      <div className="grid min-h-[calc(100vh-140px)] grid-cols-1 lg:grid-cols-2">
        {/* Hero panel */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#0a1e44] via-[#10295a] to-[#1e63f2] px-10 py-14 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,rgba(43,182,255,0.45),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(255,176,31,0.25),transparent_55%)]" />
          <div className="relative z-10 max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90 ring-1 ring-inset ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffb01f]" />
              Administrator Console
            </span>
            <h2 className="mt-6 text-4xl font-semibold leading-tight">
              Manage learning
              <br />
              <span className="text-[#2bb6ff]">at scale.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/80">
              Configure users, assign courses, monitor adoption and keep your
              organisation&apos;s learning programme on track.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/85">
              <Capability>Manage users, roles &amp; permissions</Capability>
              <Capability>Configure AI providers &amp; usage limits</Capability>
              <Capability>Audit activity and learning outcomes</Capability>
            </ul>
          </div>

          <div className="relative z-10 mt-10">
            <Image
              src="/login-hero.svg"
              alt=""
              width={360}
              height={360}
              priority
              className="max-w-[300px] drop-shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
            />
          </div>
        </section>

        {/* Form panel */}
        <section className="flex items-center justify-center bg-[var(--bg)] px-6 py-12 sm:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <Image
                src="/logo.svg"
                alt="IDC Digital"
                width={140}
                height={48}
                priority
              />
            </div>

            <h1 className="text-2xl font-semibold text-[var(--text)]">
              Administrator sign in
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Password-based access for system administrators. Employees should{" "}
              <Link
                href="/login"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                sign in with Microsoft
              </Link>
              .
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <label className="block text-sm">
                <span className="block pb-1.5 font-medium text-[var(--text)]">
                  Work email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="admin@company.com"
                  className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </label>
              <label className="block text-sm">
                <span className="block pb-1.5 font-medium text-[var(--text)]">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </label>
              <button
                type="submit"
                disabled={busy || !email || !password}
                className="w-full rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
              {err ? (
                <p className="rounded-md border border-[var(--danger)]/30 bg-orange-50 p-2 text-sm text-[var(--danger)]">
                  {err}
                </p>
              ) : null}
            </form>

            <p className="mt-10 text-center text-xs text-[var(--muted)]">
              Locked out?{" "}
              <a
                href="mailto:it-support@idcdigital.com"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Contact IT support
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Capability({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 ring-1 ring-inset ring-white/15">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#2bb6ff]"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
