"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MICROSOFT_CLIENT_ID,
  buildMicrosoftAuthorizeUrl,
} from "@/lib/api";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const configured = !!MICROSOFT_CLIENT_ID;

  async function signIn() {
    setBusy(true);
    try {
      const state = crypto.randomUUID();
      sessionStorage.setItem("lms.oauth.state", state);
      const { url, codeVerifier } = await buildMicrosoftAuthorizeUrl(state);
      sessionStorage.setItem("lms.oauth.pkce", codeVerifier);
      window.location.href = url;
    } catch {
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
              <span className="h-1.5 w-1.5 rounded-full bg-[#2bb6ff]" />
              Employee Learning Platform
            </span>
            <h2 className="mt-6 text-4xl font-semibold leading-tight">
              Grow your skills.
              <br />
              <span className="text-[#2bb6ff]">Power your career.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/80">
              Access curated courses, AI-generated learning paths, and
              certifications — all in one place, tailored for your role.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/85">
              <Feature icon="book">Hundreds of role-based courses & paths</Feature>
              <Feature icon="spark">AI course generation in seconds</Feature>
              <Feature icon="chart">Track progress & earn certifications</Feature>
              <Feature icon="team">Learn alongside your team</Feature>
            </ul>
          </div>

          <div className="relative z-10 mt-10 flex items-end justify-between gap-6">
            <Image
              src="/login-hero.svg"
              alt=""
              width={420}
              height={420}
              priority
              className="max-w-[360px] drop-shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
            />
            <blockquote className="hidden max-w-[200px] text-xs italic text-white/70 xl:block">
              “Our team finishes onboarding 3× faster since switching to IDC
              Digital LMS.”
              <footer className="mt-2 not-italic text-white/50">
                — Learning &amp; Development
              </footer>
            </blockquote>
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
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Sign in with your work account to continue your learning journey.
            </p>

            <button
              onClick={signIn}
              disabled={busy || !configured}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--panel-2)] hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MicrosoftMark />
              {busy ? "Redirecting…" : "Continue with Microsoft"}
            </button>

            {!configured ? (
              <div className="mt-3 rounded-md border border-[var(--danger)]/30 bg-orange-50 p-3 text-xs text-[var(--danger)]">
                Microsoft sign-in is not configured. Set{" "}
                <code className="rounded bg-white/60 px-1">
                  NEXT_PUBLIC_MS_CLIENT_ID
                </code>{" "}
                and tenant in <code className="rounded bg-white/60 px-1">.env.local</code>,
                plus the matching client secret on auth-service.
              </div>
            ) : null}

            <div className="mt-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs uppercase tracking-wider text-[var(--muted)]">
                or
              </span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <Link
              href="/login/admin"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-[var(--panel)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:bg-[var(--panel-2)]"
            >
              <LockIcon /> Administrator sign-in
            </Link>

            <p className="mt-10 text-center text-xs text-[var(--muted)]">
              By continuing you agree to IDC Digital&apos;s acceptable use
              policy. Need help?{" "}
              <a
                href="mailto:learning@idcdigital.com"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Contact L&amp;D
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Feature({
  icon,
  children,
}: {
  icon: "book" | "spark" | "chart" | "team";
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 ring-1 ring-inset ring-white/15">
        <FeatureIcon name={icon} />
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function FeatureIcon({ name }: { name: "book" | "spark" | "chart" | "team" }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "text-[#2bb6ff]",
  };
  switch (name) {
    case "book":
      return (
        <svg {...common}>
          <path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" />
          <path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
          <path d="M15 20c0-2 1.7-3.5 4-3.5S23 18 23 20" />
        </svg>
      );
  }
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 21 21"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
