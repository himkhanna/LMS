"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Providers, type Provider } from "@/lib/api";
import { ProviderForm } from "@/components/ProviderForm";

export default function EditProviderPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Providers.get(params.id)
      .then(setProvider)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [params.id]);

  if (err) return <p className="text-sm text-red-400">{err}</p>;
  if (!provider) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit provider</h1>
        <Link href="/admin/providers" className="text-sm text-[var(--muted)] hover:underline">
          Back
        </Link>
      </div>
      <ProviderForm
        initial={provider}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          await Providers.update(params.id, {
            name: input.name,
            apiKey: input.apiKey,
            baseUrl: input.baseUrl,
            defaultModel: input.defaultModel,
            enabled: input.enabled,
            isDefault: input.isDefault,
            priority: input.priority,
            config: input.config,
          });
          router.push("/admin/providers");
        }}
      />
    </div>
  );
}
