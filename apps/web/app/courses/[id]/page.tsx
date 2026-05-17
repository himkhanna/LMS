"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Courses, Lessons, Modules, type Course, type ModuleDto } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Modules</h2>
        <AddModuleForm courseId={course.id} onAdded={reload} />
        {course.modules.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No modules yet. Add the first.</p>
        ) : (
          <ol className="space-y-3">
            {course.modules.map((m) => (
              <ModuleBlock key={m.id} module={m} onChange={reload} />
            ))}
          </ol>
        )}
      </section>
    </div>
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

function ModuleBlock({ module: m, onChange }: { module: ModuleDto; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete module "${m.title}" and its lessons?`)) return;
    setBusy(true);
    try {
      await Modules.delete(m.id);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded border border-[var(--border)] bg-[var(--panel)] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">{m.title}</div>
        <button
          onClick={remove}
          disabled={busy}
          className="text-xs text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {m.lessons.map((l) => (
          <li key={l.id} className="flex items-center justify-between">
            <Link href={`/lessons/${l.id}`} className="text-[var(--text)] hover:text-[var(--accent)] hover:underline">
              {l.title}
            </Link>
            <LessonDeleteButton lessonId={l.id} onDeleted={onChange} />
          </li>
        ))}
      </ul>
      <AddLessonForm moduleId={m.id} onAdded={onChange} />
    </li>
  );
}

function LessonDeleteButton({ lessonId, onDeleted }: { lessonId: string; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm("Delete this lesson?")) return;
    setBusy(true);
    try {
      await Lessons.delete(lessonId);
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
