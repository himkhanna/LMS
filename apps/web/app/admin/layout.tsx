import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-6">
      <aside className="space-y-1 border-r border-[var(--border)] pr-4 text-sm">
        <div className="pb-2 font-semibold text-[var(--muted)]">Admin</div>
        <Link href="/admin/users" className="block rounded px-2 py-1 hover:bg-[var(--panel)]">
          Users
        </Link>
        <Link href="/admin/providers" className="block rounded px-2 py-1 hover:bg-[var(--panel)]">
          AI providers
        </Link>
        <Link href="/admin/usage" className="block rounded px-2 py-1 hover:bg-[var(--panel)]">
          AI usage log
        </Link>
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <Link href="/courses" className="block rounded px-2 py-1 text-[var(--muted)] hover:bg-[var(--panel)]">
            ← Back to app
          </Link>
        </div>
      </aside>
      <div>{children}</div>
    </div>
  );
}
