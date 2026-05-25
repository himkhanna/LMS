"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  text: string;
  /** Stable key — when it changes (next slide) the player resets. */
  scopeKey: string;
  /** Default voice name (persisted across slides via localStorage). */
  autoPlay?: boolean;
  /** Called when speech finishes naturally (not on pause). Lets the
   *  slideshow viewer optionally auto-advance to the next slide. */
  onEnded?: () => void;
  /** When true (learner mode) we hide voice/speed pickers behind a small
   *  ⚙ toggle so the toolbar is just Play/Pause + auto-play. Admin and
   *  HR see the full toolbar in preview mode for diagnostics. */
  compact?: boolean;
};

const LS_VOICE = "lms.tts.voice";
const LS_RATE = "lms.tts.rate";
const LS_AUTOPLAY = "lms.tts.autoplay";

/**
 * Browser-only TTS player using the Web Speech API. Free, offline,
 * zero backend. Voice list comes from the OS/browser (e.g. Microsoft
 * voices on Windows, Apple voices on Mac, eSpeak on Linux Firefox).
 */
export function SpeechPlayer({ text, scopeKey, autoPlay, onEnded, compact }: Props) {
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string>("");
  const [rate, setRate] = useState<number>(1);
  const [autoPlayPref, setAutoPlayPref] = useState<boolean>(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load saved preferences once.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    setVoiceName(localStorage.getItem(LS_VOICE) ?? "");
    const r = Number(localStorage.getItem(LS_RATE));
    if (r > 0) setRate(r);
    setAutoPlayPref(localStorage.getItem(LS_AUTOPLAY) === "1");
  }, []);

  // Voices populate async on some browsers (Chrome especially).
  useEffect(() => {
    if (!supported) return;
    function load() {
      const list = window.speechSynthesis.getVoices();
      setVoices(list);
      if (!voiceName && list.length > 0) {
        // Prefer an English voice that mentions "Natural" or "Online" if
        // available — those tend to be far better than the default.
        const pick =
          list.find((v) => /en/i.test(v.lang) && /natural|online|neural/i.test(v.name)) ??
          list.find((v) => /en-(US|GB|IN)/i.test(v.lang)) ??
          list[0];
        setVoiceName(pick.name);
      }
    }
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [supported, voiceName]);

  const selectedVoice = useMemo(
    () => voices.find((v) => v.name === voiceName) ?? null,
    [voices, voiceName],
  );

  // Cancel any speech when the slide changes. Re-runs when the loaded
  // autoplay preference flips from its initial false -> true, so the
  // very first slide isn't skipped just because localStorage hadn't
  // hydrated yet.
  useEffect(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
    // Auto-play (caller's request OR user pref) on a new slide with text.
    const should = (autoPlay ?? autoPlayPref) && !!text?.trim();
    if (should) {
      // Small delay — Chrome ignores speak() while a cancel is settling.
      // Browser autoplay policies may still block the very first call if
      // the page hasn't received any user gesture yet; subsequent slides
      // (after Next/keyboard nav) work fine.
      const t = setTimeout(() => start(), 200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, supported, autoPlayPref, autoPlay]);

  function start() {
    if (!supported || !text?.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (selectedVoice) u.voice = selectedVoice;
    u.rate = rate;
    u.onend = () => {
      setPlaying(false);
      setPaused(false);
      onEnded?.();
    };
    u.onerror = () => {
      setPlaying(false);
      setPaused(false);
    };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    setPlaying(true);
    setPaused(false);
  }

  function pause() {
    if (!supported) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }
  function resume() {
    if (!supported) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }
  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setPlaying(false);
    setPaused(false);
  }

  if (!supported) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)]">
        Your browser doesn’t support speech synthesis — open this lesson in
        Chrome, Edge, or Safari to hear the narration.
      </div>
    );
  }

  if (!text?.trim()) return null;

  const showAdvanced = !compact || advancedOpen;
  const transport = !playing ? (
    <button onClick={start} className="btn-mini" aria-label="Play narration">▶ Play</button>
  ) : paused ? (
    <button onClick={resume} className="btn-mini" aria-label="Resume narration">▶ Resume</button>
  ) : (
    <button onClick={pause} className="btn-mini" aria-label="Pause narration">⏸ Pause</button>
  );

  const advanced = (
    <>
      <label className="ml-2 flex items-center gap-1 text-[var(--muted)]">
        Voice:
        <select
          value={voiceName}
          onChange={(e) => {
            const v = e.target.value;
            setVoiceName(v);
            localStorage.setItem(LS_VOICE, v);
            if (playing) {
              stop();
              setTimeout(start, 80);
            }
          }}
          className="rounded border border-[var(--border)] bg-[var(--panel)] px-1 py-0.5 text-xs"
        >
          {voices.length === 0 ? <option>(loading…)</option> : null}
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} · {v.lang}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1 text-[var(--muted)]">
        Speed:
        <input
          type="range"
          min={0.6}
          max={1.8}
          step={0.1}
          value={rate}
          onChange={(e) => {
            const r = Number(e.target.value);
            setRate(r);
            localStorage.setItem(LS_RATE, String(r));
            if (playing) {
              stop();
              setTimeout(start, 80);
            }
          }}
          className="w-20"
        />
        <span className="w-8 tabular-nums">{rate.toFixed(1)}×</span>
      </label>
      <label className="flex items-center gap-1 text-[var(--muted)]">
        <input
          type="checkbox"
          checked={autoPlayPref}
          onChange={(e) => {
            setAutoPlayPref(e.target.checked);
            localStorage.setItem(LS_AUTOPLAY, e.target.checked ? "1" : "0");
          }}
        />
        Auto-play
      </label>
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs">
      <span className="font-semibold text-[var(--muted)]">🔊</span>
      {transport}
      {playing ? (
        <button onClick={stop} className="btn-mini" aria-label="Stop narration">⏹</button>
      ) : null}
      {showAdvanced ? advanced : null}
      {compact ? (
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="ml-auto text-[var(--muted)] hover:text-[var(--text)]"
          aria-label={advancedOpen ? "Hide narration settings" : "Show narration settings"}
          title={advancedOpen ? "Hide settings" : "Voice, speed, auto-play"}
        >
          ⚙
        </button>
      ) : null}
    </div>
  );
}
