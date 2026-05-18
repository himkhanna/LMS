"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LearningPaths, type LearningPath } from "@/lib/api";
import { getSession, hasRole } from "@/lib/auth";

export default function LearningPathsListPage() {
  const router = useRouter();
  const [paths, setPaths] = useState<LearningPath[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  const canAuthor =
    hasRole("ROLE_ADMIN") || hasRole("ROLE_HR") || hasRole("ROLE_INSTRUCTOR");

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
      setPaths(await LearningPaths.list());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const created = await LearningPaths.create({ title: title.trim() });
      router.push(`/learning-paths/${created.id}`);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Could not create");
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Learning paths</h1>
          <p className="text-sm text-[var(--muted)]">
            Curated sequences of courses HR can assign as a bundle (e.g. New Hire
            Onboarding, Manager Toolkit).
          </p>
        </div>
        {canAuthor ? (
          <form onSubmit={create} className="flex gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New path title…"
              className="input min-w-[16rem]"
            />
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="btn-primary"
            >
              {creating ? "…" : "+ Create"}
            </button>
          </form>
        ) : null}
      </div>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      {paths === null ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : paths.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)] p-8 text-center">
          <p className="text-sm">No learning paths yet.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((p) => (
            <li
              key={p.id}
              className="flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-sm"
            >
              <div
                className="h-16 w-full"
                style={{ background: p.coverColor ?? "#1e63f2" }}
              />
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/learning-paths/${p.id}`}
                    className="text-base font-semibold hover:underline"
                  >
                    {p.title}
                  </Link>
                  <span
                    className={
                      "chip " +
                      (p.status === "PUBLISHED"
                        ? "chip-success"
                        : p.status === "ARCHIVED"
                        ? "chip-warn"
                        : "chip-muted")
                    }
                  >
                    {p.status}
                  </span>
                </div>
                {p.summary ? (
                  <p className="mt-1 line-clamp-3 text-sm text-[var(--muted)]">
                    {p.summary}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <span key={t} className="chip chip-muted">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="mt-auto pt-3 text-xs text-[var(--muted)]">
                  {p.courseCount} course{p.courseCount === 1 ? "" : "s"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
