"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Quizzes,
  type Question,
  type QuestionType,
  type Quiz,
  type QuizCreate,
  type QuizGenerateInput,
  type QuizStatus,
} from "@/lib/api";
import { getSession, hasRole } from "@/lib/auth";

type QuizUpdatePayload = Partial<QuizCreate> & { status?: QuizStatus };

const TYPE_LABEL: Record<QuestionType, string> = {
  MCQ_SINGLE: "Multiple choice (single correct)",
  MCQ_MULTI: "Multiple choice (select all that apply)",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short answer",
};

export default function QuizEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    const allowed =
      hasRole("ROLE_ADMIN") || hasRole("ROLE_HR") || hasRole("ROLE_INSTRUCTOR");
    if (!allowed) {
      router.push("/");
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  async function reload() {
    setErr(null);
    try {
      setQuiz(await Quizzes.get(params.id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load quiz");
    }
  }

  async function saveMeta(patch: Partial<QuizUpdatePayload>) {
    if (!quiz) return;
    setSavingMeta(true);
    setErr(null);
    try {
      const updated = await Quizzes.update(quiz.id, patch);
      setQuiz((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingMeta(false);
    }
  }

  async function publish() {
    await saveMeta({ status: quiz?.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" });
  }

  async function deleteQuiz() {
    if (!quiz) return;
    if (!confirm(`Delete quiz "${quiz.title}" and all its questions?`)) return;
    try {
      await Quizzes.delete(quiz.id);
      router.push(`/courses/${quiz.courseId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (err && !quiz) return <p className="text-sm text-[var(--danger)]">{err}</p>;
  if (!quiz) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/courses/${quiz.courseId}`}
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Back to course
        </Link>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{quiz.title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {quiz.totalQuestions} question{quiz.totalQuestions === 1 ? "" : "s"} ·
            {" "}{quiz.totalPoints} point{quiz.totalPoints === 1 ? "" : "s"} ·
            {" "}pass {quiz.passScore}%
            {quiz.timeLimitMins ? ` · ${quiz.timeLimitMins} min limit` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              "chip " +
              (quiz.status === "PUBLISHED"
                ? "chip-success"
                : quiz.status === "ARCHIVED"
                ? "chip-warn"
                : "chip-muted")
            }
          >
            {quiz.status}
          </span>
          <Link
            href={`/quizzes/${quiz.id}/take`}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--panel-2)]"
          >
            Preview
          </Link>
          <button
            onClick={publish}
            disabled={savingMeta}
            className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {quiz.status === "PUBLISHED" ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={deleteQuiz}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--danger)] hover:bg-orange-50"
          >
            Delete
          </button>
        </div>
      </header>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      <QuizMetaForm quiz={quiz} onSave={saveMeta} busy={savingMeta} />

      <AiGenerationPanel quiz={quiz} onGenerated={reload} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Questions</h2>
          <button onClick={() => setAdding(true)} className="btn-primary">
            Add question
          </button>
        </div>
        {adding ? (
          <NewQuestionForm
            quizId={quiz.id}
            onAdded={() => {
              setAdding(false);
              reload();
            }}
            onCancel={() => setAdding(false)}
          />
        ) : null}
        {quiz.questions.length === 0 && !adding ? (
          <p className="text-sm text-[var(--muted)]">
            No questions yet. Add one above, or use AI to generate from your course content.
          </p>
        ) : (
          <ol className="space-y-3">
            {quiz.questions.map((q, i) => (
              <QuestionRow key={q.id} question={q} index={i + 1} onChange={reload} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function QuizMetaForm({
  quiz,
  onSave,
  busy,
}: {
  quiz: Quiz;
  onSave: (patch: Partial<QuizUpdatePayload>) => void;
  busy: boolean;
}) {
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description ?? "");
  const [passScore, setPassScore] = useState(String(quiz.passScore));
  const [timeLimit, setTimeLimit] = useState(quiz.timeLimitMins ? String(quiz.timeLimitMins) : "");
  const [maxAttempts, setMaxAttempts] = useState(quiz.maxAttempts ? String(quiz.maxAttempts) : "");
  const [shuffle, setShuffle] = useState(quiz.shuffleQuestions);

  function save() {
    onSave({
      title: title.trim() || quiz.title,
      description: description || undefined,
      passScore: Number(passScore) || quiz.passScore,
      timeLimitMins: timeLimit ? Number(timeLimit) : undefined,
      maxAttempts: maxAttempts ? Number(maxAttempts) : undefined,
      shuffleQuestions: shuffle,
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        Quiz settings
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Pass score (%)</span>
          <input
            value={passScore}
            onChange={(e) => setPassScore(e.target.value.replace(/\D/g, ""))}
            className="input w-full"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="block pb-1 text-[var(--muted)]">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Time limit (minutes, blank = none)</span>
          <input
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value.replace(/\D/g, ""))}
            className="input w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Max attempts (blank = unlimited)</span>
          <input
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(e.target.value.replace(/\D/g, ""))}
            className="input w-full"
          />
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
          />
          Shuffle questions for each learner
        </label>
      </div>
      <div className="flex justify-end">
        <button onClick={save} disabled={busy} className="btn-secondary">
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}

function AiGenerationPanel({ quiz, onGenerated }: { quiz: Quiz; onGenerated: () => void }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [types, setTypes] = useState<QuestionType[]>(["MCQ_SINGLE", "TRUE_FALSE"]);
  const [scope, setScope] = useState<"course" | "lesson" | "module">(
    quiz.lessonId ? "lesson" : quiz.moduleId ? "module" : "course",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleType(t: QuestionType) {
    setTypes((curr) =>
      curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t],
    );
  }

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const input: QuizGenerateInput = {
        questionCount: Number(count) || 5,
        types: types.length > 0 ? types : undefined,
        difficulty,
      };
      if (scope === "lesson" && quiz.lessonId) input.lessonId = quiz.lessonId;
      if (scope === "module" && quiz.moduleId) input.moduleId = quiz.moduleId;
      await Quizzes.generate(quiz.id, input);
      onGenerated();
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">✨ Generate questions with AI</h2>
            <p className="text-xs text-[var(--muted)]">
              Use your course content as the source. Review each question before publishing.
            </p>
          </div>
          <button onClick={() => setOpen(true)} className="btn-secondary">
            Generate with AI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">✨ Generate questions with AI</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          Cancel
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Source</span>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
            className="input w-full"
          >
            {quiz.lessonId ? <option value="lesson">Attached lesson</option> : null}
            {quiz.moduleId ? <option value="module">Attached module</option> : null}
            <option value="course">Whole course</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Number of questions</span>
          <input
            value={count}
            onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
            className="input w-full"
          />
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Difficulty</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
            className="input w-full"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>
      <div>
        <span className="block pb-1 text-sm text-[var(--muted)]">Question types</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                types.includes(t)
                  ? "border-[var(--accent)] bg-white text-[var(--accent)]"
                  : "border-[var(--border)] bg-white/60 text-[var(--muted)]"
              }`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}
      <div className="flex justify-end">
        <button onClick={generate} disabled={busy} className="btn-primary">
          {busy ? "Generating… this may take a minute" : "Generate"}
        </button>
      </div>
    </div>
  );
}

function NewQuestionForm({
  quizId,
  onAdded,
  onCancel,
}: {
  quizId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<QuestionType>("MCQ_SINGLE");
  return (
    <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">New question</h3>
        <button
          onClick={onCancel}
          className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          Cancel
        </button>
      </div>
      <label className="mb-3 block text-sm">
        <span className="block pb-1 text-[var(--muted)]">Type</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as QuestionType)}
          className="input w-full"
        >
          {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>
      <QuestionEditor type={type} quizId={quizId} onSaved={onAdded} />
    </div>
  );
}

function QuestionRow({
  question,
  index,
  onChange,
}: {
  question: Question;
  index: number;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);

  async function remove() {
    if (!confirm(`Delete question ${index}?`)) return;
    await Quizzes.deleteQuestion(question.id);
    onChange();
  }

  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--muted)]">
              Q{index} · {TYPE_LABEL[question.type]} · {question.points} pt
              {question.points === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-1 text-sm font-medium text-[var(--text)]">
            {question.prompt}
          </div>
          <QuestionAnswerSummary question={question} />
          {question.explanation ? (
            <p className="mt-2 text-xs italic text-[var(--muted)]">
              Explanation: {question.explanation}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => setEditing((v) => !v)} className="btn-mini">
            {editing ? "Close" : "Edit"}
          </button>
          <button onClick={remove} className="btn-mini btn-mini-danger">
            Delete
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <QuestionEditor
            initial={question}
            type={question.type}
            onSaved={() => {
              setEditing(false);
              onChange();
            }}
          />
        </div>
      ) : null}
    </li>
  );
}

function QuestionAnswerSummary({ question }: { question: Question }) {
  const correct = question.correct ?? [];
  if (question.type === "MCQ_SINGLE" || question.type === "MCQ_MULTI") {
    const indices = correct.filter((c): c is number => typeof c === "number");
    return (
      <ul className="mt-2 space-y-1 text-sm">
        {(question.options ?? []).map((opt, i) => {
          const isCorrect = indices.includes(i);
          return (
            <li
              key={i}
              className={`flex items-start gap-2 ${
                isCorrect ? "text-[var(--success)]" : "text-[var(--muted)]"
              }`}
            >
              <span className="font-mono text-xs">{String.fromCharCode(65 + i)}.</span>
              <span>{opt}</span>
              {isCorrect ? <span className="text-xs">✓</span> : null}
            </li>
          );
        })}
      </ul>
    );
  }
  if (question.type === "TRUE_FALSE") {
    const v = correct[0];
    return (
      <p className="mt-2 text-sm text-[var(--success)]">
        Correct: {v === true ? "True" : "False"}
      </p>
    );
  }
  return (
    <p className="mt-2 text-sm text-[var(--success)]">
      Accepted answer{correct.length > 1 ? "s" : ""}:{" "}
      {correct.filter((c): c is string => typeof c === "string").join(" | ")}
    </p>
  );
}

function QuestionEditor({
  initial,
  type,
  quizId,
  onSaved,
}: {
  initial?: Question;
  type: QuestionType;
  quizId?: string;
  onSaved: () => void;
}) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [points, setPoints] = useState(String(initial?.points ?? 1));
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [options, setOptions] = useState<string[]>(() => {
    if (initial?.options && initial.options.length > 0) return initial.options;
    if (type === "MCQ_SINGLE" || type === "MCQ_MULTI")
      return ["", "", "", ""];
    return [];
  });
  const [correctMcq, setCorrectMcq] = useState<Set<number>>(() => {
    const c = (initial?.correct ?? []).filter((x): x is number => typeof x === "number");
    return new Set(c);
  });
  const [trueFalse, setTrueFalse] = useState<boolean>(() => {
    const v = initial?.correct?.[0];
    return v === true;
  });
  const [shortAcceptable, setShortAcceptable] = useState<string>(() => {
    const c = (initial?.correct ?? []).filter((x): x is string => typeof x === "string");
    return c.join("\n");
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function buildCorrect(): unknown[] {
    if (type === "MCQ_SINGLE") return correctMcq.size > 0 ? [Array.from(correctMcq)[0]] : [];
    if (type === "MCQ_MULTI") return Array.from(correctMcq);
    if (type === "TRUE_FALSE") return [trueFalse];
    return shortAcceptable
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        type,
        prompt: prompt.trim(),
        options:
          type === "MCQ_SINGLE" || type === "MCQ_MULTI"
            ? options.map((o) => o.trim()).filter((o) => o.length > 0)
            : undefined,
        correct: buildCorrect(),
        points: Number(points) || 1,
        explanation: explanation.trim() || undefined,
      };
      if (initial) {
        await Quizzes.updateQuestion(initial.id, payload);
      } else if (quizId) {
        await Quizzes.addQuestion(quizId, payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="block pb-1 text-[var(--muted)]">Prompt</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          className="input w-full"
          placeholder="Ask the question…"
        />
      </label>

      {(type === "MCQ_SINGLE" || type === "MCQ_MULTI") ? (
        <McqEditor
          options={options}
          setOptions={setOptions}
          correct={correctMcq}
          setCorrect={setCorrectMcq}
          singleSelect={type === "MCQ_SINGLE"}
        />
      ) : null}
      {type === "TRUE_FALSE" ? (
        <div className="flex gap-2 text-sm">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setTrueFalse(v)}
              className={`flex-1 rounded border px-3 py-2 ${
                trueFalse === v
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--panel)]"
              }`}
            >
              {v ? "True" : "False"}
            </button>
          ))}
        </div>
      ) : null}
      {type === "SHORT_ANSWER" ? (
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">
            Accepted answers (one per line — case-insensitive)
          </span>
          <textarea
            value={shortAcceptable}
            onChange={(e) => setShortAcceptable(e.target.value)}
            rows={3}
            className="input w-full"
            placeholder="e.g.&#10;paris&#10;Paris, France"
          />
        </label>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Points</span>
          <input
            value={points}
            onChange={(e) => setPoints(e.target.value.replace(/\D/g, ""))}
            className="input w-full"
          />
        </label>
        <label className="block text-sm md:col-span-1">
          <span className="block pb-1 text-[var(--muted)]">Explanation (optional)</span>
          <input
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Shown to learner after submission"
            className="input w-full"
          />
        </label>
      </div>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      <div className="flex justify-end">
        <button onClick={save} disabled={busy || !prompt.trim()} className="btn-primary">
          {busy ? "Saving…" : initial ? "Save question" : "Add question"}
        </button>
      </div>
    </div>
  );
}

function McqEditor({
  options,
  setOptions,
  correct,
  setCorrect,
  singleSelect,
}: {
  options: string[];
  setOptions: (o: string[]) => void;
  correct: Set<number>;
  setCorrect: (s: Set<number>) => void;
  singleSelect: boolean;
}) {
  function update(i: number, v: string) {
    const next = [...options];
    next[i] = v;
    setOptions(next);
  }
  function toggle(i: number) {
    if (singleSelect) {
      setCorrect(new Set([i]));
    } else {
      const next = new Set(correct);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      setCorrect(next);
    }
  }
  function addOption() {
    setOptions([...options, ""]);
  }
  function removeOption(i: number) {
    const next = options.filter((_, idx) => idx !== i);
    setOptions(next);
    const remapped = new Set<number>();
    correct.forEach((c) => {
      if (c === i) return;
      remapped.add(c > i ? c - 1 : c);
    });
    setCorrect(remapped);
  }
  return (
    <div className="space-y-2">
      <span className="block text-sm text-[var(--muted)]">
        Options ({singleSelect ? "pick one correct" : "tick all correct"})
      </span>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggle(i)}
            className={`flex h-6 w-6 shrink-0 items-center justify-center border ${
              singleSelect ? "rounded-full" : "rounded"
            } ${
              correct.has(i)
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] bg-white"
            }`}
            title="Mark as correct"
          >
            {correct.has(i) ? (singleSelect ? "●" : "✓") : ""}
          </button>
          <input
            value={opt}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Option ${String.fromCharCode(65 + i)}`}
            className="input flex-1"
          />
          <button
            type="button"
            onClick={() => removeOption(i)}
            className="btn-mini btn-mini-danger"
            disabled={options.length <= 2}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={addOption} className="btn-mini">
        + Add option
      </button>
    </div>
  );
}
