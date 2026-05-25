"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  API_BASE,
  Courses,
  Enrollments,
  Lessons,
  Modules,
  Quizzes,
  type Course,
  type Enrollment,
  type LessonDto,
  type ModuleDto,
  type Quiz,
} from "@/lib/api";
import { getSession, hasRole } from "@/lib/auth";
import { AssignDialog } from "@/components/AssignDialog";
import { DiscussionPanel } from "@/components/DiscussionPanel";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const canAssign = hasRole("ROLE_ADMIN") || hasRole("ROLE_HR") || hasRole("ROLE_INSTRUCTOR");

  async function reloadEnrollments() {
    if (!canAssign) return;
    try {
      setEnrollments(await Enrollments.listForCourse(params.id));
    } catch {
      // non-fatal: panel just stays empty
    }
  }

  async function reloadQuizzes() {
    try {
      setQuizzes(await Quizzes.listForCourse(params.id));
    } catch {
      // non-fatal: panel just stays empty
    }
  }

  async function reload() {
    setErr(null);
    try {
      setCourse(await Courses.get(params.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    reload();
    reloadEnrollments();
    reloadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  async function publish() {
    setBusy(true);
    setErr(null);
    try {
      setCourse(await Courses.publish(params.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  async function unpublish() {
    setBusy(true);
    setErr(null);
    try {
      setCourse(await Courses.unpublish(params.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unpublish failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!course) return;
    if (
      !confirm(
        `Delete course "${course.title}"? This removes all modules and lessons and cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      await Courses.delete(params.id);
      router.push("/courses");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  }

  async function onModulesReorder(newOrder: ModuleDto[]) {
    if (!course) return;
    setCourse({ ...course, modules: newOrder });
    try {
      await Modules.reorder(
        course.id,
        newOrder.map((m) => m.id),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reorder failed");
      reload();
    }
  }

  if (err && !course) return <p className="text-sm text-red-400">{err}</p>;
  if (!course) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/courses" className="text-sm text-[var(--muted)] hover:underline">
          ← Courses
        </Link>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Status: {course.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/courses/${course.id}/preview`}
            className="rounded border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--panel)]"
          >
            Preview
          </Link>
          {canAssign ? (
            <button
              onClick={() => setAssignOpen(true)}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Assign learners
            </button>
          ) : null}
          {course.status === "PUBLISHED" ? (
            <button
              onClick={unpublish}
              disabled={busy}
              className="rounded border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-50"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={publish}
              disabled={busy}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Publishing…" : "Publish"}
            </button>
          )}
          <button
            onClick={remove}
            disabled={busy}
            className="rounded border border-[var(--border)] px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {course.description ? (
        <p className="text-sm text-[var(--muted)]">{course.description}</p>
      ) : null}

      {canAssign ? <CourseSettingsPanel course={course} onChange={reload} /> : null}
      {canAssign ? <SlidePacingControl course={course} onChange={reload} /> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Modules</h2>
        <p className="text-xs text-[var(--muted)]">
          Drag the handle (☰) to reorder. Click a module title to rename it.
        </p>
        <AddModuleForm courseId={course.id} onAdded={reload} />
        {course.modules.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No modules yet. Add the first.</p>
        ) : (
          <SortableModuleList modules={course.modules} onReorder={onModulesReorder} onChange={reload} />
        )}
      </section>

      <QuizzesPanel
        courseId={course.id}
        quizzes={quizzes}
        canAuthor={canAssign}
        onChange={reloadQuizzes}
      />

      <DiscussionPanel courseId={course.id} />

      {canAssign ? (
        <EnrollmentsPanel
          enrollments={enrollments}
          onChange={reloadEnrollments}
        />
      ) : null}

      <AssignDialog
        courseId={course.id}
        courseTitle={course.title}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => reloadEnrollments()}
      />
    </div>
  );
}

function CoverImageRow({
  course,
  onChange,
}: {
  course: Course;
  onChange: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const preview = course.coverImageUrl ? absoluteAssetUrl(course.coverImageUrl) : null;

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Pick a jpg, png, webp, or gif");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr("Cover image must be < 5 MB");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await Courses.uploadCoverImage(course.id, file);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function clear() {
    if (!confirm("Remove the cover image?")) return;
    setBusy(true);
    try {
      await Courses.clearCoverImage(course.id);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm">
        <span className="block pb-1 text-[var(--muted)]">Cover image (optional)</span>
        <span className="block text-xs text-[var(--muted)]">
          Shown on the catalog card. Falls back to the cover colour if unset.
          Recommended 1280×720 jpg/png; max 5 MB.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="h-24 w-44 overflow-hidden rounded border border-[var(--border)]"
          style={{ background: course.coverColor ?? "#1e63f2" }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-white/80">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={pickFile}
            disabled={busy}
            className="text-xs file:mr-2 file:rounded file:border-0 file:bg-[var(--panel-2)] file:px-3 file:py-1 file:text-xs"
          />
          {course.coverImageUrl ? (
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="btn-mini btn-mini-danger w-fit"
            >
              Remove image
            </button>
          ) : null}
          {busy ? <span className="text-xs text-[var(--muted)]">Uploading…</span> : null}
          {err ? <span className="text-xs text-[var(--danger)]">{err}</span> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Course cover image URLs come back from the API as relative paths
 * (e.g. /api/v1/assets/files/courses/.../cover.jpg). The browser would
 * resolve those against the web app's origin, so we prepend API_BASE.
 */
function absoluteAssetUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/v1/")) return `${API_BASE}${url}`;
  return url;
}

function SlidePacingControl({
  course,
  onChange,
}: {
  course: Course;
  onChange: () => void;
}) {
  // Default the field to whatever the most-common lesson duration is, so
  // HR sees what the current pacing actually is.
  const counts = new Map<number, number>();
  for (const m of course.modules) {
    for (const l of m.lessons) {
      const d = l.durationSecs ?? 0;
      if (d <= 0) continue;
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  }
  let mode = 30;
  let max = 0;
  for (const [d, c] of counts) {
    if (c > max) {
      max = c;
      mode = d;
    }
  }
  const [secs, setSecs] = useState(String(mode));
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function save() {
    const n = Number(secs);
    if (!Number.isFinite(n) || n <= 0) return;
    if (
      !confirm(
        `Set every lesson in this course to ${n} seconds? Each learner will have to spend at least that long on each slide before "Next" unlocks. You can still tweak individual lessons afterwards.`,
      )
    )
      return;
    setBusy(true);
    try {
      await Courses.setAllLessonDurations(course.id, n);
      setSavedAt(new Date());
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold">Slide pacing</h2>
        <p className="text-xs text-[var(--muted)]">
          How long each slide must show before the learner can advance. Applies
          to every lesson in this course.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="number"
          min="1"
          max="3600"
          value={secs}
          onChange={(e) => setSecs(e.target.value)}
          className="input w-20"
        />
        <span className="text-xs text-[var(--muted)]">seconds / slide</span>
      </label>
      <button onClick={save} disabled={busy} className="btn-secondary">
        {busy ? "Applying…" : "Apply to all slides"}
      </button>
      {savedAt ? (
        <span className="text-xs text-[var(--muted)]">
          Updated {savedAt.toLocaleTimeString()}
        </span>
      ) : null}
    </section>
  );
}

function CourseSettingsPanel({
  course,
  onChange,
}: {
  course: Course;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(course.summary ?? "");
  const [coverColor, setCoverColor] = useState(course.coverColor ?? "#1e63f2");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(course.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function addTag() {
    const next = tagInput.trim();
    if (!next || tags.includes(next)) {
      setTagInput("");
      return;
    }
    setTags([...tags, next]);
    setTagInput("");
  }
  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  async function save() {
    setSaving(true);
    try {
      await Courses.update(course.id, {
        summary: summary.trim() || null,
        coverColor: coverColor || null,
        tags,
      });
      setSavedAt(new Date());
      onChange();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="h-6 w-6 rounded"
              style={{ background: course.coverColor ?? "#1e63f2" }}
            />
            <span className="text-sm text-[var(--muted)]">Catalog card</span>
            {course.tags?.length ? (
              course.tags.map((t) => (
                <span key={t} className="chip chip-muted">
                  {t}
                </span>
              ))
            ) : (
              <span className="text-xs italic text-[var(--muted)]">no tags yet</span>
            )}
          </div>
          <button onClick={() => setOpen(true)} className="btn-secondary">
            Edit catalog details
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-[var(--accent)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Catalog card</h2>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          {savedAt ? <span>Saved {savedAt.toLocaleTimeString()}</span> : null}
          <button onClick={() => setOpen(false)} className="hover:text-[var(--text)]">
            Close
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_140px]">
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Summary (≤ 280 chars)</span>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value.slice(0, 280))}
            rows={2}
            className="input w-full"
            placeholder="Short blurb shown on catalog cards. Falls back to description."
          />
          <span className="text-xs text-[var(--muted)]">{summary.length}/280</span>
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Cover colour</span>
          <input
            type="color"
            value={coverColor}
            onChange={(e) => setCoverColor(e.target.value)}
            className="h-10 w-full cursor-pointer rounded border border-[var(--border)] bg-white"
          />
          <span className="text-xs text-[var(--muted)]">{coverColor}</span>
        </label>
      </div>

      <CoverImageRow course={course} onChange={onChange} />


      <div>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Tags</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <span key={t} className="chip chip-muted">
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
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
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              } else if (e.key === "," || e.key === "Tab") {
                if (tagInput.trim()) {
                  e.preventDefault();
                  addTag();
                }
              }
            }}
            placeholder="add a tag and press enter"
            className="input flex-1 min-w-[10rem]"
          />
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Used to group courses on the catalog (e.g. <code>compliance</code>,{" "}
          <code>onboarding</code>, <code>leadership</code>).
        </p>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save catalog details"}
        </button>
      </div>
    </section>
  );
}

function QuizzesPanel({
  courseId,
  quizzes,
  canAuthor,
  onChange,
}: {
  courseId: string;
  quizzes: Quiz[] | null;
  canAuthor: boolean;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const q = await Quizzes.create(courseId, { title: title.trim() });
      setTitle("");
      setAdding(false);
      onChange();
      window.location.href = `/quizzes/${q.id}/edit`;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not create quiz");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Quizzes &amp; assessments</h2>
        {canAuthor ? (
          adding ? null : (
            <button onClick={() => setAdding(true)} className="btn-secondary">
              + New quiz
            </button>
          )
        ) : null}
      </div>

      {adding ? (
        <form
          onSubmit={createQuiz}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quiz title (e.g. Module 1 knowledge check)"
            className="input flex-1 min-w-[20rem]"
          />
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setTitle("");
            }}
            className="btn-secondary"
          >
            Cancel
          </button>
        </form>
      ) : null}

      {quizzes === null ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : quizzes.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No quizzes yet.{" "}
          {canAuthor
            ? "Create one above or generate questions from a lesson with AI."
            : "Check back later."}
        </p>
      ) : (
        <div className="table-card">
          <table className="table-dense">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Questions</th>
                <th>Pass score</th>
                <th>Time limit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((q) => (
                <tr key={q.id}>
                  <td className="font-medium">
                    <Link
                      href={canAuthor ? `/quizzes/${q.id}/edit` : `/quizzes/${q.id}/take`}
                      className="hover:underline"
                    >
                      {q.title}
                    </Link>
                  </td>
                  <td>
                    <span
                      className={
                        "chip " +
                        (q.status === "PUBLISHED"
                          ? "chip-success"
                          : q.status === "ARCHIVED"
                          ? "chip-warn"
                          : "chip-muted")
                      }
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="text-xs text-[var(--muted)]">
                    {q.totalQuestions} · {q.totalPoints} pt
                  </td>
                  <td className="text-xs text-[var(--muted)]">{q.passScore}%</td>
                  <td className="text-xs text-[var(--muted)]">
                    {q.timeLimitMins ? `${q.timeLimitMins} min` : "—"}
                  </td>
                  <td className="text-right">
                    <Link href={`/quizzes/${q.id}/take`} className="btn-mini">
                      {q.status === "PUBLISHED" ? "Take" : "Preview"}
                    </Link>{" "}
                    {canAuthor ? (
                      <Link href={`/quizzes/${q.id}/edit`} className="btn-mini">
                        Edit
                      </Link>
                    ) : null}
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

function EnrollmentsPanel({
  enrollments,
  onChange,
}: {
  enrollments: Enrollment[] | null;
  onChange: () => void;
}) {
  if (enrollments === null) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Assigned learners</h2>
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      </section>
    );
  }
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Assigned learners</h2>
        <span className="text-xs text-[var(--muted)]">{enrollments.length} total</span>
      </div>
      {enrollments.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No learners assigned yet. Click <span className="font-medium">Assign learners</span> above.
        </p>
      ) : (
        <div className="table-card">
          <table className="table-dense">
            <thead>
              <tr>
                <th>Learner</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Due</th>
                <th>Assigned</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <EnrollmentRow key={e.id} e={e} onChange={onChange} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EnrollmentRow({ e, onChange }: { e: Enrollment; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
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

  async function unassign() {
    if (!confirm(`Unassign ${e.userName ?? e.userEmail} from this course?`)) return;
    setBusy(true);
    try {
      await Enrollments.unassign(e.id);
      onChange();
    } finally {
      setBusy(false);
    }
  }
  async function waive() {
    if (!confirm(`Mark this course as waived for ${e.userName ?? e.userEmail}?`)) return;
    setBusy(true);
    try {
      await Enrollments.waive(e.id);
      onChange();
    } finally {
      setBusy(false);
    }
  }
  return (
    <tr>
      <td>
        <div className="font-medium">{e.userName ?? e.userEmail}</div>
        <div className="text-xs text-[var(--muted)]">{e.userEmail}</div>
      </td>
      <td>
        <span className={statusChip}>{statusLabel}</span>
        {e.mandatory ? <span className="ml-1 chip chip-warn">MANDATORY</span> : null}
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
        {e.dueAt ? new Date(e.dueAt).toLocaleDateString() : "—"}
      </td>
      <td className="text-xs text-[var(--muted)]">
        {new Date(e.assignedAt).toLocaleDateString()}
      </td>
      <td className="text-right">
        <button onClick={waive} disabled={busy || e.status === "COMPLETED" || e.status === "WAIVED"} className="btn-mini">
          Waive
        </button>{" "}
        <button onClick={unassign} disabled={busy} className="btn-mini btn-mini-danger">
          Unassign
        </button>
      </td>
    </tr>
  );
}

function SortableModuleList({
  modules,
  onReorder,
  onChange,
}: {
  modules: ModuleDto[];
  onReorder: (m: ModuleDto[]) => void;
  onChange: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = modules.findIndex((m) => m.id === active.id);
    const newIdx = modules.findIndex((m) => m.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(modules, oldIdx, newIdx));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-3">
          {modules.map((m) => (
            <SortableModule key={m.id} module={m} onChange={onChange} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableModule({ module: m, onChange }: { module: ModuleDto; onChange: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: m.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded border border-[var(--border)] bg-[var(--panel)] p-3"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab select-none px-1 text-[var(--muted)] hover:text-[var(--text)] active:cursor-grabbing"
          aria-label="Drag to reorder"
          type="button"
        >
          ☰
        </button>
        <div className="flex-1">
          <ModuleTitle module={m} onChanged={onChange} />
        </div>
        <DeleteModuleButton module={m} onDeleted={onChange} />
      </div>
      <div className="mt-3 pl-7">
        <SortableLessonList moduleId={m.id} lessons={m.lessons} onChange={onChange} />
        <AddLessonForm moduleId={m.id} onAdded={onChange} />
      </div>
    </li>
  );
}

function ModuleTitle({ module: m, onChanged }: { module: ModuleDto; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(m.title);
  const [busy, setBusy] = useState(false);

  async function save() {
    const next = title.trim();
    if (!next || next === m.title) {
      setEditing(false);
      setTitle(m.title);
      return;
    }
    setBusy(true);
    try {
      await Modules.update(m.id, { title: next });
      onChanged();
    } finally {
      setBusy(false);
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setTitle(m.title);
          setEditing(true);
        }}
        className="text-left font-medium hover:underline"
        title="Click to rename"
      >
        {m.title}
      </button>
    );
  }
  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        else if (e.key === "Escape") {
          setEditing(false);
          setTitle(m.title);
        }
      }}
      autoFocus
      disabled={busy}
      className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm font-medium"
    />
  );
}

function DeleteModuleButton({ module: m, onDeleted }: { module: ModuleDto; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm(`Delete module "${m.title}" and its lessons?`)) return;
    setBusy(true);
    try {
      await Modules.delete(m.id);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-xs text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
    >
      Delete
    </button>
  );
}

function SortableLessonList({
  moduleId,
  lessons,
  onChange,
}: {
  moduleId: string;
  lessons: LessonDto[];
  onChange: () => void;
}) {
  const [local, setLocal] = useState(lessons);
  useEffect(() => setLocal(lessons), [lessons]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = local.findIndex((l) => l.id === active.id);
    const newIdx = local.findIndex((l) => l.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(local, oldIdx, newIdx);
    setLocal(next);
    try {
      await Lessons.reorder(
        moduleId,
        next.map((l) => l.id),
      );
      onChange();
    } catch {
      setLocal(lessons);
    }
  }

  if (local.length === 0) {
    return <p className="text-xs italic text-[var(--muted)]">No lessons yet.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={local.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1 text-sm">
          {local.map((l) => (
            <SortableLesson key={l.id} lesson={l} onChange={onChange} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableLesson({ lesson, onChange }: { lesson: LessonDto; onChange: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm("Delete this lesson?")) return;
    setBusy(true);
    try {
      await Lessons.delete(lesson.id);
      onChange();
    } finally {
      setBusy(false);
    }
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-2 rounded border border-[var(--border)]/60 bg-[var(--bg)] px-2 py-1"
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="cursor-grab text-xs text-[var(--muted)] hover:text-[var(--text)] active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          ☰
        </button>
        <Link
          href={`/lessons/${lesson.id}`}
          className="truncate text-[var(--text)] hover:text-[var(--accent)] hover:underline"
        >
          {lesson.title}
        </Link>
      </div>
      <button
        onClick={remove}
        disabled={busy}
        className="text-xs text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
      >
        Delete
      </button>
    </li>
  );
}

function AddModuleForm({ courseId, onAdded }: { courseId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await Modules.add(courseId, title.trim());
      setTitle("");
      onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New module title…"
        maxLength={255}
        className="flex-1 rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Add module
      </button>
      {err ? <span className="self-center text-xs text-red-400">{err}</span> : null}
    </form>
  );
}

function AddLessonForm({ moduleId, onAdded }: { moduleId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await Lessons.add(moduleId, {
        title: title.trim(),
        durationSecs: duration ? Number(duration) : undefined,
      });
      setTitle("");
      setDuration("");
      onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New lesson title…"
        maxLength={255}
        className="flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
      />
      <input
        value={duration}
        onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
        placeholder="secs"
        className="w-20 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="rounded border border-[var(--border)] px-3 py-1 text-sm disabled:opacity-50"
      >
        Add lesson
      </button>
      {err ? <span className="self-center text-xs text-red-400">{err}</span> : null}
    </form>
  );
}
