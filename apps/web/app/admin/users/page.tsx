"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AdminUsers,
  type AuthUser,
  type Page as ApiPage,
  type UserRole,
  type UserStatus,
} from "@/lib/api";
import { getSession } from "@/lib/auth";

const ROLES: UserRole[] = ["USER", "HR", "INSTRUCTOR", "ADMIN"];
const STATUSES: UserStatus[] = ["ACTIVE", "DISABLED"];

export default function AdminUsersPage() {
  const router = useRouter();
  const [data, setData] = useState<ApiPage<AuthUser> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [q, setQ] = useState("");
  const [pageNum, setPageNum] = useState(0);

  async function reload() {
    setErr(null);
    try {
      setData(await AdminUsers.list({
        role: role || undefined,
        status: status || undefined,
        q: q || undefined,
        page: pageNum,
        size: 50,
      }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    if (!getSession()) {
      router.push("/login/admin");
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, role, status]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPageNum(0);
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Link href="/admin/users/new" className="btn-primary">Add user</Link>
      </div>

      <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email or name…"
          className="input min-w-[16rem] flex-1"
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value as UserRole | ""); setPageNum(0); }}
          className="input"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as UserStatus | ""); setPageNum(0); }}
          className="input"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}
      {!data ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : data.content.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No users.</p>
      ) : (
        <>
          <div className="table-card overflow-hidden">
            <table className="table-dense">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Manager</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ width: 1 }}></th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((u) => (
                  <UserRow key={u.id} user={u} onChange={reload} />
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
            <span>Page {data.number + 1} / {Math.max(data.totalPages, 1)} · {data.totalElements} total</span>
            <button
              onClick={() => setPageNum((n) => n + 1)}
              disabled={pageNum >= data.totalPages - 1}
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

function UserRow({ user, onChange }: { user: AuthUser; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  async function changeRole(role: UserRole) {
    setBusy(true);
    try { await AdminUsers.update(user.id, { role }); onChange(); }
    finally { setBusy(false); }
  }
  async function toggleStatus() {
    setBusy(true);
    try {
      await AdminUsers.update(user.id, { status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE" });
      onChange();
    } finally { setBusy(false); }
  }
  async function resetPwd() {
    const pwd = prompt(`New password for ${user.email} (min 8 chars):`);
    if (!pwd || pwd.length < 8) return;
    setBusy(true);
    try { await AdminUsers.resetPassword(user.id, pwd); alert("Password reset."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm(`Delete ${user.email}?`)) return;
    setBusy(true);
    try { await AdminUsers.delete(user.id); onChange(); }
    finally { setBusy(false); }
  }

  async function editOrg(field: "department" | "managerEmail", current: string | null | undefined) {
    const label = field === "department" ? "Department" : "Manager email";
    const next = prompt(`${label} for ${user.email}:`, current ?? "");
    if (next === null) return;
    setBusy(true);
    try {
      await AdminUsers.update(user.id, { [field]: next.trim() || null } as Record<string, string | null>);
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td className="font-medium">{user.email}</td>
      <td className="text-[var(--muted)]">{user.displayName ?? "—"}</td>
      <td className="text-xs">
        <button
          onClick={() => editOrg("department", user.department)}
          className="text-left text-[var(--muted)] hover:text-[var(--text)]"
        >
          {user.department || <span className="italic opacity-60">add…</span>}
        </button>
      </td>
      <td className="text-xs">
        <button
          onClick={() => editOrg("managerEmail", user.managerEmail)}
          className="text-left text-[var(--muted)] hover:text-[var(--text)]"
        >
          {user.managerEmail || <span className="italic opacity-60">add…</span>}
        </button>
      </td>
      <td>
        <select
          value={user.role}
          disabled={busy}
          onChange={(e) => changeRole(e.target.value as UserRole)}
          className="input text-xs"
          style={{ paddingTop: 2, paddingBottom: 2 }}
        >
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </td>
      <td>
        <button
          onClick={toggleStatus}
          disabled={busy}
          className={"chip " + (user.status === "ACTIVE" ? "chip-success" : "chip-muted")}
        >
          {user.status}
        </button>
      </td>
      <td className="whitespace-nowrap text-xs text-[var(--muted)]">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td>
        <div className="flex justify-end gap-1">
          <button onClick={resetPwd} disabled={busy} className="btn-mini">Reset pwd</button>
          <button onClick={remove} disabled={busy} className="btn-mini btn-mini-danger">Delete</button>
        </div>
      </td>
    </tr>
  );
}
