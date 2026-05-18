"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiCourses, PptDesigner, type ProposedCourse } from "@/lib/api";
import { CourseDesigner } from "@/components/CourseDesigner";

type Mode = "ai" | "designer";

export default function GenerateFromPptPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("designer");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [moduleCount, setModuleCount] = useState("3");
  const [lessonsPerModule, setLessonsPerModule] = useState("4");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // After "Open in designer" succeeds, hold the proposed structure
  // for the designer pane.
  const [proposed, setProposed] = useState<ProposedCourse | null>(null);

  const isDesigner = mode === "designer";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      if (isDesigner) {
        const result = await PptDesigner.extract({
          file,
          topic: topic.trim() || undefined,
          lessonsPerModule: Number(lessonsPerModule) || undefined,
        });
        setProposed(result);
      } else {
        const course = await AiCourses.generateFromFile({
          file,
          mode: "ai",
          topic: topic.trim() || undefined,
          audience: audience.trim() || undefined,
          moduleCount: Number(moduleCount) || undefined,
          lessonsPerModule: Number(lessonsPerModule) || undefined,
          model: model.trim() || undefined,
        });
        router.push(`/courses/${course.id}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function commit(updated: ProposedCourse) {
    setBusy(true);
    setErr(null);
    try {
      const course = await PptDesigner.createFromStructure(updated);
      router.push(`/courses/${course.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create course");
      setBusy(false);
    }
  }

  if (proposed) {
    return (
      <CourseDesigner
        initial={proposed}
        onCancel={() => setProposed(null)}
        onSave={commit}
        saving={busy}
        error={err}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create course from PowerPoint</h1>
        <Link href="/courses" className="text-sm text-[var(--muted)] hover:underline">
          Cancel
        </Link>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Upload a deck (.pptx or .ppt). Pick a mode below.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Slide deck</span>
          <input
            type="file"
            accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-[var(--panel-2)] file:px-3 file:py-1 file:text-sm"
          />
          {file ? (
            <span className="mt-1 block text-xs text-[var(--muted)]">
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          ) : null}
        </label>

        <fieldset className="space-y-2 rounded border border-[var(--border)] bg-[var(--panel)] p-3">
          <legend className="px-1 text-xs uppercase tracking-wide text-[var(--muted)]">
            Mode
          </legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="mode"
              value="designer"
              checked={mode === "designer"}
              onChange={() => setMode("designer")}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Designer (no AI)</span>
              <span className="block text-xs text-[var(--muted)]">
                Each slide becomes a lesson. After upload you can rename, reorder,
                merge, and delete modules + lessons before saving. Instant; no
                provider needed.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="mode"
              value="ai"
              checked={mode === "ai"}
              onChange={() => setMode("ai")}
              className="mt-1"
            />
            <span>
              <span className="font-medium">AI-restructured</span>
              <span className="block text-xs text-[var(--muted)]">
                LLM designs modules/lessons from deck content. Polished output, 30–90s.
                Needs a provider in{" "}
                <Link href="/admin/providers" className="underline">
                  Admin
                </Link>.
              </span>
            </span>
          </label>
        </fieldset>

        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Course title override (optional)</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="defaults to the deck filename"
            className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          />
        </label>

        {!isDesigner ? (
          <label className="block text-sm">
            <span className="block pb-1 text-[var(--muted)]">Audience (optional)</span>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. mid-level developers"
              className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            />
          </label>
        ) : null}

        <div className="flex gap-3 text-sm">
          {!isDesigner ? (
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
          ) : null}
          <label className="block">
            <span className="block pb-1 text-[var(--muted)]">
              {isDesigner ? "Slides per module" : "Lessons per module"}
            </span>
            <input
              type="number"
              min="1"
              max="20"
              value={lessonsPerModule}
              onChange={(e) => setLessonsPerModule(e.target.value)}
              className="w-24 rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            />
          </label>
        </div>

        {!isDesigner ? (
          <label className="block text-sm">
            <span className="block pb-1 text-[var(--muted)]">Override model (optional)</span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="leave blank to use provider default"
              className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            />
          </label>
        ) : null}

        <button
          type="submit"
          disabled={busy || !file}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy
            ? isDesigner
              ? "Extracting slides…"
              : "Generating… (30–90s)"
            : isDesigner
              ? "Open in designer"
              : "Generate course"}
        </button>
        {err ? <p className="whitespace-pre-wrap text-sm text-red-400">{err}</p> : null}
      </form>
    </div>
  );
}
