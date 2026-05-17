"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Courses, type Course, type CourseStatus } from "@/lib/api";
import { getSession, type Session } from "@/lib/auth";

const STATUS_CHIPS: Record<CourseStatus, string> = {
  DRAFT: "chip chip-muted",
  PUBLISHED: "chip chip-success",
  ARCHIVED: "chip chip-warn",
};

type Counts = { total: number; draft: number; published: number; archived: number };

export default function Home() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [recent, setRecent] = useState<Course[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (!s) return;

    Promise.all([
      Courses.list({ size: 1 }),
      Courses.list({ size: 1, status: "DRAFT" }),
      Courses.list({ size: 1, status: "PUBLISHED" }),
      Courses.list({ size: 1, status: "ARCHIVED" }),
      Courses.list({ size: 5 }),
    ])
      .then(([all, draft, published, archived, latest]) => {
        setCounts({
          total: all.totalElements,
          draft: draft.totalElements,
          published: published.totalElements,
          archived: archived.totalElements,
        });
        setRecent(latest.content);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load dashboard"));
  }, []);

  if (session === undefined) {
    return <p className="py-10 text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (!session) return <Marketing />;

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome{session.displayName ? `, ${session.displayName}` : ""}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {session.email}
          {session.roles.length > 0 ? ` · ${session.roles.join(", ")}` : ""}
        </p>
      </div>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      <section className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total courses" value={counts?.total} />
        <StatCard label="Draft" value={counts?.draft} chip="chip chip-muted" />
        <StatCard label="Published" value={counts?.published} chip="chip chip-success" />
        <StatCard label="Archived" value={counts?.archived} chip="chip chip-warn" />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/my-learning" className="btn-primary">
            My learning
          </Link>
          <Link href="/courses/new" className="btn-secondary">
            New course
          </Link>
          <Link href="/courses/generate-from-ppt" className="btn-secondary">
            Upload PPT → course
          </Link>
          <Link href="/courses/generate" className="btn-secondary">
            Generate with AI
          </Link>
          <Link href="/courses" className="btn-secondary">
            Browse courses
          </Link>
          <Link href="/admin/users" className="btn-secondary">
            Manage users
          </Link>
          <Link href="/admin/providers" className="btn-secondary">
            AI providers
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Recent courses
          </h2>
          <Link href="/courses" className="text-xs text-[var(--muted)] hover:underline">
            View all →
          </Link>
        </div>
        {recent === null ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No courses yet.{" "}
            <Link href="/courses/new" className="underline">
              Create the first one
            </Link>
            .
          </p>
        ) : (
          <div className="table-card overflow-hidden">
            <table className="table-dense">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Modules</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/courses/${c.id}`} className="font-medium hover:underline">
                        {c.title}
                      </Link>
                    </td>
                    <td>
                      <span className={STATUS_CHIPS[c.status]}>{c.status}</span>
                    </td>
                    <td className="text-xs text-[var(--muted)]">{c.modules?.length ?? 0}</td>
                    <td className="whitespace-nowrap text-xs text-[var(--muted)]">
                      {new Date(c.updatedAt).toLocaleDateString()}
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

function StatCard({ label, value, chip }: { label: string; value: number | undefined; chip?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</span>
        {chip ? <span className={chip}>{label}</span> : null}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">
        {value ?? "—"}
      </div>
    </div>
  );
}

function Marketing() {
  return (
    <div className="space-y-10 py-10">
      <section className="rounded-xl bg-gradient-to-br from-[#0a1e44] to-[#1e63f2] p-10 text-white shadow-sm">
        <div className="max-w-2xl space-y-4">
          <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide">
            IDC Digital
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Learning that transforms your business.
          </h1>
          <p className="text-white/85">
            An AI-powered learning platform for the enterprise — author, deliver,
            and measure outcomes across every team.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/login"
              className="rounded bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--panel-2)]"
            >
              Sign in
            </Link>
            <Link
              href="/courses"
              className="rounded border border-white/40 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
            >
              Browse courses
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Feature
          title="Author with AI"
          body="Generate full courses, quizzes, and summaries from a single prompt — or upload a PPT and ship in minutes."
        />
        <Feature
          title="Provider-agnostic"
          body="Plug in OpenAI, Azure OpenAI, Anthropic, or your own model. Switch on the fly from Admin."
        />
        <Feature
          title="Enterprise-ready"
          body="Microsoft sign-in, role-based admin, audit logs, and a clean architecture you can extend."
        />
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
      <h3 className="font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
    </div>
  );
}
