"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Quizzes,
  type Attempt,
  type Question,
  type Quiz,
} from "@/lib/api";
import { getSession } from "@/lib/auth";

type Answers = Record<string, unknown[]>;

export default function TakeQuizPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Attempt | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    Quizzes.get(params.id)
      .then(setQuiz)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [params.id, router]);

  useEffect(() => {
    if (!quiz?.timeLimitMins || !attempt || result) return;
    const endsAt = new Date(attempt.startedAt).getTime() + quiz.timeLimitMins * 60_000;
    function tick() {
      const ms = endsAt - Date.now();
      if (ms <= 0) {
        setSecondsLeft(0);
        submit().catch(() => {});
        return;
      }
      setSecondsLeft(Math.ceil(ms / 1000));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz?.timeLimitMins, attempt, result]);

  async function startAttempt() {
    if (!quiz) return;
    setErr(null);
    try {
      const a = await Quizzes.startAttempt(quiz.id);
      setAttempt(a);
      setAnswers({});
      setResult(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start attempt");
    }
  }

  async function submit() {
    if (!attempt) return;
    setSubmitting(true);
    setErr(null);
    try {
      const r = await Quizzes.submitAttempt(attempt.id, answers);
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (err && !quiz) return <p className="text-sm text-[var(--danger)]">{err}</p>;
  if (!quiz) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  if (result) {
    return <AttemptResult quiz={quiz} attempt={result} onRetry={startAttempt} />;
  }

  if (!attempt) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-6">
        <Link
          href={`/courses/${quiz.courseId}`}
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Back to course
        </Link>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">{quiz.title}</h1>
          {quiz.description ? (
            <p className="mt-2 text-sm text-[var(--muted)]">{quiz.description}</p>
          ) : null}
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <Stat label="Questions" value={quiz.totalQuestions} />
            <Stat label="Total points" value={quiz.totalPoints} />
            <Stat label="Pass score" value={`${quiz.passScore}%`} />
            <Stat
              label="Time limit"
              value={quiz.timeLimitMins ? `${quiz.timeLimitMins} min` : "None"}
            />
            {quiz.maxAttempts ? <Stat label="Max attempts" value={quiz.maxAttempts} /> : null}
          </dl>
          {err ? <p className="mt-4 text-sm text-[var(--danger)]">{err}</p> : null}
          <div className="mt-6 flex justify-end">
            <button
              onClick={startAttempt}
              disabled={quiz.totalQuestions === 0}
              className="rounded bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {quiz.totalQuestions === 0 ? "No questions yet" : "Start attempt"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Attempt in progress
  return (
    <PaginatedQuiz
      quiz={quiz}
      answers={answers}
      onChangeAnswer={(qid, v) => setAnswers((a) => ({ ...a, [qid]: v }))}
      currentIdx={currentIdx}
      setCurrentIdx={setCurrentIdx}
      onSubmit={submit}
      submitting={submitting}
      secondsLeft={secondsLeft}
      err={err}
    />
  );
}

function PaginatedQuiz({
  quiz,
  answers,
  onChangeAnswer,
  currentIdx,
  setCurrentIdx,
  onSubmit,
  submitting,
  secondsLeft,
  err,
}: {
  quiz: Quiz;
  answers: Answers;
  onChangeAnswer: (qid: string, v: unknown[]) => void;
  currentIdx: number;
  setCurrentIdx: (n: number) => void;
  onSubmit: () => void;
  submitting: boolean;
  secondsLeft: number | null;
  err: string | null;
}) {
  const total = quiz.questions.length;
  const safeIdx = Math.max(0, Math.min(currentIdx, total - 1));
  const current = quiz.questions[safeIdx];
  const answered = quiz.questions.filter(
    (q) => Array.isArray(answers[q.id]) && (answers[q.id] as unknown[]).length > 0,
  ).length;
  const allAnswered = answered === total;
  const isLast = safeIdx === total - 1;
  const isFirst = safeIdx === 0;
  const pct = Math.round(((safeIdx + 1) / total) * 100);

  function go(delta: number) {
    setCurrentIdx(Math.max(0, Math.min(total - 1, safeIdx + delta)));
  }

  // Arrow-key navigation on the wrapper for keyboard users
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIdx, total]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/courses/${quiz.courseId}`}
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Exit
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--muted)] tabular-nums">
            {answered}/{total} answered
          </span>
          {secondsLeft != null ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                secondsLeft < 30
                  ? "bg-red-100 text-red-700"
                  : "bg-[var(--accent-soft)] text-[var(--accent)]"
              }`}
            >
              {formatTime(secondsLeft)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-xs text-[var(--muted)]">
          <span>{quiz.title}</span>
          <span>
            Question {safeIdx + 1} of {total}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-2)]">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-sm">
        <QuestionInput
          question={current}
          index={safeIdx + 1}
          value={answers[current.id]}
          onChange={(v) => onChangeAnswer(current.id, v)}
        />
      </div>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      <div className="flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          disabled={isFirst}
          className="btn-secondary disabled:opacity-40"
        >
          ← Previous
        </button>
        <span className="text-xs text-[var(--muted)]">Use ← → keys to navigate</span>
        {isLast ? (
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="rounded bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            title={allAnswered ? "" : `${total - answered} question(s) unanswered`}
          >
            {submitting
              ? "Submitting…"
              : allAnswered
                ? "Submit quiz"
                : `Submit (${total - answered} unanswered)`}
          </button>
        ) : (
          <button onClick={() => go(1)} className="btn-primary">
            Next →
          </button>
        )}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Jump to question
        </p>
        <div className="flex flex-wrap gap-1.5">
          {quiz.questions.map((q, i) => {
            const isAnswered =
              Array.isArray(answers[q.id]) && (answers[q.id] as unknown[]).length > 0;
            const isCurrent = i === safeIdx;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                title={
                  isCurrent
                    ? "Current"
                    : isAnswered
                      ? "Answered — click to revisit"
                      : "Not answered yet"
                }
                className={`h-7 w-7 rounded text-xs font-medium tabular-nums ${
                  isCurrent
                    ? "bg-[var(--accent)] text-white"
                    : isAnswered
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

function QuestionInput({
  question,
  index,
  value,
  onChange,
}: {
  question: Question;
  index: number;
  value: unknown[] | undefined;
  onChange: (v: unknown[]) => void;
}) {
  const v = value ?? [];
  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm">
      <p className="text-xs font-semibold text-[var(--muted)]">
        Q{index} · {question.points} pt{question.points === 1 ? "" : "s"}
      </p>
      <p className="mt-1 text-sm font-medium">{question.prompt}</p>
      <div className="mt-3">
        {question.type === "MCQ_SINGLE" ? (
          <McqInputs
            options={question.options ?? []}
            value={v as number[]}
            onChange={onChange}
            single
          />
        ) : null}
        {question.type === "MCQ_MULTI" ? (
          <McqInputs
            options={question.options ?? []}
            value={v as number[]}
            onChange={onChange}
            single={false}
          />
        ) : null}
        {question.type === "TRUE_FALSE" ? (
          <div className="flex gap-2 text-sm">
            {[true, false].map((b) => (
              <button
                key={String(b)}
                type="button"
                onClick={() => onChange([b])}
                className={`flex-1 rounded border px-3 py-2 ${
                  (v[0] === b)
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-2)]"
                }`}
              >
                {b ? "True" : "False"}
              </button>
            ))}
          </div>
        ) : null}
        {question.type === "SHORT_ANSWER" ? (
          <input
            type="text"
            value={(v[0] as string) ?? ""}
            onChange={(e) => onChange([e.target.value])}
            placeholder="Your answer…"
            className="input w-full"
          />
        ) : null}
      </div>
    </li>
  );
}

function McqInputs({
  options,
  value,
  onChange,
  single,
}: {
  options: string[];
  value: number[];
  onChange: (v: unknown[]) => void;
  single: boolean;
}) {
  const selected = useMemo(() => new Set(value), [value]);
  return (
    <ul className="space-y-2">
      {options.map((opt, i) => {
        const on = selected.has(i);
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => {
                if (single) onChange([i]);
                else {
                  const next = new Set(selected);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  onChange(Array.from(next));
                }
              }}
              className={`flex w-full items-start gap-3 rounded border px-3 py-2 text-left text-sm ${
                on
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-2)]"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                  single ? "rounded-full" : "rounded"
                } ${
                  on
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border)] bg-white"
                }`}
              >
                {on ? (single ? "●" : "✓") : ""}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AttemptResult({
  quiz,
  attempt,
  onRetry,
}: {
  quiz: Quiz;
  attempt: Attempt;
  onRetry: () => void;
}) {
  const passed = attempt.passed === true;
  const byQuestion = useMemo(() => {
    const m = new Map<string, (typeof attempt.answers)[number]>();
    attempt.answers.forEach((a) => m.set(a.questionId, a));
    return m;
  }, [attempt]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div
        className={`rounded-xl p-8 text-center shadow-sm ${
          passed ? "bg-emerald-50" : "bg-orange-50"
        }`}
      >
        <div className="text-5xl">{passed ? "🎉" : "📚"}</div>
        <h1 className="mt-2 text-2xl font-semibold">
          {passed ? "Passed" : "Not yet"}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          You scored {attempt.score}/{attempt.maxScore} ({attempt.scorePct}%) · pass {quiz.passScore}%
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={onRetry} className="btn-secondary">
            Retake
          </button>
          <Link href={`/courses/${quiz.courseId}`} className="btn-primary inline-block">
            Back to course
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Review
        </h2>
        <ol className="space-y-3">
          {quiz.questions.map((q, i) => {
            const a = byQuestion.get(q.id);
            return (
              <li
                key={q.id}
                className={`rounded-lg border p-4 shadow-sm ${
                  a?.correct
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-orange-200 bg-orange-50/40"
                }`}
              >
                <p className="text-xs font-semibold text-[var(--muted)]">
                  Q{i + 1} · {a?.correct ? "Correct" : "Incorrect"} ·{" "}
                  {a?.pointsAwarded ?? 0}/{q.points} pt
                </p>
                <p className="mt-1 text-sm font-medium">{q.prompt}</p>
                {q.explanation ? (
                  <p className="mt-2 text-xs italic text-[var(--muted)]">{q.explanation}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
