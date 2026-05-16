"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MICROSOFT_CLIENT_ID,
  buildMicrosoftAuthorizeUrl,
} from "@/lib/api";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const configured = !!MICROSOFT_CLIENT_ID;

  function signIn() {
    const state = crypto.randomUUID();
    sessionStorage.setItem("lms.oauth.state", state);
    setBusy(true);
    window.location.href = buildMicrosoftAuthorizeUrl(state);
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--text)]">Sign in to IDC Digital LMS</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Use your work or school account.
        </p>
        <button
          onClick={signIn}
          disabled={busy || !configured}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--panel-2)] disabled:opacity-50"
        >
          <MicrosoftMark />
          {busy ? "Redirecting…" : "Sign in with Microsoft"}
        </button>
        {!configured ? (
          <p className="mt-3 text-xs text-[var(--danger)]">
            Microsoft sign-in is not configured. Set{" "}
            <code>NEXT_PUBLIC_MS_CLIENT_ID</code> and tenant in{" "}
            <code>.env.local</code>, plus the matching client secret on auth-service.
          </p>
        ) : null}
        <div className="mt-6 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
          Administrator?{" "}
          <Link href="/login/admin" className="font-medium text-[var(--accent)] hover:underline">
            Sign in with password
          </Link>
        </div>
      </div>
    </div>
  );
}

function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
