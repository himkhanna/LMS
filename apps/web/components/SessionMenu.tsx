"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession, getSession, type Session } from "@/lib/auth";

export function SessionMenu() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(getSession());
    const onStorage = () => setSession(getSession());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function signOut() {
    clearSession();
    setSession(null);
    router.push("/login");
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
      >
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-[var(--header-accent)] sm:inline">
        {session.displayName ?? session.email}
      </span>
      <button
        onClick={signOut}
        className="rounded border border-white/30 px-3 py-1 text-xs text-white hover:bg-white/10"
      >
        Sign out
      </button>
    </div>
  );
}
