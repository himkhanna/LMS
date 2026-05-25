"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession, getSession, SESSION_CHANGED_EVENT, type Session } from "@/lib/auth";

export function SessionMenu() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    function load() {
      setSession(getSession());
    }
    load();
    setHydrated(true);
    // 'storage' fires in OTHER tabs; the custom event covers same-tab.
    window.addEventListener("storage", load);
    window.addEventListener(SESSION_CHANGED_EVENT, load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener(SESSION_CHANGED_EVENT, load);
    };
  }, []);

  function signOut() {
    clearSession();
    setSession(null);
    router.push("/login");
  }

  // Avoid a Sign-in/Sign-out flash before localStorage hydrates.
  if (!hydrated) return <span />;

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
