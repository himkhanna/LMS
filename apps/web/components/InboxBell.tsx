"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Notifications } from "@/lib/api";
import { getSession } from "@/lib/auth";

const POLL_MS = 60_000;

export function InboxBell() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!getSession()) return;
    let cancelled = false;
    function poll() {
      Notifications.unreadCount()
        .then((r) => {
          if (!cancelled) setCount(r.unread);
        })
        .catch(() => {
          // ignore — non-fatal
        });
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!getSession()) return null;

  return (
    <Link
      href="/inbox"
      className="relative flex items-center text-sm hover:text-[var(--header-accent)]"
      aria-label="Inbox"
      title="Inbox"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {count != null && count > 0 ? (
        <span className="absolute -right-2 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-4 text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
