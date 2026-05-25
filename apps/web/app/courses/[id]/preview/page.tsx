"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { API_BASE, Courses, Progress, type Course, type LessonDto, type LessonProgress } from "@/lib/api";
import { getSession, hasRole } from "@/lib/auth";
import { VideoPlayer } from "@/components/VideoPlayer";
import { SpeechPlayer } from "@/components/SpeechPlayer";

const PER_SLIDE_SECS = 15;

type Slide = {
  lesson: LessonDto;
  moduleTitle: string;
  moduleIndex: number;
  lessonIndex: number;
  slideNumber: number;
};

export default function CoursePreviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(PER_SLIDE_SECS);
  const [done, setDone] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<{ idx: number; lessonTitle: string } | null>(null);
  /** Browser autoplay policy: speechSynthesis.speak before a user gesture
   *  is silently dropped on Chrome / Edge / Safari. We gate the first
   *  slide behind a single "Start training" click so the whole chain
   *  plays afterwards. Set true once the learner has interacted. */
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const startedRef = useRef<Set<string>>(new Set());
  const completedRef = useRef<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canEdit =
    hasRole("ROLE_ADMIN") || hasRole("ROLE_HR") || hasRole("ROLE_INSTRUCTOR");

  // Fullscreen toggle scoped to the slideshow container; tracks the
  // browser's fullscreen state so the label flips back when the user
  // hits Esc to exit.
  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (rootRef.current) {
        await rootRef.current.requestFullscreen();
      }
    } catch {
      // Older browsers / blocked by policy — silently ignore.
    }
  }, []);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    Courses.get(params.id)
      .then((c) => {
        setCourse(c);
        // Seed resume state from existing progress so we don't double-
        // emit markStarted / markCompleted, and so we can offer
        // "Resume from Slide N" instead of dumping the learner at slide 1.
        Progress.forCourse(params.id)
          .then((items) => seedFromProgress(c, items))
          .catch(() => {
            // Non-fatal: no progress yet, or endpoint blip — just start fresh.
          });
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));

    function seedFromProgress(c: Course, items: LessonProgress[]) {
      const byLesson = new Map<string, LessonProgress>();
      items.forEach((p) => byLesson.set(p.lessonId, p));
      // Walk the course in slide order; collect the indexes of completed
      // lessons (to skip re-marking) and find the first non-completed slot.
      const ordered: { lessonId: string }[] = [];
      c.modules.forEach((m) => m.lessons.forEach((l) => ordered.push({ lessonId: l.id })));
      let resumeIdx = 0;
      let lastCompletedIdx = -1;
      for (let i = 0; i < ordered.length; i++) {
        const p = byLesson.get(ordered[i].lessonId);
        if (p?.status === "COMPLETED") {
          completedRef.current.add(ordered[i].lessonId);
          lastCompletedIdx = i;
        }
        if (p?.status === "STARTED") {
          startedRef.current.add(ordered[i].lessonId);
        }
      }
      // Resume = first not-yet-completed slide. If everything's done,
      // land on the final slide (the "Finish" CTA).
      resumeIdx = ordered.findIndex(
        (s) => byLesson.get(s.lessonId)?.status !== "COMPLETED",
      );
      if (resumeIdx === -1) resumeIdx = ordered.length - 1;
      // Only prompt the learner if they actually have progress worth
      // resuming — first launch goes straight to slide 1.
      if (lastCompletedIdx >= 0 && resumeIdx > 0) {
        const lessonTitle =
          c.modules.flatMap((m) => m.lessons)[resumeIdx]?.title ?? `Slide ${resumeIdx + 1}`;
        setResumePrompt({ idx: resumeIdx, lessonTitle });
      }
    }
  }, [params.id, router]);

  const slides = useMemo<Slide[]>(() => {
    if (!course) return [];
    const out: Slide[] = [];
    let n = 0;
    course.modules.forEach((m, mi) => {
      m.lessons.forEach((l, li) => {
        n++;
        out.push({
          lesson: l,
          moduleTitle: m.title,
          moduleIndex: mi + 1,
          lessonIndex: li + 1,
          slideNumber: n,
        });
      });
    });
    return out;
  }, [course]);

  useEffect(() => {
    setRemaining(PER_SLIDE_SECS);
    const slide = slides[idx];
    if (!slide) return;
    const lessonId = slide.lesson.id;
    if (!startedRef.current.has(lessonId)) {
      startedRef.current.add(lessonId);
      Progress.markStarted(lessonId).catch(() => {
        // ignore: progress tracking is best-effort
      });
    }
  }, [idx, slides]);

  const markLessonComplete = useCallback((lessonId: string) => {
    if (completedRef.current.has(lessonId)) return;
    completedRef.current.add(lessonId);
    Progress.markCompleted(lessonId).catch(() => {
      // ignore: progress tracking is best-effort
    });
  }, []);

  useEffect(() => {
    if (done || slides.length === 0) return;
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining, idx, done, slides.length]);

  // In learner mode, slides WITHOUT narration auto-advance when the
  // per-slide timer hits zero. Narrated slides advance on onEnded
  // instead and ignore this hook.
  useEffect(() => {
    if (canEdit) return;
    if (done || slides.length === 0) return;
    if (remaining !== 0) return;
    const current = slides[idx];
    if (!current) return;
    if (current.lesson.voiceOverText) return; // narration drives advance
    if (!audioUnlocked && slides.some((s) => !!s.lesson.voiceOverText)) return;
    const t = setTimeout(() => {
      markLessonComplete(current.lesson.id);
      if (idx >= slides.length - 1) setDone(true);
      else setIdx((i) => i + 1);
    }, 400);
    return () => clearTimeout(t);
  }, [canEdit, remaining, idx, slides, done, audioUnlocked, markLessonComplete]);

  const goNext = useCallback(() => {
    if (slides.length === 0) return;
    if (remaining > 0) return;
    const current = slides[idx];
    if (current) markLessonComplete(current.lesson.id);
    if (idx >= slides.length - 1) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
  }, [idx, remaining, slides, markLessonComplete]);

  /** Auto-advance trigger from the SpeechPlayer — runs when the
   *  narration finishes naturally. We bypass the per-slide timer in
   *  learner mode so the chain plays end-to-end without manual clicks.
   *  Admin/preview mode ignores this (their setting is the timer). */
  const onNarrationEnded = useCallback(() => {
    if (canEdit) return;
    if (slides.length === 0) return;
    const current = slides[idx];
    if (current) markLessonComplete(current.lesson.id);
    if (idx >= slides.length - 1) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
  }, [canEdit, idx, slides, markLessonComplete]);

  const goPrev = useCallback(() => {
    if (done) {
      setDone(false);
      return;
    }
    if (idx > 0) setIdx((i) => i - 1);
  }, [idx, done]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        if (remaining === 0) {
          e.preventDefault();
          goNext();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "f" || e.key === "F") {
        // Avoid hijacking F when the user is typing into a form field
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape") {
        // Let the browser handle Esc when in fullscreen — it already
        // exits — and only navigate away when we're NOT fullscreen.
        if (document.fullscreenElement) return;
        router.push(canEdit ? `/courses/${params.id}` : "/my-learning");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, remaining, router, params.id, toggleFullscreen, canEdit]);

  if (err && !course) return <p className="text-sm text-red-400">{err}</p>;
  if (!course) return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  if (slides.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10 text-center">
        <p className="text-[var(--muted)]">No lessons in this course yet — nothing to preview.</p>
        <Link href={`/courses/${course.id}`} className="text-sm underline">
          Back to course
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12 text-center">
        <div className="text-5xl">✓</div>
        <h1 className="text-3xl font-semibold">Course complete</h1>
        <p className="text-[var(--muted)]">
          You finished <span className="font-medium text-[var(--text)]">{course.title}</span> ·{" "}
          {slides.length} lesson{slides.length === 1 ? "" : "s"}.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setIdx(0);
              setDone(false);
            }}
            className="rounded border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--panel)]"
          >
            Restart
          </button>
          <Link
            href={`/courses/${course.id}`}
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Back to course
          </Link>
        </div>
      </div>
    );
  }

  const slide = slides[idx];
  const pct = Math.round(((slide.slideNumber - 1) / slides.length) * 100);

  return (
    <div
      ref={rootRef}
      className={
        isFullscreen
          ? "flex h-screen w-screen flex-col gap-4 overflow-y-auto bg-[var(--bg)] px-8 py-6"
          : "mx-auto flex min-h-[calc(100vh-10rem)] max-w-3xl flex-col gap-6 py-4"
      }
    >
      {!canEdit && !audioUnlocked && !resumePrompt && slides.some((s) => !!s.lesson.voiceOverText) ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 text-center shadow-xl">
            <h2 className="text-lg font-semibold">Ready to begin?</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              This training is narrated. Click below to enable audio — your
              browser blocks autoplay until you give the go-ahead. Slides
              advance automatically as the narration finishes.
            </p>
            <button
              autoFocus
              onClick={() => setAudioUnlocked(true)}
              className="mt-5 rounded bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              ▶ Start training
            </button>
          </div>
        </div>
      ) : null}

      {resumePrompt ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Pick up where you left off?</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              You stopped at <b className="text-[var(--text)]">slide {resumePrompt.idx + 1}</b>
              {resumePrompt.lessonTitle ? (
                <>
                  {" — "}<i>{resumePrompt.lessonTitle}</i>
                </>
              ) : null}
              . Your progress is saved automatically as you go.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => {
                  setIdx(0);
                  setResumePrompt(null);
                }}
                className="btn-secondary"
              >
                Start over
              </button>
              <button
                onClick={() => {
                  setIdx(resumePrompt.idx);
                  setResumePrompt(null);
                }}
                className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
                autoFocus
              >
                Resume from slide {resumePrompt.idx + 1}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>
            Module {slide.moduleIndex}: <span className="text-[var(--text)]">{slide.moduleTitle}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hover:underline"
              title="Fullscreen (F)"
            >
              {isFullscreen ? "Exit fullscreen" : "⛶ Fullscreen"}
            </button>
            <Link href={canEdit ? `/courses/${course.id}` : "/my-learning"} className="hover:underline">
              {canEdit ? "Exit preview" : "← My Learning"}
            </Link>
          </div>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-2)]">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {canEdit ? (
          <div className="text-xs text-[var(--muted)]">
            Slide {slide.slideNumber} of {slides.length}
          </div>
        ) : null}
      </div>

      <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-sm">
        {canEdit || showLessonTitle(slide.lesson.title) ? (
          <h1 className="text-3xl font-semibold leading-tight">{slide.lesson.title}</h1>
        ) : null}
        {slide.lesson.voiceOverText ? (
          <div className="mt-3">
            <SpeechPlayer
              text={slide.lesson.voiceOverText}
              scopeKey={slide.lesson.id}
              compact={!canEdit}
              hidden={!canEdit}
              autoPlay={!canEdit && audioUnlocked}
              onEnded={onNarrationEnded}
            />
          </div>
        ) : null}
        {slide.lesson.videoUrl ? (
          <div className="mt-4">
            <VideoPlayer
              url={slide.lesson.videoUrl}
              provider={slide.lesson.videoProvider}
              onProgress={(pct) => {
                Progress.markWatched(slide.lesson.id, pct).catch(() => {
                  // ignore: best-effort
                });
                if (pct >= 90) markLessonComplete(slide.lesson.id);
              }}
              onEnded={() => markLessonComplete(slide.lesson.id)}
            />
          </div>
        ) : null}
        <LessonBody content={slide.lesson.content} />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={idx === 0}
          className="rounded border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-30"
        >
          ← Previous
        </button>
        <div className="text-xs text-[var(--muted)]">
          Use ← → keys to navigate
        </div>
        <button
          onClick={goNext}
          disabled={remaining > 0}
          className="rounded bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {remaining > 0
            ? `Next in ${remaining}s`
            : idx === slides.length - 1
              ? "Finish ✓"
              : "Next →"}
        </button>
      </div>
    </div>
  );
}

/**
 * Skip the lesson title for learners when it's the auto-generated
 * "Slide N" placeholder from a PPT slideshow upload. HR-customised
 * titles still show. Admin/HR see all titles via canEdit.
 */
function showLessonTitle(title: string): boolean {
  if (!title) return false;
  return !/^\s*slide\s+\d+\s*$/i.test(title);
}

function LessonBody({ content }: { content: string | null }) {
  if (!content) {
    return <p className="mt-6 italic text-[var(--muted)]">(no content for this lesson)</p>;
  }
  const looksLikeHtml = /<[a-z][^>]*>/i.test(content);
  if (looksLikeHtml) {
    // Backend embeds slide images as <img src="/api/v1/assets/files/..."/>.
    // The browser resolves that against the web app's origin, but the
    // course-service runs on a different port (API_BASE), so we rewrite
    // any /api/v1/* path to an absolute URL before sanitising.
    const expanded = content.replace(
      /(src|href)="\/api\/v1\//g,
      `$1="${API_BASE}/api/v1/`,
    );
    const safe = DOMPurify.sanitize(expanded);
    return (
      <div
        className="prose prose-invert mt-6 max-w-none leading-relaxed"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    );
  }
  return (
    <div className="mt-6 whitespace-pre-wrap leading-relaxed text-[var(--text)]">
      {content}
    </div>
  );
}
