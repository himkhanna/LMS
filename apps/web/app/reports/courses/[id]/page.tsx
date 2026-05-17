"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Reports,
  type CourseReport,
  type Enrollment,
  type EnrollmentStatus,
} from "@/lib/api";
import { getSession, hasRole } from "@/lib/auth";

const STATUS_FILTERS: { label: string; value: EnrollmentStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Waived", value: "WAIVED" },
];

export default function CourseReportPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [summary, setSummary] = useState<CourseReport | null>(null);
  const [roster, setRoster] = useState<Enrollment[] | null>(null);
  const [filter, setFilter] = useState<EnrollmentStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showMandatoryOnly, setShowMandatoryOnly] = useState(false);
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
    Reports.course(params.id)
      .then(setSummary)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load course report"));
  }, [params.id, router]);

  useEffect(() => {
    setRoster(null);
    Reports.roster(params.id, filter === "ALL" ? undefined : filter)
      .then(setRoster)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load roster"));
  }, [params.id, filter]);

  const visible = useMemo(() => {
    if (!roster) return null;
    return roster.filter((e) => {
      if (showOverdueOnly && !e.overdue) return false;
      if (showMandatoryOnly && !e.mandatory) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!e.userEmail.toLowerCase().includes(s)
            && !(e.userName?.toLowerCase().includes(s))) {
          return false;
        }
      }
      return true;
    });
  }, [roster, showOverdueOnly, showMandatoryOnly, search]);

  async function downloadCsv() {
    try {
      await Reports.downloadRosterCsv(params.id, filter === "ALL" ? undefined : filter);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Download failed");
    }
  }

  if (err && !summary) return <p className="text-sm text-[var(--danger)]">{err}</p>;

  return (
    <div className="space-y-6 py-2">
      <div>
        <Link href="/reports" className="text-sm text-[var(--muted)] hover:underline">
          ← Reports
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{summary?.courseTitle ?? "Loading…"}</h1>
          <p className="text-sm text-[var(--muted)]">
            Course report · {summary?.status ?? "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={summary ? `/courses/${summary.courseId}` : "#"}
            className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm hover:bg-[var(--panel-2)]"
          >
            Open course
          </Link>
          <button onClick={downloadCsv} className="btn-secondary">
            Export CSV
          </button>
        </div>
      </div>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      {summary ? (
        <section className="grid gap-3 sm:grid-cols-4">
          <Stat label="Total enrolled" value={summary.totalEnrolled} />
          <Stat label="Completed" value={summary.completed} accent="success" />
          <Stat label="In progress" value={summary.inProgress} accent="info" />
          <Stat
            label="Overdue"
            value={summary.overdue}
            accent={summary.overdue > 0 ? "danger" : undefined}
          />
          <Stat label="Avg progress" value={`${summary.avgProgressPct}%`} />
          <Stat
            label="Mandatory completion"
            value={
              summary.mandatoryEnrolled > 0
                ? `${summary.mandatoryCompleted}/${summary.mandatoryEnrolled}`
                : "—"
            }
          />
          <Stat label="Quiz attempts" value={summary.totalQuizAttempts} />
          <Stat
            label="Avg quiz score"
            value={summary.avgQuizScorePct != null ? `${summary.avgQuizScorePct}%` : "—"}
            accent="info"
          />
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  filter === f.value
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showOverdueOnly}
              onChange={(e) => setShowOverdueOnly(e.target.checked)}
            />
            Overdue only
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showMandatoryOnly}
              onChange={(e) => setShowMandatoryOnly(e.target.checked)}
            />
            Mandatory only
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name or email…"
            className="input ml-auto min-w-[14rem]"
          />
        </div>

        {visible === null ? (
          <p className="text-sm text-[var(--muted)]">Loading roster…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No learners match these filters.</p>
        ) : (
          <div className="table-card">
            <table className="table-dense">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Mandatory</th>
                  <th>Due</th>
                  <th>Completed</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <RosterRow key={e.id} e={e} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function RosterRow({ e }: { e: Enrollment }) {
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
  const statusLabel = e.overdue && e.status !== "COMPLETED" ? "OVERDUE" : e.status;
  return (
    <tr>
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
        <span className={statusChip}>{statusLabel}</span>
      </td>
      <td className="w-40">
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
      <td className="text-xs text-[var(--muted)]">
        {e.mandatory ? <span className="chip chip-warn">YES</span> : "—"}
      </td>
      <td className="text-xs text-[var(--muted)]">
        {e.dueAt ? new Date(e.dueAt).toLocaleDateString() : "—"}
      </td>
      <td className="text-xs text-[var(--muted)]">
        {e.completedAt ? new Date(e.completedAt).toLocaleDateString() : "—"}
      </td>
      <td className="text-right">
        <Link href={`/reports/learners/${e.userId}`} className="btn-mini">
          View
        </Link>
      </td>
    </tr>
  );
}

function Stat({
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
