"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Reports, type TeamReport } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function TeamPage() {
  const router = useRouter();
  const [report, setReport] = useState<TeamReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    Reports.team()
      .then(setReport)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [router]);

  if (err) return <p className="text-sm text-[var(--danger)]">{err}</p>;
  if (!report) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const session = getSession();
  if (report.totalReports === 0) {
    return (
      <div className="space-y-4 py-2">
        <h1 className="text-2xl font-semibold">My team</h1>
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)] p-8 text-center">
          <p className="text-sm">No direct reports.</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            People who list <span className="font-medium">{session?.email}</span> as their manager
            will appear here automatically. Admins can set Manager email from the
            Users admin page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-semibold">My team</h1>
        <p className="text-sm text-[var(--muted)]">
          Learning progress for your direct reports.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        <Tile label="Direct reports" value={report.totalReports} />
        <Tile label="Active assignments" value={report.activeEnrollments} accent="info" />
        <Tile label="Completed" value={report.completedEnrollments} accent="success" />
        <Tile
          label="Overdue"
          value={report.overdueEnrollments}
          accent={report.overdueEnrollments > 0 ? "danger" : undefined}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Direct reports</h2>
        <div className="table-card">
          <table className="table-dense">
            <thead>
              <tr>
                <th>Person</th>
                <th>Department</th>
                <th>Total</th>
                <th>Active</th>
                <th>Completed</th>
                <th>Overdue</th>
                <th>Avg progress</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {report.directReports.map((r) => (
                <tr key={r.userId}>
                  <td>
                    <Link
                      href={`/reports/learners/${r.userId}`}
                      className="font-medium hover:underline"
                    >
                      {r.userName ?? r.userEmail}
                    </Link>
                    <div className="text-xs text-[var(--muted)]">{r.userEmail}</div>
                  </td>
                  <td className="text-xs text-[var(--muted)]">{r.department ?? "—"}</td>
                  <td className="tabular-nums">{r.totalEnrollments}</td>
                  <td className="tabular-nums">{r.activeEnrollments}</td>
                  <td className="tabular-nums text-[var(--success)]">{r.completedEnrollments}</td>
                  <td>
                    {r.overdueEnrollments > 0 ? (
                      <span className="chip chip-danger">{r.overdueEnrollments}</span>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">0</span>
                    )}
                  </td>
                  <td className="w-32">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-full bg-[var(--accent)]"
                          style={{ width: `${Math.max(2, r.avgProgressPct)}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs tabular-nums text-[var(--muted)]">
                        {r.avgProgressPct}%
                      </span>
                    </div>
                  </td>
                  <td className="text-right">
                    <Link href={`/reports/learners/${r.userId}`} className="btn-mini">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  value: number;
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
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
