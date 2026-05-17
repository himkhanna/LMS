"use client";

import { useEffect, useState } from "react";
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
  Courses,
  Lessons,
  Modules,
  type Course,
  type LessonDto,
  type ModuleDto,
} from "@/lib/api";
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
    </div>
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
