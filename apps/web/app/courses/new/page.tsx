"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Courses, Templates, type CourseTemplateSummary } from "@/lib/api";

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [templates, setTemplates] = useState<CourseTemplateSummary[] | null>(null);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);

  useEffect(() => {
    Templates.list()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const c = await Courses.create({ title, description: description || undefined });
      router.push(`/courses/${c.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function fromTemplate(id: string) {
    setCreatingTemplate(id);
    setErr(null);
    try {
      const c = await Templates.createCourse({ templateId: id });
      router.push(`/courses/${c.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Template create failed");
      setCreatingTemplate(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New course</h1>
        <Link href="/courses" className="text-sm text-[var(--muted)] hover:underline">
          Cancel
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Start from a template
        </h2>
        {templates === null ? (
          <p className="text-sm text-[var(--muted)]">Loading templates…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No templates available.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={creatingTemplate !== null}
                onClick={() => fromTemplate(t.id)}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 text-left shadow-sm hover:border-[var(--accent)] disabled:opacity-50"
              >
                <div className="font-medium">{t.name}</div>
                <p className="mt-1 text-xs text-[var(--muted)]">{t.description}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {t.moduleCount} modules · {t.lessonCount} lessons
                  {creatingTemplate === t.id ? " · creating…" : ""}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Or start blank
        </h2>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
            <span className="block pb-1 text-[var(--muted)]">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
              required
              maxLength={255}
            />
          </label>
          <label className="block text-sm">
            <span className="block pb-1 text-[var(--muted)]">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create blank course"}
          </button>
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
        </form>
      </section>
    </div>
  );
}
