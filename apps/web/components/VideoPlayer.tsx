"use client";

import { useEffect, useRef, useState } from "react";

type Provider = "YOUTUBE" | "VIMEO" | "FILE" | "URL" | null | undefined;

type Props = {
  url: string;
  provider?: Provider;
  onProgress?: (watchPct: number) => void;
  onEnded?: () => void;
};

/**
 * Lightweight video player covering 3 sources:
 *   • Direct video file (.mp4 / .webm / .m4v) → <video> with timeupdate
 *   • YouTube                                  → embedded iframe (no
 *     in-frame progress; SPA approximates via time-on-slide)
 *   • Vimeo                                    → embedded iframe (same)
 *
 * For direct files we forward the play position as a percentage to
 * onProgress, throttled to once a second. The parent decides what
 * "completed" means (we just report); the backend marks the lesson
 * complete at >= 90% via /api/v1/me/lessons/{id}/watch.
 */
export function VideoPlayer({ url, provider, onProgress, onEnded }: Props) {
  const resolved = provider ?? classify(url);

  if (resolved === "YOUTUBE") {
    const embed = youtubeEmbed(url);
    if (!embed) return <UnsupportedUrl url={url} />;
    return <Iframe src={embed} />;
  }
  if (resolved === "VIMEO") {
    const embed = vimeoEmbed(url);
    if (!embed) return <UnsupportedUrl url={url} />;
    return <Iframe src={embed} />;
  }
  if (resolved === "FILE") {
    return <FilePlayer url={url} onProgress={onProgress} onEnded={onEnded} />;
  }
  // URL fallback — try as a file first, otherwise present a link
  return <FilePlayer url={url} onProgress={onProgress} onEnded={onEnded} />;
}

function Iframe({ src }: { src: string }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-sm">
      <iframe
        src={src}
        title="Lesson video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}

function FilePlayer({
  url,
  onProgress,
  onEnded,
}: {
  url: string;
  onProgress?: (watchPct: number) => void;
  onEnded?: () => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [maxPct, setMaxPct] = useState(0);
  const lastEmittedRef = useRef(0);

  useEffect(() => {
    setMaxPct(0);
    lastEmittedRef.current = 0;
  }, [url]);

  function tick(e: React.SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    if (!v.duration || v.duration === Infinity || Number.isNaN(v.duration)) return;
    const pct = Math.round((v.currentTime / v.duration) * 100);
    if (pct <= maxPct) return;
    setMaxPct(pct);
    // Throttle network reporting to every 5 percentage points
    if (pct - lastEmittedRef.current >= 5 || pct >= 90) {
      lastEmittedRef.current = pct;
      onProgress?.(pct);
    }
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg bg-black shadow-sm">
        <video
          ref={ref}
          src={url}
          controls
          preload="metadata"
          onTimeUpdate={tick}
          onEnded={() => {
            setMaxPct(100);
            onProgress?.(100);
            onEnded?.();
          }}
          className="aspect-video w-full bg-black"
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full bg-[var(--accent)] transition-all"
            style={{ width: `${maxPct}%` }}
          />
        </div>
        <span className="w-12 text-right tabular-nums">{maxPct}%</span>
      </div>
    </div>
  );
}

function UnsupportedUrl({ url }: { url: string }) {
  return (
    <p className="text-sm">
      Video link:{" "}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-[var(--accent)] underline"
      >
        {url}
      </a>
    </p>
  );
}

function classify(url: string): Provider {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YOUTUBE";
  if (lower.includes("vimeo.com")) return "VIMEO";
  if (/\.(mp4|webm|m4v)(\?|$)/.test(lower)) return "FILE";
  return "URL";
}

function youtubeEmbed(url: string): string | null {
  // Accepts youtu.be/<id>, youtube.com/watch?v=<id>, youtube.com/embed/<id>
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("youtu.be")) {
      const id = u.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}?modestbranding=1&rel=0` : null;
    }
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url;
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}?modestbranding=1&rel=0` : null;
    }
  } catch {
    return null;
  }
  return null;
}

function vimeoEmbed(url: string): string | null {
  // vimeo.com/<id> → player.vimeo.com/video/<id>
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("vimeo.com")) {
      if (u.hostname.startsWith("player.")) return url;
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}
