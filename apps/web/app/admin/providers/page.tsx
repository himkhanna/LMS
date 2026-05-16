"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Providers, type Provider, type TestProviderResult } from "@/lib/api";
import { getSession } from "@/lib/auth";

export default function ProvidersListPage() {
  const router = useRouter();
  const [items, setItems] = useState<Provider[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, TestProviderResult>>({});

  async function reload() {
    setErr(null);
    try {
      setItems(await Providers.list());
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
  }, [router]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">AI providers</h1>
        <Link href="/admin/providers/new" className="btn-primary">
          Add provider
        </Link>
      </div>
      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}
      {items === null ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No providers yet.</p>
      ) : (
        <div className="table-card overflow-hidden">
          <table className="table-dense">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Model</th>
                <th>API key</th>
                <th>Status</th>
                <th>Priority</th>
                <th style={{ width: 1 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <Row
                  key={p.id}
                  provider={p}
                  test={tests[p.id]}
                  onTest={(r) => setTests((t) => ({ ...t, [p.id]: r }))}
                  onChange={reload}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({
  provider: p,
  test,
  onTest,
  onChange,
}: {
  provider: Provider;
  test?: TestProviderResult;
  onTest: (r: TestProviderResult) => void;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function runTest() {
    setBusy(true);
    try {
      onTest(await Providers.test(p.id));
    } catch (e) {
      onTest({
        ok: false,
        sample: null,
        error: e instanceof Error ? e.message : "Test failed",
        latencyMs: 0,
      });
    } finally {
      setBusy(false);
    }
  }
  async function toggle() {
    setBusy(true);
    try {
      await Providers.update(p.id, { enabled: !p.enabled });
      onChange();
    } finally { setBusy(false); }
  }
  async function makeDefault() {
    setBusy(true);
    try {
      await Providers.update(p.id, { isDefault: true });
      onChange();
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm(`Delete provider "${p.name}"?`)) return;
    setBusy(true);
    try {
      await Providers.delete(p.id);
      onChange();
    } finally { setBusy(false); }
  }

  return (
    <>
      <tr>
        <td>
          <Link href={`/admin/providers/${p.id}`} className="font-medium hover:underline">
            {p.name}
          </Link>
          {p.isDefault ? <span className="chip chip-success ml-2">default</span> : null}
        </td>
        <td><span className="chip chip-info">{p.providerType}</span></td>
        <td className="text-[var(--muted)]">{p.defaultModel ?? "—"}</td>
        <td className="font-mono text-xs text-[var(--muted)]">
          {p.apiKeySet ? p.apiKeyPreview : <span className="chip chip-warn">not set</span>}
        </td>
        <td>
          {p.enabled
            ? <span className="chip chip-success">enabled</span>
            : <span className="chip chip-muted">disabled</span>}
        </td>
        <td className="text-[var(--muted)]">{p.priority}</td>
        <td>
          <div className="flex flex-wrap justify-end gap-1">
            <button onClick={runTest} disabled={busy} className="btn-mini">Test</button>
            <button onClick={toggle} disabled={busy} className="btn-mini">
              {p.enabled ? "Disable" : "Enable"}
            </button>
            {!p.isDefault ? (
              <button onClick={makeDefault} disabled={busy} className="btn-mini">Default</button>
            ) : null}
            <button onClick={remove} disabled={busy} className="btn-mini btn-mini-danger">Delete</button>
          </div>
        </td>
      </tr>
      {test ? (
        <tr>
          <td colSpan={7} className="border-t-0 pt-0">
            <div
              className={
                "rounded border px-3 py-1.5 text-xs " +
                (test.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800")
              }
            >
              {test.ok
                ? `OK · ${test.latencyMs}ms · ${test.sample?.slice(0, 120) ?? ""}`
                : `FAIL · ${test.latencyMs}ms · ${test.error}`}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
