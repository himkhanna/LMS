"use client";

import { useState } from "react";
import type { ProposedCourse, ProposedLesson, ProposedModule } from "@/lib/api";

type Props = {
  initial: ProposedCourse;
  onCancel: () => void;
  onSave: (updated: ProposedCourse) => void;
  saving: boolean;
  error: string | null;
};

export function CourseDesigner({ initial, onCancel, onSave, saving, error }: Props) {
  const [course, setCourse] = useState<ProposedCourse>(() => clone(initial));
  const totalLessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);

  function setTitle(v: string) {
    setCourse({ ...course, title: v });
  }
  function setDescription(v: string) {
    setCourse({ ...course, description: v });
  }

  function updateModule(idx: number, patch: Partial<ProposedModule>) {
    const modules = [...course.modules];
    modules[idx] = { ...modules[idx], ...patch };
    setCourse({ ...course, modules });
  }
  function removeModule(idx: number) {
    if (course.modules.length <= 1) {
      alert("A course needs at least one module.");
      return;
    }
    if (!confirm(`Remove module "${course.modules[idx].title}" and all its lessons?`)) return;
    setCourse({ ...course, modules: course.modules.filter((_, i) => i !== idx) });
  }
  function moveModule(idx: number, delta: -1 | 1) {
    const target = idx + delta;
    if (target < 0 || target >= course.modules.length) return;
    const modules = [...course.modules];
    [modules[idx], modules[target]] = [modules[target], modules[idx]];
    setCourse({ ...course, modules });
  }
  function addModule() {
    setCourse({
      ...course,
      modules: [...course.modules, { title: `Module ${course.modules.length + 1}`, lessons: [] }],
    });
  }

  function updateLesson(mIdx: number, lIdx: number, patch: Partial<ProposedLesson>) {
    const modules = [...course.modules];
    const lessons = [...modules[mIdx].lessons];
    lessons[lIdx] = { ...lessons[lIdx], ...patch };
    modules[mIdx] = { ...modules[mIdx], lessons };
    setCourse({ ...course, modules });
  }
  function removeLesson(mIdx: number, lIdx: number) {
    const modules = [...course.modules];
    modules[mIdx] = {
      ...modules[mIdx],
      lessons: modules[mIdx].lessons.filter((_, i) => i !== lIdx),
    };
    setCourse({ ...course, modules });
  }
  function moveLesson(mIdx: number, lIdx: number, delta: -1 | 1) {
    const lessons = [...course.modules[mIdx].lessons];
    const target = lIdx + delta;
    if (target < 0 || target >= lessons.length) return;
    [lessons[lIdx], lessons[target]] = [lessons[target], lessons[lIdx]];
    const modules = [...course.modules];
    modules[mIdx] = { ...modules[mIdx], lessons };
    setCourse({ ...course, modules });
  }
  function moveLessonToModule(mIdx: number, lIdx: number, targetModuleIdx: number) {
    if (targetModuleIdx === mIdx) return;
    const modules = [...course.modules];
    const [lesson] = modules[mIdx].lessons.splice(lIdx, 1);
    modules[mIdx] = { ...modules[mIdx], lessons: [...modules[mIdx].lessons] };
    modules[targetModuleIdx] = {
      ...modules[targetModuleIdx],
      lessons: [...modules[targetModuleIdx].lessons, lesson],
    };
    setCourse({ ...course, modules });
  }
  function addLesson(mIdx: number) {
    const modules = [...course.modules];
    modules[mIdx] = {
      ...modules[mIdx],
      lessons: [
        ...modules[mIdx].lessons,
        { title: `Lesson ${modules[mIdx].lessons.length + 1}`, content: "", durationSecs: 60 },
      ],
    };
    setCourse({ ...course, modules });
  }
  function mergeWithPrevious(mIdx: number, lIdx: number) {
    if (lIdx === 0) return;
    const lessons = [...course.modules[mIdx].lessons];
    const target = lessons[lIdx - 1];
    const source = lessons[lIdx];
    lessons[lIdx - 1] = {
      ...target,
      content: [target.content, source.content].filter(Boolean).join("\n\n"),
      durationSecs: (target.durationSecs ?? 60) + (source.durationSecs ?? 60),
    };
    lessons.splice(lIdx, 1);
    const modules = [...course.modules];
    modules[mIdx] = { ...modules[mIdx], lessons };
    setCourse({ ...course, modules });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Designer</h1>
          <p className="text-sm text-[var(--muted)]">
            {course.modules.length} module{course.modules.length === 1 ? "" : "s"} ·{" "}
            {totalLessons} lesson{totalLessons === 1 ? "" : "s"} extracted from your deck. Edit
            anything below, then click <b>Create course</b>.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary" disabled={saving}>
            ← Back
          </button>
          <button
            onClick={() => onSave(course)}
            disabled={saving || course.modules.length === 0}
            className="btn-primary"
          >
            {saving ? "Creating…" : "Create course"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <section className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Course title</span>
          <input
            value={course.title}
            onChange={(e) => setTitle(e.target.value)}
            className="input w-full text-lg font-semibold"
          />
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Description (optional)</span>
          <textarea
            value={course.description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input w-full"
            placeholder="Short blurb shown on course cards"
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Modules
        </h2>
        <ol className="space-y-3">
          {course.modules.map((m, mIdx) => (
            <ModuleCard
              key={mIdx}
              module={m}
              index={mIdx}
              total={course.modules.length}
              allModules={course.modules}
              onUpdate={(patch) => updateModule(mIdx, patch)}
              onRemove={() => removeModule(mIdx)}
              onMove={(d) => moveModule(mIdx, d)}
              onUpdateLesson={(lIdx, patch) => updateLesson(mIdx, lIdx, patch)}
              onRemoveLesson={(lIdx) => removeLesson(mIdx, lIdx)}
              onMoveLesson={(lIdx, d) => moveLesson(mIdx, lIdx, d)}
              onMoveLessonToModule={(lIdx, target) => moveLessonToModule(mIdx, lIdx, target)}
              onAddLesson={() => addLesson(mIdx)}
              onMergeWithPrev={(lIdx) => mergeWithPrevious(mIdx, lIdx)}
            />
          ))}
        </ol>
        <button onClick={addModule} className="btn-secondary">
          + Add module
        </button>
      </section>
    </div>
  );
}

function ModuleCard({
  module: m,
  index,
  total,
  allModules,
  onUpdate,
  onRemove,
  onMove,
  onUpdateLesson,
  onRemoveLesson,
  onMoveLesson,
  onMoveLessonToModule,
  onAddLesson,
  onMergeWithPrev,
}: {
  module: ProposedModule;
  index: number;
  total: number;
  allModules: ProposedModule[];
  onUpdate: (patch: Partial<ProposedModule>) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  onUpdateLesson: (lIdx: number, patch: Partial<ProposedLesson>) => void;
  onRemoveLesson: (lIdx: number) => void;
  onMoveLesson: (lIdx: number, delta: -1 | 1) => void;
  onMoveLessonToModule: (lIdx: number, targetModuleIdx: number) => void;
  onAddLesson: () => void;
  onMergeWithPrev: (lIdx: number) => void;
}) {
  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="mt-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
          {index + 1}
        </span>
        <input
          value={m.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="input flex-1 font-medium"
          placeholder="Module title"
        />
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="btn-mini"
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="btn-mini"
          aria-label="Move down"
        >
          ↓
        </button>
        <button type="button" onClick={onRemove} className="btn-mini btn-mini-danger">
          Remove
        </button>
      </div>

      <ol className="mt-3 space-y-2 pl-8">
        {m.lessons.length === 0 ? (
          <li className="text-xs italic text-[var(--muted)]">No lessons yet.</li>
        ) : null}
        {m.lessons.map((l, lIdx) => (
          <LessonRow
            key={lIdx}
            lesson={l}
            index={lIdx}
            lessonCount={m.lessons.length}
            moduleIndex={index}
            allModules={allModules}
            onUpdate={(patch) => onUpdateLesson(lIdx, patch)}
            onRemove={() => onRemoveLesson(lIdx)}
            onMove={(d) => onMoveLesson(lIdx, d)}
            onMoveToModule={(target) => onMoveLessonToModule(lIdx, target)}
            onMergeWithPrev={() => onMergeWithPrev(lIdx)}
          />
        ))}
      </ol>
      <div className="mt-2 pl-8">
        <button type="button" onClick={onAddLesson} className="btn-mini">
          + Add lesson
        </button>
      </div>
    </li>
  );
}

function LessonRow({
  lesson,
  index,
  lessonCount,
  moduleIndex,
  allModules,
  onUpdate,
  onRemove,
  onMove,
  onMoveToModule,
  onMergeWithPrev,
}: {
  lesson: ProposedLesson;
  index: number;
  lessonCount: number;
  moduleIndex: number;
  allModules: ProposedModule[];
  onUpdate: (patch: Partial<ProposedLesson>) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  onMoveToModule: (targetModuleIdx: number) => void;
  onMergeWithPrev: () => void;
}) {
  const [open, setOpen] = useState(false);
  const preview = (lesson.content ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return (
    <li className="rounded border border-[var(--border)] bg-[var(--panel-2)]/40 p-2">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-[var(--muted)]">{index + 1}.</span>
        <input
          value={lesson.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="input flex-1 text-sm"
          placeholder="Lesson title"
        />
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="btn-mini"
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === lessonCount - 1}
          className="btn-mini"
          aria-label="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn-mini"
        >
          {open ? "Hide" : "Content"}
        </button>
        <button type="button" onClick={onRemove} className="btn-mini btn-mini-danger">
          ✕
        </button>
      </div>
      {!open && preview ? (
        <p className="mt-1 pl-6 text-xs italic text-[var(--muted)]">
          {preview}
          {(lesson.content ?? "").length > preview.length ? "…" : ""}
        </p>
      ) : null}
      {open ? (
        <div className="mt-2 space-y-2 pl-6">
          <textarea
            value={lesson.content ?? ""}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={Math.min(12, Math.max(3, (lesson.content ?? "").split("\n").length + 1))}
            className="input w-full text-sm"
            placeholder="Lesson content (you can polish formatting later in the lesson editor)"
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <label className="flex items-center gap-1">
              Duration (s):
              <input
                type="number"
                value={lesson.durationSecs ?? 60}
                onChange={(e) =>
                  onUpdate({ durationSecs: Number(e.target.value) || 60 })
                }
                className="input w-20 text-xs"
              />
            </label>
            {index > 0 ? (
              <button type="button" onClick={onMergeWithPrev} className="btn-mini">
                Merge with previous
              </button>
            ) : null}
            {allModules.length > 1 ? (
              <label className="flex items-center gap-1">
                Move to:
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value === "") return;
                    onMoveToModule(Number(e.target.value));
                  }}
                  className="input text-xs"
                >
                  <option value="">— pick module —</option>
                  {allModules.map((other, i) =>
                    i === moduleIndex ? null : (
                      <option key={i} value={i}>
                        {i + 1}. {other.title}
                      </option>
                    ),
                  )}
                </select>
              </label>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}
