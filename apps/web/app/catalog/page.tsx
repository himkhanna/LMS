"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE, Catalog, Enrollments, type CatalogResult, type Course, type Enrollment } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function CatalogPage() {
  const router = useRouter();
  const [result, setResult] = useState<CatalogResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [enrolledByCourse, setEnrolledByCourse] = useState<Map<string, Enrollment>>(
    new Map(),
  );

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    Enrollments.mine()
      .then((list) => {
        const m = new Map<string, Enrollment>();
        list.forEach((e) => m.set(e.courseId, e));
        setEnrolledByCourse(m);
      })
      .catch(() => {
        // non-fatal
      });
  }, [router]);

  useEffect(() => {
    setResult(null);
    setErr(null);
    const t = setTimeout(() => {
      Catalog.browse({ q: q || undefined, tag: tag || undefined })
        .then(setResult)
        .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load catalog"));
    }, 150);
    return () => clearTimeout(t);
  }, [q, tag]);

  async function selfEnroll(courseId: string) {
    try {
      const enrollment = await Catalog.enrollMe(courseId);
      setEnrolledByCourse((prev) => {
        const next = new Map(prev);
        next.set(courseId, enrollment);
        return next;
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not enroll");
    }
  }

  const tags = result?.tags ?? [];
  const courses = result?.courses ?? [];

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-semibold">Course catalog</h1>
        <p className="text-sm text-[var(--muted)]">
          Browse everything that&apos;s published. Click <b>Enroll</b> to add a course to
          your learning queue.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, description, or tag…"
          className="input min-w-[20rem] flex-1"
        />
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <TagPill label="All" active={tag === null} onClick={() => setTag(null)} />
          {tags.map((t) => (
            <TagPill key={t} label={t} active={tag === t} onClick={() => setTag(t)} />
          ))}
        </div>
      ) : null}

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      {result === null ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)] p-8 text-center">
          <p className="text-sm">No published courses match.</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            HR can publish new courses from the Courses screen.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CatalogCard
              key={c.id}
              course={c}
              enrollment={enrolledByCourse.get(c.id) ?? null}
              onEnroll={() => selfEnroll(c.id)}
              onTagClick={(t) => setTag(t)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TagPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--text)]"
      }`}
    >
      {label}
    </button>
  );
}

function CatalogCard({
  course,
  enrollment,
  onEnroll,
  onTagClick,
}: {
  course: Course;
  enrollment: Enrollment | null;
  onEnroll: () => void;
  onTagClick: (tag: string) => void;
}) {
  const cover = course.coverColor ?? "#1e63f2";
  const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const summary = course.summary ?? course.description ?? "";
  const imageUrl = absoluteAssetUrl(course.coverImageUrl);

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-sm">
      <div
        className="relative h-32 w-full overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${cover}, ${shade(cover, -25)})` }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Link
          href={`/courses/${course.id}/preview`}
          className="text-base font-semibold text-[var(--text)] hover:underline"
        >
          {course.title}
        </Link>
        {summary ? (
          <p className="mt-1 line-clamp-3 text-sm text-[var(--muted)]">{summary}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1">
          {course.tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onTagClick(t);
              }}
              className="chip chip-muted hover:bg-[var(--panel-2)]"
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-auto pt-4">
          <p className="text-xs text-[var(--muted)]">
            {course.modules.length} module{course.modules.length === 1 ? "" : "s"} ·{" "}
            {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
          </p>
          <div className="mt-2">
            {enrollment ? (
              <EnrolledBadge enrollment={enrollment} courseId={course.id} />
            ) : (
              <button
                onClick={onEnroll}
                className="w-full rounded bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
              >
                Enroll
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function EnrolledBadge({
  enrollment,
  courseId,
}: {
  enrollment: Enrollment;
  courseId: string;
}) {
  const label =
    enrollment.status === "COMPLETED"
      ? "Completed — review"
      : enrollment.progressPct > 0
      ? "Continue"
      : "Start";
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/courses/${courseId}/preview`}
        className="flex-1 rounded border border-[var(--accent)] px-3 py-2 text-center text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
      >
        {label}
      </Link>
      <span className="text-xs tabular-nums text-[var(--muted)]">
        {enrollment.progressPct}%
      </span>
    </div>
  );
}

/** Crude shade helper — adjusts a #rrggbb hex by a percentage. */
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

function shade(hex: string, pct: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const f = pct / 100;
  r = Math.max(0, Math.min(255, Math.round(r + (f >= 0 ? (255 - r) * f : r * f))));
  g = Math.max(0, Math.min(255, Math.round(g + (f >= 0 ? (255 - g) * f : g * f))));
  b = Math.max(0, Math.min(255, Math.round(b + (f >= 0 ? (255 - b) * f : b * f))));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
