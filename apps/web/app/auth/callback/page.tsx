"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Auth, MICROSOFT_REDIRECT_URI } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function CallbackPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Signing in…</p>}>
      <CallbackView />
    </Suspense>
  );
}

function CallbackView() {
  const router = useRouter();
  const params = useSearchParams();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorDesc = params.get("error_description");

    if (error) {
      setErr(`${error}${errorDesc ? `: ${errorDesc}` : ""}`);
      return;
    }
    if (!code) {
      setErr("Missing authorization code");
      return;
    }
    const expectedState = sessionStorage.getItem("lms.oauth.state");
    if (!state || state !== expectedState) {
      setErr("State mismatch — possible CSRF. Please try again.");
      return;
    }
    const codeVerifier = sessionStorage.getItem("lms.oauth.pkce") ?? undefined;
    sessionStorage.removeItem("lms.oauth.state");
    sessionStorage.removeItem("lms.oauth.pkce");

    Auth.microsoftCallback(code, MICROSOFT_REDIRECT_URI, codeVerifier)
      .then((res) => {
        saveSession(res.accessToken);
        router.replace("/");
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Sign-in failed"));
  }, [params, router]);

  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-xl font-semibold">Signing in…</h1>
      {err ? (
        <div className="space-y-2">
          <p className="text-sm text-red-400">{err}</p>
          <a href="/login" className="text-sm underline">Back to sign in</a>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">Hang tight, completing sign-in.</p>
      )}
    </div>
  );
}
