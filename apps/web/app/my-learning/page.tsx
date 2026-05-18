"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Certificates,
  Enrollments,
  LearningPaths,
  type AppCertificate,
  type Enrollment,
  type EnrollmentStatus,
  type PathAssignment,
} from "@/lib/api";
import { getSession } from "@/lib/auth";

const FILTERS: { label: string; value: EnrollmentStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "To do", value: "ASSIGNED" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
];

export default function MyLearningPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<EnrollmentStatus | "ALL">("ALL");
  const [items, setItems] = useState<Enrollment[] | null>(null);
  const [paths, setPaths] = useState<PathAssignment[]>([]);
  const [certs, setCerts] = useState<Map<string, AppCertificate>>(new Map());
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    setItems(null);
    setErr(null);
    Enrollments.mine(filter === "ALL" ? undefined : filter)
      .then(setItems)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [filter, router]);

  useEffect(() => {
    if (!getSession()) return;
    LearningPaths.mine()
      .then(setPaths)
      .catch(() => {
        // non-fatal
      });
    Certificates.mine()
      .then((list) => {
        const m = new Map<string, AppCertificate>();
        list.forEach((c) => m.set(c.enrollmentId, c));
        setCerts(m);
      })
      .catch(() => {
        // non-fatal
      });
  }, []);

  const overdueCount = items?.filter((e) => e.overdue).length ?? 0;
  const dueSoonCount =
    items?.filter((e) => {
      if (!e.dueAt || e.status === "COMPLETED" || e.status === "WAIVED") return false;
      const days = (new Date(e.dueAt).getTime() - Date.now()) / 86_400_000;
      return days >= 0 && days <= 7;
    }).length ?? 0;

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-semibold">My learning</h1>
        <p className="text-sm text-[var(--muted)]">
          Courses assigned to you. Open a course to continue where you left off.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Assigned to me" value={items?.length} />
        <StatTile label="Due in next 7 days" value={dueSoonCount} accent="info" />
        <StatTile label="Overdue" value={overdueCount} accent={overdueCount > 0 ? "danger" : undefined} />
      </section>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
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

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      {paths.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            My learning paths
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {paths.map((p) => (
              <li
                key={p.id}
                className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-sm"
              >
                <div
                  className="h-2 w-full"
                  style={{ background: p.pathCoverColor ?? "#1e63f2" }}
                />
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/learning-paths/${p.pathId}`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {p.pathTitle}
                    </Link>
                    <span
                      className={
                        "chip " +
                        (p.status === "COMPLETED"
                          ? "chip-success"
                          : p.overdue
                          ? "chip-danger"
                          : p.status === "IN_PROGRESS"
                          ? "chip-info"
                          : p.status === "WAIVED"
                          ? "chip-muted"
                          : "chip-warn")
                      }
                    >
                      {p.overdue && p.status !== "COMPLETED" ? "OVERDUE" : p.status}
                    </span>
                    {p.mandatory ? <span className="chip chip-warn">MANDATORY</span> : null}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-full bg-[var(--accent)]"
                        style={{ width: `${Math.max(2, p.progressPct)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums text-[var(--muted)]">
                      {p.progressPct}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {p.dueAt ? `Due ${new Date(p.dueAt).toLocaleDateString()}` : "No due date"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {items === null ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)] p-8 text-center">
          <p className="text-sm text-[var(--text)]">Nothing here yet.</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Courses your manager or HR assigns will show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <EnrollmentCard key={e.id} e={e} cert={certs.get(e.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | undefined;
  accent?: "info" | "danger";
}) {
  const tone =
    accent === "danger"
      ? "border-red-300 bg-red-50"
      : accent === "info"
      ? "border-blue-200 bg-blue-50"
      : "border-[var(--border)] bg-[var(--panel)]";
  return (
    <div className={`rounded-lg border ${tone} p-4 shadow-sm`}>
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value ?? "—"}</div>
    </div>
  );
}

function EnrollmentCard({ e, cert }: { e: Enrollment; cert?: AppCertificate }) {
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
  const statusLabel = e.overdue && e.status !== "COMPLETED" ? "OVERDUE" : e.status.replace("_", " ");
  const dueLabel = e.dueAt ? new Date(e.dueAt).toLocaleDateString() : null;

  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/courses/${e.courseId}/preview`}
              className="text-base font-semibold text-[var(--text)] hover:underline"
            >
              {e.courseTitle}
            </Link>
            <span className={statusChip}>{statusLabel}</span>
            {e.mandatory ? <span className="chip chip-warn">MANDATORY</span> : null}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Assigned {new Date(e.assignedAt).toLocaleDateString()}
            {e.assignedByEmail ? ` by ${e.assignedByEmail}` : ""}
            {dueLabel ? ` · Due ${dueLabel}` : ""}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full bg-[var(--accent)]"
                style={{ width: `${Math.max(2, e.progressPct)}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs tabular-nums text-[var(--muted)]">
              {e.progressPct}%
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Link
            href={`/courses/${e.courseId}/preview`}
            className="rounded bg-[var(--accent)] px-4 py-2 text-center text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            {e.status === "COMPLETED" ? "Review" : e.progressPct > 0 ? "Continue" : "Start"}
          </Link>
          {cert ? (
            <button
              type="button"
              onClick={() => Certificates.downloadPdf(cert.id, cert.serial)}
              className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              🏆 Certificate
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
