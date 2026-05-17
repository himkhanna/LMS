"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminUsers, type UserRole } from "@/lib/api";

const ROLES: UserRole[] = ["USER", "HR", "INSTRUCTOR", "ADMIN"];

export default function NewAdminUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("ADMIN");
  const [department, setDepartment] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await AdminUsers.create({
        email,
        password,
        displayName,
        role,
        department: department.trim() || undefined,
        managerEmail: managerEmail.trim() || undefined,
      });
      router.push("/admin/users");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Add user</h1>
        <Link href="/admin/users" className="text-sm text-[var(--muted)] hover:underline">
          Cancel
        </Link>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Creates a user with a local password. Use this for administrators and
        any account that should not authenticate via Microsoft.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Temporary password (min 8 chars)</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="block pb-1 text-[var(--muted)]">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
          >
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="block pb-1 text-[var(--muted)]">Department (optional)</span>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="block pb-1 text-[var(--muted)]">Manager email (optional)</span>
            <input
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              placeholder="manager@company.com"
              className="w-full rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy || !email || !password || !displayName}
          className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create user"}
        </button>
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
      </form>
    </div>
  );
}
