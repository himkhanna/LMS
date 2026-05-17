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
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/courses/${quiz.courseId}`}
          className="text-sm text-[var(--muted)] hover:underline"
        >
          ← Exit
        </Link>
        {secondsLeft != null ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              secondsLeft < 30 ? "bg-red-100 text-red-700" : "bg-[var(--accent-soft)] text-[var(--accent)]"
            }`}
          >
            Time left: {formatTime(secondsLeft)}
          </span>
        ) : null}
      </div>
      <h1 className="text-xl font-semibold">{quiz.title}</h1>
      <ol className="space-y-4">
        {quiz.questions.map((q, i) => (
          <QuestionInput
            key={q.id}
            question={q}
            index={i + 1}
            value={answers[q.id]}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          />
        ))}
      </ol>
      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit quiz"}
        </button>
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
