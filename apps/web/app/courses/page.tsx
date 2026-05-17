"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Courses, type Course, type CourseStatus } from "@/lib/api";
import { getSession } from "@/lib/auth";

const STATUS_CHIPS: Record<CourseStatus, string> = {
  DRAFT: "chip chip-muted",
  PUBLISHED: "chip chip-success",
  ARCHIVED: "chip chip-warn",
};

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "">("");

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    Courses.list({ size: 100, status: statusFilter || undefined })
      .then((p) => setCourses(p.content))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [router, statusFilter]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <div className="flex gap-2">
          <Link href="/courses/generate-from-ppt" className="btn-secondary">
            Upload PPT
          </Link>
          <Link href="/courses/generate" className="btn-secondary">
            Generate with AI
          </Link>
          <Link href="/courses/new" className="btn-primary">
            New course
          </Link>
        </div>
      </div>

      <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title or description…"
          className="input min-w-[18rem] flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CourseStatus | "")}
          className="input"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button type="submit" disabled={!q.trim()} className="btn-secondary disabled:opacity-50">
          Search
        </button>
      </form>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}
      {!err && courses === null ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : courses && courses.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No courses yet. Create the first one.</p>
      ) : null}

      {courses && courses.length > 0 ? (
        <div className="table-card overflow-hidden">
          <table className="table-dense">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Modules</th>
                <th>Updated</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="cursor-pointer" onClick={() => router.push(`/courses/${c.id}`)}>
                  <td>
                    <div className="font-medium">
                      <Link
                        href={`/courses/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline"
                      >
                        {c.title}
                      </Link>
                    </div>
                    {c.description ? (
                      <div className="line-clamp-1 text-xs text-[var(--muted)]">{c.description}</div>
                    ) : null}
                  </td>
                  <td>
                    <span className={STATUS_CHIPS[c.status]}>{c.status}</span>
                  </td>
                  <td className="text-xs text-[var(--muted)]">{c.modules?.length ?? 0}</td>
                  <td className="whitespace-nowrap text-xs text-[var(--muted)]">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap text-xs text-[var(--muted)]">
                    {c.publishedAt ? new Date(c.publishedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
