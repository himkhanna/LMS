"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Courses,
  Directory,
  LearningPaths,
  type Course,
  type DirectoryUser,
  type LearningPath,
  type LearningPathStatus,
  type PathAssignment,
} from "@/lib/api";
import { getSession, hasRole } from "@/lib/auth";

type PathUpdatePayload = {
  title?: string;
  description?: string;
  summary?: string | null;
  coverColor?: string | null;
  tags?: string[];
  status?: LearningPathStatus;
};

export default function LearningPathDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [path, setPath] = useState<LearningPath | null>(null);
  const [roster, setRoster] = useState<PathAssignment[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const canAuthor =
    hasRole("ROLE_ADMIN") || hasRole("ROLE_HR") || hasRole("ROLE_INSTRUCTOR");
  const canAssign = hasRole("ROLE_ADMIN") || hasRole("ROLE_HR");

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    reload();
    if (canAuthor) reloadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  async function reload() {
    setErr(null);
    try {
      setPath(await LearningPaths.get(params.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }
  async function reloadRoster() {
    if (!canAuthor) return;
    try {
      setRoster(await LearningPaths.roster(params.id));
    } catch {
      // non-fatal
    }
  }

  async function saveMeta(patch: PathUpdatePayload) {
    if (!path) return;
    setBusy(true);
    try {
      const updated = await LearningPaths.update(path.id, patch);
      setPath(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish() {
    if (!path) return;
    await saveMeta({
      status: path.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
    });
  }

  async function deletePath() {
    if (!path) return;
    if (!confirm(`Delete "${path.title}"? Learner assignments to this path are removed.`)) return;
    try {
      await LearningPaths.delete(path.id);
      router.push("/learning-paths");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function addCourse(courseId: string) {
    if (!path) return;
    try {
      await LearningPaths.addCourse(path.id, courseId, true);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not add course");
    }
  }

  async function removeCourse(linkId: string) {
    if (!confirm("Remove this course from the path?")) return;
    try {
      await LearningPaths.removeCourse(linkId);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not remove course");
    }
  }

  async function moveCourse(idx: number, delta: -1 | 1) {
    if (!path) return;
    const target = idx + delta;
    if (target < 0 || target >= path.courses.length) return;
    const next = [...path.courses];
    [next[idx], next[target]] = [next[target], next[idx]];
    setPath({ ...path, courses: next });
    try {
      await LearningPaths.reorderCourses(
        path.id,
        next.map((c) => c.linkId),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reorder failed");
      reload();
    }
  }

  if (err && !path) return <p className="text-sm text-[var(--danger)]">{err}</p>;
  if (!path) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-6 py-2">
      <div>
        <Link href="/learning-paths" className="text-sm text-[var(--muted)] hover:underline">
          ← Learning paths
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="h-12 w-12 rounded-lg"
            style={{ background: path.coverColor ?? "#1e63f2" }}
          />
          <div>
            <h1 className="text-2xl font-semibold">{path.title}</h1>
            <p className="text-sm text-[var(--muted)]">
              {path.courseCount} course{path.courseCount === 1 ? "" : "s"} ·{" "}
              <span
                className={
                  "chip " +
                  (path.status === "PUBLISHED"
                    ? "chip-success"
                    : path.status === "ARCHIVED"
                    ? "chip-warn"
                    : "chip-muted")
                }
              >
                {path.status}
              </span>
            </p>
          </div>
        </div>
        {canAuthor ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={togglePublish}
              disabled={busy}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {path.status === "PUBLISHED" ? "Unpublish" : "Publish"}
            </button>
            {canAssign ? (
              <button
                onClick={() => setAssignOpen(true)}
                className="btn-secondary"
                disabled={path.status !== "PUBLISHED" || path.courses.length === 0}
                title={
                  path.status !== "PUBLISHED"
                    ? "Publish the path first"
                    : path.courses.length === 0
                    ? "Add at least one course first"
                    : ""
                }
              >
                Assign learners
              </button>
            ) : null}
            <button
              onClick={deletePath}
              className="rounded border border-[var(--border)] px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      {canAuthor ? <MetaPanel path={path} onSave={saveMeta} saving={busy} /> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Courses in this path</h2>
          {canAuthor ? <AddCourseDialog onPick={addCourse} pathCourseIds={path.courses.map((c) => c.courseId)} /> : null}
        </div>
        {path.courses.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No courses yet. {canAuthor ? "Add one above to start." : ""}
          </p>
        ) : (
          <ol className="space-y-2">
            {path.courses.map((c, idx) => (
              <li
                key={c.linkId}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/courses/${c.courseId}/preview`}
                    className="font-medium hover:underline"
                  >
                    {c.courseTitle}
                  </Link>
                  <div className="text-xs text-[var(--muted)]">
                    <span className="chip chip-muted">{c.courseStatus}</span>
                    {c.required ? null : (
                      <span className="ml-1 chip chip-warn">OPTIONAL</span>
                    )}
                    {c.courseSummary ? (
                      <span className="ml-2 line-clamp-1">{c.courseSummary}</span>
                    ) : null}
                  </div>
                </div>
                {canAuthor ? (
                  <>
                    <button
                      onClick={() => moveCourse(idx, -1)}
                      disabled={idx === 0}
                      className="btn-mini"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveCourse(idx, 1)}
                      disabled={idx === path.courses.length - 1}
                      className="btn-mini"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeCourse(c.linkId)}
                      className="btn-mini btn-mini-danger"
                    >
                      Remove
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {canAuthor && roster ? (
        <RosterPanel roster={roster} onChange={reloadRoster} />
      ) : null}

      {assignOpen ? (
        <AssignPathDialog
          path={path}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => {
            reloadRoster();
          }}
        />
      ) : null}
    </div>
  );
}

function MetaPanel({
  path,
  onSave,
  saving,
}: {
  path: LearningPath;
  onSave: (patch: PathUpdatePayload) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(path.title);
  const [summary, setSummary] = useState(path.summary ?? "");
  const [coverColor, setCoverColor] = useState(path.coverColor ?? "#1e63f2");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(path.tags ?? []);

  function addTag() {
    const next = tagInput.trim();
    if (!next || tags.includes(next)) {
      setTagInput("");
      return;
    }
    setTags([...tags, next]);
    setTagInput("");
  }

  function save() {
    onSave({
      title: title.trim() || path.title,
      summary: summary.trim() || null,
      coverColor: coverColor || null,
      tags,
    });
  }

  return (
    <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        Settings
      </h2>
      <div className="grid gap-3 md:grid-cols-[1fr_140px]">
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input w-full" />
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Cover</span>
          <input
            type="color"
            value={coverColor}
            onChange={(e) => setCoverColor(e.target.value)}
            className="h-10 w-full cursor-pointer rounded border border-[var(--border)] bg-white"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="block pb-1 text-[var(--muted)]">Summary (≤ 280 chars)</span>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value.slice(0, 280))}
            rows={2}
            className="input w-full"
          />
        </label>
      </div>
      <div>
        <span className="block pb-1 text-sm text-[var(--muted)]">Tags</span>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <span key={t} className="chip chip-muted">
              {t}
              <button
                type="button"
                onClick={() => setTags(tags.filter((x) => x !== t))}
                className="ml-1 text-[var(--muted)] hover:text-[var(--danger)]"
              >
                ✕
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || (e.key === "," && tagInput.trim())) {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="add a tag"
            className="input flex-1 min-w-[10rem]"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-secondary">
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </section>
  );
}

function AddCourseDialog({
  onPick,
  pathCourseIds,
}: {
  onPick: (courseId: string) => void;
  pathCourseIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Course[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    Courses.list({ size: 100 }).then((p) => setList(p.content));
  }, [open]);

  const filtered = useMemo(() => {
    if (!list) return null;
    const exclude = new Set(pathCourseIds);
    return list.filter((c) => {
      if (exclude.has(c.id)) return false;
      if (!q) return true;
      const needle = q.toLowerCase();
      return (
        c.title.toLowerCase().includes(needle) ||
        (c.summary?.toLowerCase().includes(needle) ?? false) ||
        (c.description?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [list, q, pathCourseIds]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary">
        + Add course
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-[var(--panel)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h3 className="text-lg font-semibold">Add course to path</h3>
          <button onClick={() => setOpen(false)} className="text-sm text-[var(--muted)]">
            ✕
          </button>
        </div>
        <div className="border-b border-[var(--border)] p-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter…"
            className="input w-full"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered === null ? (
            <p className="p-4 text-sm text-[var(--muted)]">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-[var(--muted)]">No matching courses.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(c.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2 px-4 py-2 text-left hover:bg-[var(--panel-2)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.title}</div>
                      <div className="text-xs text-[var(--muted)]">
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
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function RosterPanel({
  roster,
  onChange,
}: {
  roster: PathAssignment[];
  onChange: () => void;
}) {
  async function unassign(id: string) {
    if (!confirm("Remove this learner from the path? Their individual course enrollments stay.")) return;
    await LearningPaths.unassign(id);
    onChange();
  }
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Assigned learners</h2>
        <span className="text-xs text-[var(--muted)]">{roster.length} total</span>
      </div>
      {roster.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No learners assigned yet.</p>
      ) : (
        <div className="table-card">
          <table className="table-dense">
            <thead>
              <tr>
                <th>Learner</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="font-medium">{r.userName ?? r.userEmail}</div>
                    <div className="text-xs text-[var(--muted)]">{r.userEmail}</div>
                  </td>
                  <td>
                    <span
                      className={
                        "chip " +
                        (r.status === "COMPLETED"
                          ? "chip-success"
                          : r.overdue
                          ? "chip-danger"
                          : r.status === "IN_PROGRESS"
                          ? "chip-info"
                          : r.status === "WAIVED"
                          ? "chip-muted"
                          : "chip-warn")
                      }
                    >
                      {r.overdue && r.status !== "COMPLETED" ? "OVERDUE" : r.status}
                    </span>
                  </td>
                  <td className="w-40">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className="h-full bg-[var(--accent)]"
                          style={{ width: `${Math.max(2, r.progressPct)}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-xs tabular-nums text-[var(--muted)]">
                        {r.progressPct}%
                      </span>
                    </div>
                  </td>
                  <td className="text-xs text-[var(--muted)]">
                    {r.dueAt ? new Date(r.dueAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="text-right">
                    <button onClick={() => unassign(r.id)} className="btn-mini btn-mini-danger">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AssignPathDialog({
  path,
  onClose,
  onAssigned,
}: {
  path: LearningPath;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [picked, setPicked] = useState<Map<string, DirectoryUser>>(new Map());
  const [dueAt, setDueAt] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const t = setTimeout(() => {
      Directory.search({ q: query, size: 25 })
        .then((p) => {
          if (active) setResults(p.content);
        })
        .catch(() => {});
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  function toggle(u: DirectoryUser) {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.set(u.id, u);
      return next;
    });
  }

  async function submit() {
    const pickedList = Array.from(picked.values());
    if (pickedList.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await LearningPaths.assign(path.id, {
        learners: pickedList.map((u) => ({
          userId: u.id,
          email: u.email,
          displayName: u.displayName,
          managerEmail: u.managerEmail,
          department: u.department,
        })),
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        mandatory,
      });
      onAssigned();
      setFeedback(
        `Assigned ${res.created} learner${res.created === 1 ? "" : "s"}${
          res.skipped > 0 ? ` · ${res.skipped} already assigned` : ""
        }. Course enrollments were created automatically.`,
      );
      setPicked(new Map());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setBusy(false);
    }
  }

  const pickedList = Array.from(picked.values());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-[var(--panel)] shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Assign learning path</h2>
            <p className="text-xs text-[var(--muted)]">
              Path: <span className="font-medium text-[var(--text)]">{path.title}</span>
              {" · "}
              {path.courseCount} course{path.courseCount === 1 ? "" : "s"} will be enrolled per learner.
            </p>
          </div>
          <button onClick={onClose} className="text-sm text-[var(--muted)]">✕</button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-5 md:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2">
            <label className="block text-xs font-medium text-[var(--muted)]">Search users</label>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, email, or department…"
              className="input"
            />
            <div className="flex-1 overflow-y-auto rounded border border-[var(--border)]">
              {results.length === 0 ? (
                <p className="p-3 text-xs text-[var(--muted)]">No users found.</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {results.map((u) => {
                    const chosen = picked.has(u.id);
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => toggle(u)}
                          className={`flex w-full items-start justify-between px-3 py-2 text-left hover:bg-[var(--panel-2)] ${
                            chosen ? "bg-[var(--accent-soft)]" : ""
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="truncate text-sm font-medium">
                              {u.displayName ?? u.email}
                            </div>
                            <div className="truncate text-xs text-[var(--muted)]">
                              {u.email}
                              {u.department ? ` · ${u.department}` : ""}
                            </div>
                          </div>
                          <span
                            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                              chosen
                                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                                : "border-[var(--border)] text-[var(--muted)]"
                            }`}
                          >
                            {chosen ? "✓" : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--muted)]">
                  Selected ({pickedList.length})
                </label>
                {pickedList.length > 0 ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    onClick={() => setPicked(new Map())}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="mt-1 max-h-40 overflow-y-auto rounded border border-[var(--border)]">
                {pickedList.length === 0 ? (
                  <p className="p-3 text-xs text-[var(--muted)]">No learners selected.</p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {pickedList.map((u) => (
                      <li key={u.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="truncate">{u.displayName ?? u.email}</span>
                        <button
                          type="button"
                          onClick={() => toggle(u)}
                          className="ml-2 text-[var(--muted)] hover:text-[var(--danger)]"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <label className="block text-xs">
              <span className="block pb-1 text-[var(--muted)]">Due date (optional)</span>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="input w-full"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={mandatory}
                onChange={(e) => setMandatory(e.target.checked)}
              />
              Mandatory training
            </label>
            {err ? <p className="rounded bg-orange-50 p-2 text-xs text-[var(--danger)]">{err}</p> : null}
            {feedback ? (
              <p className="rounded bg-emerald-50 p-2 text-xs text-[var(--success)]">{feedback}</p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          <button
            onClick={submit}
            disabled={busy || pickedList.length === 0}
            className="btn-primary"
          >
            {busy ? "Assigning…" : `Assign ${pickedList.length || ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
