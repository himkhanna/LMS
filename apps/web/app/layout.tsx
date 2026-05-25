import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionMenu } from "@/components/SessionMenu";
import { InboxBell } from "@/components/InboxBell";
import { AppNav } from "@/components/AppNav";

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
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <AppNav />
              <InboxBell />
              <SessionMenu />
            </div>
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
