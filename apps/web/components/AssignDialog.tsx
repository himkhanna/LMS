"use client";

import { useEffect, useMemo, useState } from "react";
import { Directory, Enrollments, type DirectoryUser } from "@/lib/api";

type Props = {
  courseId: string;
  courseTitle: string;
  open: boolean;
  onClose: () => void;
  onAssigned?: (createdCount: number) => void;
};

export function AssignDialog({ courseId, courseTitle, open, onClose, onAssigned }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Map<string, DirectoryUser>>(new Map());
  const [dueAt, setDueAt] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setPicked(new Map());
    setDueAt("");
    setMandatory(false);
    setErr(null);
    setFeedback(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setSearching(true);
    const timer = setTimeout(() => {
      Directory.search({ q: query, size: 25 })
        .then((page) => {
          if (active) setResults(page.content);
        })
        .catch((e) => {
          if (active) setErr(e instanceof Error ? e.message : "Search failed");
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, open]);

  const pickedList = useMemo(() => Array.from(picked.values()), [picked]);

  function toggle(u: DirectoryUser) {
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id);
      else next.set(u.id, u);
      return next;
    });
  }

  async function submit() {
    if (pickedList.length === 0) return;
    setBusy(true);
    setErr(null);
    setFeedback(null);
    try {
      const res = await Enrollments.assign(courseId, {
        learners: pickedList.map((u) => ({
          userId: u.id,
          email: u.email,
          displayName: u.displayName,
        })),
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        mandatory,
      });
      onAssigned?.(res.created);
      const skippedNote = res.skipped > 0 ? ` · ${res.skipped} already assigned` : "";
      setFeedback(`Assigned ${res.created} learner${res.created === 1 ? "" : "s"}${skippedNote}.`);
      setPicked(new Map());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-[var(--panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Assign learners</h2>
            <p className="text-xs text-[var(--muted)]">
              Course: <span className="font-medium text-[var(--text)]">{courseTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-5 md:grid-cols-2">
          {/* Search column */}
          <div className="flex min-h-0 flex-col gap-2">
            <label className="block text-xs font-medium text-[var(--muted)]">
              Search users by name, email, or department
            </label>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to filter…"
              className="input"
            />
            <div className="flex-1 overflow-y-auto rounded border border-[var(--border)]">
              {searching && results.length === 0 ? (
                <p className="p-3 text-xs text-[var(--muted)]">Searching…</p>
              ) : results.length === 0 ? (
                <p className="p-3 text-xs text-[var(--muted)]">No users found.</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {results.map((u) => {
                    const chosen = picked.has(u.id);
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => toggle(u)}
                          className={`flex w-full items-start justify-between px-3 py-2 text-left hover:bg-[var(--panel-2)] ${chosen ? "bg-[var(--accent-soft)]" : ""}`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="truncate text-sm font-medium">
                              {u.displayName ?? u.email}
                            </div>
                            <div className="truncate text-xs text-[var(--muted)]">
                              {u.email}
                              {u.department ? ` · ${u.department}` : ""}
                            </div>
                          </div>
                          <span
                            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${chosen ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] text-[var(--muted)]"}`}
                          >
                            {chosen ? "✓" : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Selection + options column */}
          <div className="flex min-h-0 flex-col gap-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--muted)]">
                  Selected ({pickedList.length})
                </label>
                {pickedList.length > 0 ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    onClick={() => setPicked(new Map())}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="mt-1 max-h-40 flex-1 overflow-y-auto rounded border border-[var(--border)]">
                {pickedList.length === 0 ? (
                  <p className="p-3 text-xs text-[var(--muted)]">No learners selected.</p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {pickedList.map((u) => (
                      <li
                        key={u.id}
                        className="flex items-center justify-between px-3 py-1.5 text-xs"
                      >
                        <span className="truncate">{u.displayName ?? u.email}</span>
                        <button
                          type="button"
                          onClick={() => toggle(u)}
                          className="ml-2 text-[var(--muted)] hover:text-[var(--danger)]"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-[var(--muted)]">
                Due date (optional)
              </label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="input w-full"
              />
              <label className="flex items-center gap-2 text-sm text-[var(--text)]">
                <input
                  type="checkbox"
                  checked={mandatory}
                  onChange={(e) => setMandatory(e.target.checked)}
                />
                Mandatory training
              </label>
            </div>

            {err ? (
              <p className="rounded bg-orange-50 p-2 text-xs text-[var(--danger)]">{err}</p>
            ) : null}
            {feedback ? (
              <p className="rounded bg-emerald-50 p-2 text-xs text-[var(--success)]">{feedback}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
          <button
            onClick={submit}
            disabled={busy || pickedList.length === 0}
            className="btn-primary"
          >
            {busy
              ? "Assigning…"
              : `Assign ${pickedList.length || ""} learner${pickedList.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
