"use client";

import { useEffect, useState } from "react";
import { Usage, type UsageLog, type Page as ApiPage } from "@/lib/api";

export default function UsagePage() {
  const [page, setPage] = useState<ApiPage<UsageLog> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pageNum, setPageNum] = useState(0);

  useEffect(() => {
    Usage.list(pageNum, 50)
      .then(setPage)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [pageNum]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">AI usage log</h1>
      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}
      {!page ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : page.content.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No usage recorded yet.</p>
      ) : (
        <>
          <div className="table-card overflow-hidden">
            <table className="table-dense">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Model</th>
                  <th>Use case</th>
                  <th>User</th>
                  <th className="text-right">Tokens</th>
                  <th className="text-right">Latency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {page.content.map((u) => (
                  <tr key={u.id}>
                    <td className="whitespace-nowrap text-[var(--muted)]">
                      {new Date(u.createdAt).toLocaleString()}
                    </td>
                    <td>
                      {u.providerType ? (
                        <span className="chip chip-info">{u.providerType}</span>
                      ) : "—"}
                    </td>
                    <td className="font-mono text-xs">{u.model ?? "—"}</td>
                    <td>{u.useCase ?? "—"}</td>
                    <td className="font-mono text-xs text-[var(--muted)]">
                      {u.userId ? u.userId.slice(0, 8) : "—"}
                    </td>
                    <td className="text-right font-mono text-xs">{u.totalTokens ?? "—"}</td>
                    <td className="text-right font-mono text-xs">
                      {u.latencyMs ?? "—"}{u.latencyMs ? "ms" : ""}
                    </td>
                    <td>
                      <span
                        className={"chip " + (u.status === "SUCCESS" ? "chip-success" : "chip-danger")}
                        title={u.errorMessage ?? undefined}
                      >
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
            <button
              onClick={() => setPageNum((n) => Math.max(0, n - 1))}
              disabled={pageNum === 0}
              className="btn-mini"
            >
              Prev
            </button>
            <span>Page {page.number + 1} / {Math.max(page.totalPages, 1)} · {page.totalElements} total</span>
            <button
              onClick={() => setPageNum((n) => n + 1)}
              disabled={pageNum >= page.totalPages - 1}
              className="btn-mini"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
