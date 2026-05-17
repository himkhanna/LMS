"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthConfig, type MicrosoftConfigView } from "@/lib/api";
import { getSession, hasRole } from "@/lib/auth";

export default function AdminAuthPage() {
  const router = useRouter();
  const [cfg, setCfg] = useState<MicrosoftConfigView | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.push("/login");
      return;
    }
    if (!hasRole("ROLE_ADMIN")) {
      router.push("/");
      return;
    }
    AuthConfig.microsoft()
      .then(setCfg)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [router]);

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-semibold">Microsoft Entra ID</h1>
        <p className="text-sm text-[var(--muted)]">
          Live view of the sign-in and role-mapping configuration the
          platform is using.
        </p>
      </div>

      {err ? <p className="text-sm text-[var(--danger)]">{err}</p> : null}

      {!cfg ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              App registration
            </h2>
            <div className="table-card">
              <table className="table-dense">
                <tbody>
                  <Row label="Tenant ID" value={cfg.tenantId ?? "—"} ok={!!cfg.tenantId} />
                  <Row label="Client ID" value={cfg.clientId ?? "—"} ok={!!cfg.clientId} />
                  <Row
                    label="Client secret"
                    value={cfg.clientSecretConfigured ? "Configured" : "Not set"}
                    ok={cfg.clientSecretConfigured}
                  />
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Role mapping
            </h2>
            <div className="table-card">
              <table className="table-dense">
                <tbody>
                  <Row
                    label="Sync roles from Entra on every login"
                    value={cfg.roleSyncEnabled ? "Yes" : "No"}
                    ok={cfg.roleSyncEnabled}
                  />
                  <Row label="App role prefix" value={cfg.appRolePrefix || "(none)"} ok />
                  <Row
                    label="Admin app role"
                    value={`${cfg.appRolePrefix}ADMIN (Entra app role)`}
                    ok
                  />
                  <Row
                    label="HR app role"
                    value={`${cfg.appRolePrefix}HR (Entra app role)`}
                    ok
                  />
                  <Row
                    label="Instructor app role"
                    value={`${cfg.appRolePrefix}INSTRUCTOR (Entra app role)`}
                    ok
                  />
                  <Row
                    label="Admin group GUID"
                    value={cfg.adminGroupConfigured ? "Configured" : "Not set (optional)"}
                    ok={cfg.adminGroupConfigured}
                    optional
                  />
                  <Row
                    label="HR group GUID"
                    value={cfg.hrGroupConfigured ? "Configured" : "Not set (optional)"}
                    ok={cfg.hrGroupConfigured}
                    optional
                  />
                  <Row
                    label="Instructor group GUID"
                    value={cfg.instructorGroupConfigured ? "Configured" : "Not set (optional)"}
                    ok={cfg.instructorGroupConfigured}
                    optional
                  />
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Set-up checklist
            </h2>
            <ol className="space-y-3 text-sm">
              <Step n={1} title="Create an Entra ID app registration">
                In the Microsoft Entra admin centre, create a new app
                registration. Under <b>Authentication</b> add a Single-page
                application platform with redirect URI
                <code className="mx-1 rounded bg-[var(--panel-2)] px-1">{redirectUri()}</code>
                and enable <b>ID token</b> issuance.
              </Step>
              <Step n={2} title="Add a client secret">
                Under <b>Certificates &amp; secrets</b> generate a client
                secret and copy the value into <code>MS_CLIENT_SECRET</code>.
              </Step>
              <Step n={3} title="Add API permissions">
                Microsoft Graph delegated: <code>openid</code>, <code>profile</code>,
                <code>email</code>. For mail send: <code>Mail.Send</code> (Application)
                with admin consent.
              </Step>
              <Step n={4} title="Declare app roles">
                On the app registration → <b>App roles</b>, create three roles
                with these <b>values</b>: <code>{cfg.appRolePrefix}ADMIN</code>,
                <code>{cfg.appRolePrefix}HR</code>,
                <code>{cfg.appRolePrefix}INSTRUCTOR</code>. Allowed member types: Users/Groups.
              </Step>
              <Step n={5} title="Assign users to roles">
                In <b>Enterprise applications → your app → Users and groups</b>,
                assign individual users or security groups to the relevant role.
                Anyone signing in without an assignment becomes a regular USER.
              </Step>
              <Step n={6} title="(Optional) wire group GUIDs">
                If you prefer to drive role from existing security groups,
                set <code>MS_GROUP_ADMIN</code>, <code>MS_GROUP_HR</code>,
                <code>MS_GROUP_INSTRUCTOR</code> to the group object IDs and
                edit the app manifest to include
                <code className="mx-1 rounded bg-[var(--panel-2)] px-1">
                  &quot;groupMembershipClaims&quot;: &quot;SecurityGroup&quot;
                </code>. App roles win over groups when both apply.
              </Step>
            </ol>
          </section>

          <p className="text-xs text-[var(--muted)]">
            See also{" "}
            <Link href="/admin/users" className="underline">
              /admin/users
            </Link>{" "}
            for manual role overrides. When role sync is enabled, the next
            Microsoft sign-in will reset any manual override unless the user
            has no role-relevant claim in their id_token.
          </p>
        </>
      )}
    </div>
  );
}

function redirectUri(): string {
  return typeof window === "undefined"
    ? "http://localhost:3000/auth/callback"
    : `${window.location.origin}/auth/callback`;
}

function Row({
  label,
  value,
  ok,
  optional,
}: {
  label: string;
  value: string;
  ok: boolean;
  optional?: boolean;
}) {
  return (
    <tr>
      <td className="font-medium">{label}</td>
      <td>
        <span
          className={
            "chip " +
            (ok
              ? "chip-success"
              : optional
              ? "chip-muted"
              : "chip-danger")
          }
        >
          {ok ? "✓" : optional ? "—" : "missing"}
        </span>
      </td>
      <td className="text-xs text-[var(--muted)]">{value}</td>
    </tr>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
          {n}
        </span>
        <div>
          <div className="font-medium">{title}</div>
          <p className="mt-1 text-xs text-[var(--muted)]">{children}</p>
        </div>
      </div>
    </li>
  );
}
