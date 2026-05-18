"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Notifications, Reports, type CourseReport, type OrgOverview } from "@/lib/api";
import { getSession, hasRole } from "@/lib/auth";

export default function ReportsHomePage() {
  const router = useRouter();
  const [overview, setOverview] = useState<OrgOverview | null>(null);
  const [courses, setCourses] = useState<CourseReport[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [runningReminders, setRunningReminders] = useState(false);
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);

  async function runReminders() {
    setRunningReminders(true);
    setReminderFeedback(null);
    try {
      await Notifications.runScheduler();
      setReminderFeedback("Reminder workflow ran. Affected learners now have inbox messages.");
    } catch (e) {
      setReminderFeedback(e instanceof Error ? e.message : "Failed to run reminders");
    } finally {
      setRunningReminders(false);
    }
  }

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    if (!hasRole("ROLE_ADMIN") && !hasRole("ROLE_HR")) {
      router.push("/");
      return;
    }
    Promise.all([Reports.overview(), Reports.courses()])
      .then(([o, c]) => {
        setOverview(o);
        setCourses(c);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load reports"));
  }, [router]);

  const filtered = (courses ?? []).filter((c) =>
    !filter || c.courseTitle.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-[var(--muted)]">
            Track adoption, completion, and quiz performance across your organization.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runReminders}
            disabled={runningReminders}
            className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm hover:bg-[var(--panel-2)] disabled:opacity-50"
            title="Manually trigger the daily reminder workflow"
          >
            {runningReminders ? "Running…" : "Run reminders now"}
          </button>
          <Link
            href="/reports/overdue"
            className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm hover:bg-[var(--panel-2)]"
          >
            Overdue queue
            {overview && overview.overdueEnrollments > 0 ? (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {overview.overdueEnrollments}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
      {reminderFeedback ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
          {reminderFeedback}
        </div>
      ) : null}

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      <section className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Active learners" value={overview?.totalLearners} />
        <StatTile label="Active assignments" value={overview?.activeEnrollments} />
        <StatTile label="Completed" value={overview?.completedEnrollments} accent="success" />
        <StatTile
          label="Overdue"
          value={overview?.overdueEnrollments}
          accent={overview && overview.overdueEnrollments > 0 ? "danger" : undefined}
        />
        <StatTile label="Total courses" value={overview?.totalCourses} />
        <StatTile label="Published" value={overview?.publishedCourses} />
        <StatTile label="Quiz attempts" value={overview?.totalQuizAttempts} />
        <StatTile
          label="Quiz pass rate"
          value={
            overview && overview.totalQuizAttempts > 0
              ? `${Math.round(
                  (overview.passedQuizAttempts * 100) / overview.totalQuizAttempts,
                )}%`
              : "—"
          }
          accent="info"
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Courses</h2>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by title…"
            className="input min-w-[16rem]"
          />
        </div>
        {courses === null ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No courses match.</p>
        ) : (
          <div className="table-card">
            <table className="table-dense">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Enrolled</th>
                  <th>Completion</th>
                  <th>Overdue</th>
                  <th>Mandatory</th>
                  <th>Avg progress</th>
                  <th>Quiz avg</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.courseId}>
                    <td>
                      <Link
                        href={`/reports/courses/${c.courseId}`}
                        className="font-medium hover:underline"
                      >
                        {c.courseTitle}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={
                          "chip " +
                          (c.status === "PUBLISHED"
                            ? "chip-success"
                            : c.status === "ARCHIVED"
                            ? "chip-warn"
                            : "chip-muted")
                        }
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="tabular-nums">{c.totalEnrolled}</td>
                    <td>
                      <CompletionBar completed={c.completed} total={c.totalEnrolled} />
                    </td>
                    <td>
                      {c.overdue > 0 ? (
                        <span className="chip chip-danger">{c.overdue}</span>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">0</span>
                      )}
                    </td>
                    <td className="text-xs text-[var(--muted)]">
                      {c.mandatoryEnrolled > 0
                        ? `${c.mandatoryCompleted}/${c.mandatoryEnrolled}`
                        : "—"}
                    </td>
                    <td className="text-xs tabular-nums text-[var(--muted)]">
                      {c.avgProgressPct}%
                    </td>
                    <td className="text-xs tabular-nums text-[var(--muted)]">
                      {c.avgQuizScorePct != null
                        ? `${c.avgQuizScorePct}% (${c.totalQuizAttempts})`
                        : "—"}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/reports/courses/${c.courseId}`}
                        className="btn-mini"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string | undefined;
  accent?: "success" | "danger" | "info";
}) {
  const tone =
    accent === "danger"
      ? "border-red-300 bg-red-50"
      : accent === "success"
      ? "border-emerald-200 bg-emerald-50"
      : accent === "info"
      ? "border-blue-200 bg-blue-50"
      : "border-[var(--border)] bg-[var(--panel)]";
  return (
    <div className={`rounded-lg border ${tone} p-4 shadow-sm`}>
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value ?? "—"}</div>
    </div>
  );
}

function CompletionBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  if (total === 0) return <span className="text-xs text-[var(--muted)]">no assignments</span>;
  const pct = Math.round((completed * 100) / total);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full bg-[var(--success)]"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <span className="w-16 text-right text-xs tabular-nums text-[var(--muted)]">
        {completed}/{total} ({pct}%)
      </span>
    </div>
  );
}
