"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Assets, Lessons, type AssetDto, type LessonDto } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function LessonDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<LessonDto | null>(null);
  const [assets, setAssets] = useState<AssetDto[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    try {
      const [l, a] = await Promise.all([Lessons.get(params.id), Assets.list(params.id)]);
      setLesson(l);
      setAssets(a);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  if (err && !lesson) return <p className="text-sm text-red-400">{err}</p>;
  if (!lesson) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        {lesson.courseId ? (
          <Link
            href={`/courses/${lesson.courseId}`}
            className="text-sm text-[var(--muted)] hover:underline"
          >
            ← Back to course
          </Link>
        ) : null}
      </div>
      <h1 className="text-2xl font-semibold">{lesson.title}</h1>
      {lesson.durationSecs ? (
        <p className="text-xs text-[var(--muted)]">{lesson.durationSecs}s</p>
      ) : null}
      {lesson.content ? (
        <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">{lesson.content}</p>
      ) : (
        <p className="text-sm text-[var(--muted)]">No content yet.</p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Assets</h2>
        <UploadForm lessonId={lesson.id} onUploaded={reload} />
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
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
