"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SESSION_CHANGED_EVENT,
  getSession,
  type Session,
} from "@/lib/auth";

/**
 * Role-aware top nav. Links are hidden from users who'd hit a 403 or a
 * client-side role gate anyway, so the chrome reflects what each user
 * can actually do. Sign-in / sign-out events flip the nav live in the
 * same tab via the lms:session-changed custom event.
 */
export function AppNav() {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    function load() {
      setSession(getSession());
    }
    load();
    setHydrated(true);
    window.addEventListener("storage", load);
    window.addEventListener(SESSION_CHANGED_EVENT, load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener(SESSION_CHANGED_EVENT, load);
    };
  }, []);

  // Server render + initial client render before useEffect hydrate: keep
  // empty so the markup matches and there's no flash of admin links.
  if (!hydrated) return <nav className="flex items-center gap-5 text-sm" />;

  const roles = session?.roles ?? [];
  const has = (...needed: string[]) => needed.some((r) => roles.includes(r));

  const canAuthor = has("ROLE_ADMIN", "ROLE_HR", "ROLE_INSTRUCTOR");
  const canManageTeam = has("ROLE_ADMIN", "ROLE_HR", "ROLE_MANAGER");
  const canReports = has("ROLE_ADMIN", "ROLE_HR");
  const canAdmin = has("ROLE_ADMIN");

  return (
    <nav className="flex flex-wrap items-center gap-5 text-sm">
      {session ? (
        <Link href="/my-learning" className="hover:text-[var(--header-accent)]">
          My Learning
        </Link>
      ) : null}
      {canManageTeam ? (
        <Link href="/team" className="hover:text-[var(--header-accent)]">
          My Team
        </Link>
      ) : null}
      {session ? (
        <Link href="/catalog" className="hover:text-[var(--header-accent)]">
          Catalog
        </Link>
      ) : null}
      {canAuthor ? (
        <>
          <Link href="/courses" className="hover:text-[var(--header-accent)]">
            Courses
          </Link>
          <Link href="/learning-paths" className="hover:text-[var(--header-accent)]">
            Paths
          </Link>
        </>
      ) : null}
      {canReports ? (
        <Link href="/reports" className="hover:text-[var(--header-accent)]">
          Reports
        </Link>
      ) : null}
      {canAdmin ? (
        <Link href="/admin/users" className="hover:text-[var(--header-accent)]">
          Admin
        </Link>
      ) : null}
    </nav>
  );
}
