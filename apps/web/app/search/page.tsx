"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Courses, type Course, type CourseStatus } from "@/lib/api";
import { getSession } from "@/lib/auth";

const STATUS_CHIPS: Record<CourseStatus, string> = {
  DRAFT: "chip chip-muted",
  PUBLISHED: "chip chip-success",
  ARCHIVED: "chip chip-warn",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <SearchView />
    </Suspense>
  );
}

function SearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<Course[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    if (!initial) { setResults([]); return; }
    setBusy(true);
    Courses.search(initial, 0, 50)
      .then((p) => setResults(p.content))
      .catch((e) => setErr(e instanceof Error ? e.message : "Search failed"))
      .finally(() => setBusy(false));
  }, [initial, router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Search</h1>
        <Link href="/courses" className="text-sm text-[var(--muted)] hover:underline">
          All courses
        </Link>
      </div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="input min-w-[20rem] flex-1"
          autoFocus
        />
        <button type="submit" className="btn-primary">Search</button>
      </form>
      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}
      {busy ? <p className="text-sm text-[var(--muted)]">Searching…</p> : null}
      {!busy && results !== null && initial ? (
        <p className="text-xs text-[var(--muted)]">
          {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{initial}&rdquo;
        </p>
      ) : null}
      {results && results.length > 0 ? (
        <div className="table-card overflow-hidden">
          <table className="table-dense">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {results.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/courses/${c.id}`} className="font-medium hover:underline">
                      {c.title}
                    </Link>
                    {c.description ? (
                      <div className="line-clamp-1 text-xs text-[var(--muted)]">{c.description}</div>
                    ) : null}
                  </td>
                  <td><span className={STATUS_CHIPS[c.status]}>{c.status}</span></td>
                  <td className="whitespace-nowrap text-xs text-[var(--muted)]">
                    {new Date(c.updatedAt).toLocaleDateString()}
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
