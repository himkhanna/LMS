"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Notifications, Reports, type Enrollment } from "@/lib/api";
import { getSession, hasRole } from "@/lib/auth";

export default function OverduePage() {
  const router = useRouter();
  const [items, setItems] = useState<Enrollment[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mandatoryOnly, setMandatoryOnly] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    if (!hasRole("ROLE_ADMIN") && !hasRole("ROLE_HR")) {
      router.push("/");
      return;
    }
    Reports.overdue()
      .then(setItems)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [router]);

  const visible = useMemo(() => {
    if (!items) return null;
    return items.filter((e) => {
      if (mandatoryOnly && !e.mandatory) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !e.userEmail.toLowerCase().includes(s) &&
          !(e.userName?.toLowerCase().includes(s)) &&
          !e.courseTitle.toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [items, search, mandatoryOnly]);

  async function exportCsv() {
    try {
      await Reports.downloadOverdueCsv();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Download failed");
    }
  }

  return (
    <div className="space-y-6 py-2">
      <div>
        <Link href="/reports" className="text-sm text-[var(--muted)] hover:underline">
          ← Reports
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Overdue queue</h1>
          <p className="text-sm text-[var(--muted)]">
            Learners with assignments past their due date.
          </p>
        </div>
        <button onClick={exportCsv} className="btn-secondary">
          Export CSV
        </button>
      </div>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={mandatoryOnly}
            onChange={(e) => setMandatoryOnly(e.target.checked)}
          />
          Mandatory only
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by learner, email, or course…"
          className="input ml-auto min-w-[20rem]"
        />
      </div>

      {visible === null ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center">
          <p className="text-sm font-medium text-emerald-700">🎉 Nobody is overdue.</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="table-dense">
            <thead>
              <tr>
                <th>Learner</th>
                <th>Course</th>
                <th>Due</th>
                <th>Days overdue</th>
                <th>Progress</th>
                <th>Mandatory</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => {
                const days = e.dueAt
                  ? Math.max(
                      0,
                      Math.floor(
                        (Date.now() - new Date(e.dueAt).getTime()) / 86_400_000,
                      ),
                    )
                  : 0;
                return (
                  <tr key={e.id}>
                    <td>
                      <Link
                        href={`/reports/learners/${e.userId}`}
                        className="font-medium hover:underline"
                      >
                        {e.userName ?? e.userEmail}
                      </Link>
                      <div className="text-xs text-[var(--muted)]">{e.userEmail}</div>
                    </td>
                    <td>
                      <Link
                        href={`/reports/courses/${e.courseId}`}
                        className="hover:underline"
                      >
                        {e.courseTitle}
                      </Link>
                    </td>
                    <td className="text-xs text-[var(--muted)]">
                      {e.dueAt ? new Date(e.dueAt).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <span
                        className={
                          "chip " +
                          (days > 14 ? "chip-danger" : days > 3 ? "chip-warn" : "chip-muted")
                        }
                      >
                        {days}d
                      </span>
                    </td>
                    <td className="w-32">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                          <div
                            className="h-full bg-[var(--accent)]"
                            style={{ width: `${Math.max(2, e.progressPct)}%` }}
                          />
                        </div>
                        <span className="w-9 text-right text-xs tabular-nums text-[var(--muted)]">
                          {e.progressPct}%
                        </span>
                      </div>
                    </td>
                    <td>
                      {e.mandatory ? <span className="chip chip-warn">YES</span> : "—"}
                    </td>
                    <td className="text-right">
                      <ReminderButton e={e} />
                      {" "}
                      <Link href={`/reports/learners/${e.userId}`} className="btn-mini">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReminderButton({ e }: { e: Enrollment }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    if (busy) return;
    setBusy(true);
    try {
      const days = e.dueAt
        ? Math.max(
            0,
            Math.floor((Date.now() - new Date(e.dueAt).getTime()) / 86_400_000),
          )
        : 0;
      await Notifications.sendReminder(e.id, {
        channel: "IN_APP",
        subject: `Reminder: complete "${e.courseTitle}"`,
        body:
          `Hi ${e.userName ?? e.userEmail},\n\n` +
          `Your course "${e.courseTitle}" is ${days} day${days === 1 ? "" : "s"} overdue` +
          (e.mandatory ? " (mandatory training)" : "") +
          `.\nPlease complete it as soon as possible.`,
      });
      setSent(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reminder failed");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <span className="text-xs font-medium text-[var(--success)]">✓ Sent</span>
    );
  }
  return (
    <button onClick={send} disabled={busy} className="btn-mini">
      {busy ? "Sending…" : "Send reminder"}
    </button>
  );
}
