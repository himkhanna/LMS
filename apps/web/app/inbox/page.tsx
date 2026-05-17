"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Notifications, type AppNotification } from "@/lib/api";
import { getSession } from "@/lib/auth";

const TYPE_LABEL: Record<string, string> = {
  DUE_SOON: "Due soon",
  OVERDUE: "Overdue",
  ESCALATION: "Manager escalation",
  MANUAL: "From HR",
  COMPLETED: "Completed",
};

export default function InboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function reload() {
    setErr(null);
    try {
      setItems(await Notifications.mine(0, 100));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load inbox");
    }
  }

  async function markRead(id: string) {
    await Notifications.markRead(id);
    reload();
  }

  async function markAll() {
    await Notifications.markAllRead();
    reload();
  }

  const unreadCount = items?.filter((n) => n.status === "SENT").length ?? 0;

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inbox</h1>
          <p className="text-sm text-[var(--muted)]">
            Reminders, course updates, and messages from HR.
          </p>
        </div>
        {unreadCount > 0 ? (
          <button onClick={markAll} className="btn-secondary">
            Mark all as read
          </button>
        ) : null}
      </div>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      {items === null ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)] p-8 text-center">
          <p className="text-sm">Your inbox is empty.</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            We&apos;ll let you know when you have a course due, or a message from HR.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const unread = n.status === "SENT";
            const tone =
              n.type === "OVERDUE" || n.type === "ESCALATION"
                ? "border-red-200"
                : n.type === "DUE_SOON" || n.type === "MANUAL"
                ? "border-amber-200"
                : "border-emerald-200";
            return (
              <li
                key={n.id}
                className={`rounded-lg border ${tone} bg-[var(--panel)] p-4 shadow-sm ${
                  unread ? "border-l-4 border-l-[var(--accent)]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip chip-muted">{TYPE_LABEL[n.type] ?? n.type}</span>
                      {n.channel === "EMAIL" ? (
                        <span className="chip chip-muted">EMAIL</span>
                      ) : null}
                      {unread ? (
                        <span className="chip chip-info">NEW</span>
                      ) : null}
                      <span className="text-xs text-[var(--muted)]">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h2 className="mt-1 text-sm font-semibold">{n.subject}</h2>
                    <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-[var(--text)]">
                      {n.body}
                    </pre>
                    {n.courseId ? (
                      <Link
                        href={`/courses/${n.courseId}/preview`}
                        className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
                      >
                        Open course →
                      </Link>
                    ) : null}
                  </div>
                  {unread ? (
                    <button
                      onClick={() => markRead(n.id)}
                      className="btn-mini"
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
