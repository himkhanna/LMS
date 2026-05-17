import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionMenu } from "@/components/SessionMenu";
import { InboxBell } from "@/components/InboxBell";

export const metadata: Metadata = {
  title: "IDC Digital — Learning Platform",
  description: "IDC Digital LMS — Transforming Your Business",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-[var(--border)] bg-[var(--header-bg)] text-[var(--header-text)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="IDC Digital"
                width={120}
                height={40}
                priority
              />
              <span className="hidden text-sm font-medium text-[var(--header-accent)] sm:inline">
                Learning Platform
              </span>
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/my-learning" className="hover:text-[var(--header-accent)]">
                My Learning
              </Link>
              <Link href="/courses" className="hover:text-[var(--header-accent)]">
                Courses
              </Link>
              <Link href="/reports" className="hover:text-[var(--header-accent)]">
                Reports
              </Link>
              <Link href="/admin/users" className="hover:text-[var(--header-accent)]">
                Admin
              </Link>
              <InboxBell />
              <SessionMenu />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-6 text-xs text-[var(--muted)]">
          © {new Date().getFullYear()} IDC Digital · Transforming Your Business
        </footer>
      </body>
    </html>
  );
}
