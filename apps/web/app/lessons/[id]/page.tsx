"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Assets, Lessons, type AssetDto, type LessonDto } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useRequireRole } from "@/lib/useRequireRole";

export default function LessonDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const gate = useRequireRole(["ROLE_ADMIN", "ROLE_HR", "ROLE_INSTRUCTOR"]);
  const [lesson, setLesson] = useState<LessonDto | null>(null);
  const [assets, setAssets] = useState<AssetDto[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [duration, setDuration] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [voiceOver, setVoiceOver] = useState("");
  const [savedHash, setSavedHash] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function reload() {
    try {
      const [l, a] = await Promise.all([Lessons.get(params.id), Assets.list(params.id)]);
      setLesson(l);
      setAssets(a);
      setTitle(l.title);
      setContent(l.content ?? "");
      setDuration(l.durationSecs ? String(l.durationSecs) : "");
      setVideoUrl(l.videoUrl ?? "");
      setVoiceOver(l.voiceOverText ?? "");
      setSavedHash(
        hashState(l.title, l.content ?? "", l.durationSecs, l.videoUrl ?? "", l.voiceOverText ?? ""),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    if (gate !== "allowed") return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, gate]);

  const dirty = lesson
    ? hashState(title, content, duration ? Number(duration) : null, videoUrl, voiceOver) !== savedHash
    : false;

  async function save() {
    if (!lesson) return;
    setSaving(true);
    setErr(null);
    try {
      const next = await Lessons.update(lesson.id, {
        title: title.trim() || lesson.title,
        content,
        durationSecs: duration ? Number(duration) : undefined,
        videoUrl: videoUrl.trim() === "" ? null : videoUrl.trim(),
        voiceOverText: voiceOver.trim() === "" ? null : voiceOver,
      });
      setLesson(next);
      setSavedHash(
        hashState(
          next.title,
          next.content ?? "",
          next.durationSecs,
          next.videoUrl ?? "",
          next.voiceOverText ?? "",
        ),
      );
      setSavedAt(new Date());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (gate !== "allowed") return <p className="text-sm text-[var(--muted)]">Loading…</p>;
  if (err && !lesson) return <p className="text-sm text-red-400">{err}</p>;
  if (!lesson) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {lesson.courseId ? (
          <Link
            href={`/courses/${lesson.courseId}`}
            className="text-sm text-[var(--muted)] hover:underline"
          >
            ← Back to course
          </Link>
        ) : <span />}
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          {savedAt && !dirty ? <span>Saved {savedAt.toLocaleTimeString()}</span> : null}
          {dirty ? <span className="text-amber-400">Unsaved changes</span> : null}
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-2xl font-semibold"
          placeholder="Lesson title"
          maxLength={255}
        />
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          Duration (seconds):
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 60"
            className="w-24 rounded border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-sm"
          />
        </label>
        <label className="block text-xs text-[var(--muted)]">
          <span className="block pb-1">Video URL (YouTube, Vimeo, or .mp4 link). Leave blank for a text-only lesson.</span>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtu.be/… or https://…/lesson.mp4"
            className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div>
        <RichTextEditor value={content} onChange={setContent} />
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label className="text-sm">
            <span className="font-medium">🔊 Voiceover script</span>
            <span className="ml-1 text-xs text-[var(--muted)]">
              Read aloud in the slideshow viewer via the browser&apos;s text-to-speech. Leave blank to skip narration.
            </span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVoiceOver(stripHtml(content).trim())}
              className="btn-mini"
              title="Copy the plain text of the lesson content into the script"
            >
              ⇣ from content
            </button>
            {voiceOver ? (
              <button
                type="button"
                onClick={() => setVoiceOver("")}
                className="btn-mini btn-mini-danger"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
        <textarea
          value={voiceOver}
          onChange={(e) => setVoiceOver(e.target.value)}
          onPaste={(e) => {
            // The Tiptap editor above installs ProseMirror plugins that
            // sometimes swallow paste events bubbling up from sibling
            // inputs. Handle the paste explicitly so plain-text clipboard
            // content always lands in the textarea.
            const text = e.clipboardData?.getData("text/plain") ?? "";
            if (!text) return; // empty clipboard — let the default run
            e.preventDefault();
            e.stopPropagation();
            const target = e.currentTarget;
            const start = target.selectionStart ?? voiceOver.length;
            const end = target.selectionEnd ?? voiceOver.length;
            const next = voiceOver.slice(0, start) + text + voiceOver.slice(end);
            setVoiceOver(next);
            requestAnimationFrame(() => {
              target.selectionStart = target.selectionEnd = start + text.length;
            });
          }}
          rows={Math.min(10, Math.max(3, voiceOver.split("\n").length + 1))}
          placeholder="e.g. Welcome to lesson one. Today we'll look at how phishing attacks start with a single careless click…"
          className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm"
        />
        <p className="text-xs text-[var(--muted)]">
          {voiceOver.trim() ? `${voiceOver.trim().split(/\s+/).length} words · ~${Math.round(voiceOver.trim().split(/\s+/).length / 2.5)}s at 1× speed` : "Empty — no narration on this slide."}
        </p>
      </section>

      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Assets</h2>
        <UploadForm lessonId={lesson.id} onUploaded={reload} />
        {assets === null ? (
          <p className="text-sm text-[var(--muted)]">Loading assets…</p>
        ) : assets.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No assets uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {assets.map((a) => (
              <AssetRow key={a.id} asset={a} onDeleted={reload} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function hashState(
  title: string,
  content: string,
  durationSecs: number | null,
  videoUrl: string,
  voiceOver: string,
): string {
  return `${title} ${content} ${durationSecs ?? ""} ${videoUrl} ${voiceOver}`;
}

/** Quick HTML→text for the "Copy from content" button. */
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function UploadForm({ lessonId, onUploaded }: { lessonId: string; onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      await Assets.upload(lessonId, file);
      onUploaded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        onChange={onChange}
        disabled={busy}
        className="text-sm file:mr-3 file:rounded file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1 file:text-sm file:font-medium file:text-white"
      />
      {busy ? <span className="text-xs text-[var(--muted)]">Uploading…</span> : null}
      {err ? <span className="text-xs text-red-400">{err}</span> : null}
    </div>
  );
}

function AssetRow({ asset, onDeleted }: { asset: AssetDto; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm(`Delete ${asset.originalName ?? "this asset"}?`)) return;
    setBusy(true);
    try {
      await Assets.delete(asset.id);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }
  const sizeKb = asset.sizeBytes ? Math.round(asset.sizeBytes / 1024) : null;
  return (
    <li className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
      <div className="min-w-0 flex-1 truncate">
        <a
          href={Assets.resolveUrl(asset.url)}
          target="_blank"
          rel="noreferrer"
          className="text-sm hover:underline"
        >
          {asset.originalName ?? asset.storageKey}
        </a>
        <div className="text-xs text-[var(--muted)]">
          {asset.contentType ?? "unknown"}
          {sizeKb !== null ? ` · ${sizeKb} KB` : ""}
        </div>
      </div>
      <button
        onClick={remove}
        disabled={busy}
        className="text-xs text-[var(--muted)] hover:text-red-400 disabled:opacity-50"
      >
        Delete
      </button>
    </li>
  );
}
