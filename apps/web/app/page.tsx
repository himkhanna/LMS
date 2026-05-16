import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-10 py-10">
      <section className="rounded-xl bg-gradient-to-br from-[#0a1e44] to-[#1e63f2] p-10 text-white shadow-sm">
        <div className="max-w-2xl space-y-4">
          <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wide">
            IDC Digital
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Learning that transforms your business.
          </h1>
          <p className="text-white/85">
            An AI-powered learning platform for the enterprise — author, deliver,
            and measure outcomes across every team.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/login"
              className="rounded bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-[var(--panel-2)]"
            >
              Sign in
            </Link>
            <Link
              href="/courses"
              className="rounded border border-white/40 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10"
            >
              Browse courses
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Feature
          title="Author with AI"
          body="Generate full courses, quizzes, and summaries from a single prompt — review and ship in minutes."
        />
        <Feature
          title="Provider-agnostic"
          body="Plug in OpenAI, Azure OpenAI, Anthropic, or your own model. Switch on the fly from Admin."
        />
        <Feature
          title="Enterprise-ready"
          body="Microsoft sign-in, role-based admin, audit logs, and a clean architecture you can extend."
        />
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
      <h3 className="font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
    </div>
  );
}
