"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiCourses } from "@/lib/api";

export default function GenerateCoursePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [moduleCount, setModuleCount] = useState("3");
  const [lessonsPerModule, setLessonsPerModule] = useState("3");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const course = await AiCourses.generate({
        topic: topic.trim(),
        audience: audience.trim() || undefined,
        moduleCount: Number(moduleCount) || undefined,
        lessonsPerModule: Number(lessonsPerModule) || undefined,
        model: model.trim() || undefined,
      });
      router.push(`/courses/${course.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Generate course with AI</h1>
        <Link href="/courses" className="text-sm text-[var(--muted)] hover:underline">
          Cancel
        </Link>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Calls the AI gateway using the default provider. Configure providers in{" "}
        <Link href="/admin/providers" className="underline">Admin</Link>.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Topic</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            placeholder="e.g. Kubernetes for backend engineers"
            className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Audience</span>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. mid-level developers, no prior K8s knowledge"
            className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          />
        </label>
        <div className="flex gap-3 text-sm">
          <label className="block">
            <span className="block pb-1 text-[var(--muted)]">Modules</span>
            <input
              type="number"
              min="1"
              max="10"
              value={moduleCount}
              onChange={(e) => setModuleCount(e.target.value)}
              className="w-24 rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="block pb-1 text-[var(--muted)]">Lessons per module</span>
            <input
              type="number"
              min="1"
              max="10"
              value={lessonsPerModule}
              onChange={(e) => setLessonsPerModule(e.target.value)}
              className="w-24 rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Override model (optional)</span>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="leave blank to use provider default"
            className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !topic.trim()}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Generating… (this can take 30–60s)" : "Generate course"}
        </button>
        {err ? <p className="whitespace-pre-wrap text-sm text-red-400">{err}</p> : null}
      </form>
    </div>
  );
}
