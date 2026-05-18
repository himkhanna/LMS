"use client";

import { useEffect, useState } from "react";
import { Discussion, type DiscussionPost } from "@/lib/api";
import { getSession, hasRole } from "@/lib/auth";

type Props = {
  courseId: string;
};

export function DiscussionPanel({ courseId }: Props) {
  const [posts, setPosts] = useState<DiscussionPost[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const me = getSession();
  const canPrivileged =
    hasRole("ROLE_ADMIN") || hasRole("ROLE_HR") || hasRole("ROLE_INSTRUCTOR");

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function reload() {
    setErr(null);
    try {
      setPosts(await Discussion.list(courseId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load discussion");
    }
  }

  async function postTopLevel(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      await Discussion.create(courseId, draft.trim());
      setDraft("");
      await reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not post");
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(p: DiscussionPost) {
    try {
      await Discussion.pin(p.id, !p.pinned);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Pin failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this post?")) return;
    await Discussion.delete(id);
    reload();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Discussion</h2>

      <form
        onSubmit={postTopLevel}
        className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Ask a question or start a discussion…"
          className="input w-full"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="btn-primary"
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      {posts === null ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No posts yet. Be the first to ask a question.
        </p>
      ) : (
        <ol className="space-y-3">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              meUserId={me?.userId ?? null}
              canPrivileged={canPrivileged}
              onReply={reload}
              onTogglePin={() => togglePin(p)}
              onDelete={(id) => remove(id)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function PostCard({
  post,
  meUserId,
  canPrivileged,
  onReply,
  onTogglePin,
  onDelete,
}: {
  post: DiscussionPost;
  meUserId: string | null;
  canPrivileged: boolean;
  onReply: () => void;
  onTogglePin: () => void;
  onDelete: (id: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const isAuthor = meUserId !== null && meUserId === post.authorUserId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      await Discussion.reply(post.id, draft.trim());
      setDraft("");
      setReplyOpen(false);
      onReply();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={`rounded-lg border bg-[var(--panel)] p-4 shadow-sm ${
        post.pinned ? "border-[var(--accent)]" : "border-[var(--border)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span className="font-medium text-[var(--text)]">
              {post.authorName ?? post.authorEmail}
            </span>
            <span>·</span>
            <span>{new Date(post.createdAt).toLocaleString()}</span>
            {post.pinned ? <span className="chip chip-info">PINNED</span> : null}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm">{post.body}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          {canPrivileged ? (
            <button onClick={onTogglePin} className="btn-mini" title="Toggle pin">
              {post.pinned ? "Unpin" : "Pin"}
            </button>
          ) : null}
          {isAuthor || canPrivileged ? (
            <button
              onClick={() => onDelete(post.id)}
              className="btn-mini btn-mini-danger"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {post.replies?.length > 0 ? (
        <ol className="mt-3 space-y-2 border-l-2 border-[var(--border)] pl-4">
          {post.replies.map((r) => (
            <li key={r.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                <span className="font-medium text-[var(--text)]">
                  {r.authorName ?? r.authorEmail}
                </span>
                <span>·</span>
                <span>{new Date(r.createdAt).toLocaleString()}</span>
                {(meUserId === r.authorUserId || canPrivileged) ? (
                  <button
                    onClick={() => onDelete(r.id)}
                    className="ml-auto text-[var(--muted)] hover:text-[var(--danger)]"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
              <p className="mt-1 whitespace-pre-wrap">{r.body}</p>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-3">
        {replyOpen ? (
          <form onSubmit={submit} className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Write a reply…"
              className="input w-full text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplyOpen(false);
                  setDraft("");
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !draft.trim()}
                className="btn-primary"
              >
                {busy ? "Posting…" : "Reply"}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setReplyOpen(true)}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Reply
          </button>
        )}
      </div>
    </li>
  );
}
