"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Reports, type LearnerReport } from "@/lib/api";
import { getSession, hasRole } from "@/lib/auth";

export default function LearnerReportPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<LearnerReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    if (!hasRole("ROLE_ADMIN") && !hasRole("ROLE_HR")) {
      router.push("/");
      return;
    }
    Reports.learner(params.id)
      .then(setReport)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [params.id, router]);

  if (err) return <p className="text-sm text-[var(--danger)]">{err}</p>;
  if (!report) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-6 py-2">
      <div>
        <Link href="/reports" className="text-sm text-[var(--muted)] hover:underline">
          ← Reports
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{report.userName ?? report.userEmail ?? "Learner"}</h1>
        <p className="text-sm text-[var(--muted)]">{report.userEmail ?? "—"}</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        <Tile label="Total enrollments" value={report.totalEnrollments} />
        <Tile label="Completed" value={report.completedEnrollments} accent="success" />
        <Tile
          label="Overdue"
          value={report.overdueEnrollments}
          accent={report.overdueEnrollments > 0 ? "danger" : undefined}
        />
        <Tile label="Quiz attempts" value={report.totalAttempts} />
        <Tile
          label="Quiz passes"
          value={report.passedAttempts}
          accent={report.passedAttempts > 0 ? "info" : undefined}
        />
        <Tile
          label="Avg quiz score"
          value={report.avgQuizScorePct != null ? `${report.avgQuizScorePct}%` : "—"}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Course assignments</h2>
        {report.enrollments.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No course assignments.</p>
        ) : (
          <div className="table-card">
            <table className="table-dense">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Mandatory</th>
                  <th>Due</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {report.enrollments.map((e) => {
                  const statusChip =
                    e.status === "COMPLETED"
                      ? "chip chip-success"
                      : e.overdue
                      ? "chip chip-danger"
                      : e.status === "IN_PROGRESS"
                      ? "chip chip-info"
                      : e.status === "WAIVED"
                      ? "chip chip-muted"
                      : "chip chip-warn";
                  return (
                    <tr key={e.id}>
                      <td>
                        <Link
                          href={`/reports/courses/${e.courseId}`}
                          className="font-medium hover:underline"
                        >
                          {e.courseTitle}
                        </Link>
                      </td>
                      <td>
                        <span className={statusChip}>
                          {e.overdue && e.status !== "COMPLETED" ? "OVERDUE" : e.status}
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
                      <td>{e.mandatory ? <span className="chip chip-warn">YES</span> : "—"}</td>
                      <td className="text-xs text-[var(--muted)]">
                        {e.dueAt ? new Date(e.dueAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="text-xs text-[var(--muted)]">
                        {e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent quiz attempts</h2>
        {report.recentAttempts.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No quiz attempts yet.</p>
        ) : (
          <div className="table-card">
            <table className="table-dense">
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Score</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {report.recentAttempts.map((a) => (
                  <tr key={a.id}>
                    <td className="text-xs text-[var(--muted)]">
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}
                    </td>
                    <td className="tabular-nums">
                      {a.score ?? "—"}/{a.maxScore ?? "—"}{" "}
                      <span className="text-xs text-[var(--muted)]">({a.scorePct ?? 0}%)</span>
                    </td>
                    <td>
                      <span
                        className={
                          "chip " + (a.passed ? "chip-success" : "chip-warn")
                        }
                      >
                        {a.passed ? "PASSED" : "FAILED"}
                      </span>
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

function Tile({
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
