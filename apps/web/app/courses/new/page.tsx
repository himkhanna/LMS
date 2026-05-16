"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Courses } from "@/lib/api";

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New course</h1>
        <Link href="/courses" className="text-sm text-[var(--muted)] hover:underline">
          Cancel
        </Link>
      </div>
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
            rows={5}
            className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create course"}
        </button>
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
      </form>
    </div>
  );
}
